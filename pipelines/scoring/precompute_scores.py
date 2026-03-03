#!/usr/bin/env python3
"""
H3 Hex Score Precomputation

Computes livability scores for all H3 resolution-9 hexagons covering Chișinău
and stores them in the hex_scores table for instant heatmap rendering.

Usage:
    python precompute_scores.py [--resolution 9] [--batch-size 100]
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import h3
import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import Polygon

# Add scoring package to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "scoring" / "src"))

from scoring import calculate_score, CATEGORIES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Chișinău bounding box (generously covers city + suburbs)
CHISINAU_BBOX = {
    "min_lat": 46.95,
    "max_lat": 47.08,
    "min_lng": 28.75,
    "max_lng": 28.93,
}

# Default DB connection
DB_URL = "postgresql://housely:housely_dev@localhost:5432/housely"


def get_chisinau_hexagons(resolution: int = 9) -> list[str]:
    """Get all H3 hexagons covering the Chișinău bounding box."""
    bbox = CHISINAU_BBOX

    # Create polygon from bounding box
    corners = [
        (bbox["min_lat"], bbox["min_lng"]),
        (bbox["min_lat"], bbox["max_lng"]),
        (bbox["max_lat"], bbox["max_lng"]),
        (bbox["max_lat"], bbox["min_lng"]),
    ]

    hexagons = h3.geo_to_cells(
        h3.LatLngPoly(corners),
        res=resolution,
    )
    return list(hexagons)


def hex_to_polygon_wkt(h3_index: str) -> str:
    """Convert H3 index to WKT polygon."""
    boundary = h3.cell_to_boundary(h3_index)
    # h3 returns (lat, lng) pairs, WKT needs (lng, lat)
    coords = [(lng, lat) for lat, lng in boundary]
    coords.append(coords[0])  # Close the ring
    coord_str = ", ".join(f"{lng} {lat}" for lng, lat in coords)
    return f"SRID=4326;POLYGON(({coord_str}))"


def compute_hex_scores(
    conn,
    hexagons: list[str],
    resolution: int,
    search_radius: float = 1500.0,
    batch_size: int = 100,
):
    """Compute scores for all hexagons and insert into hex_scores table."""
    cursor = conn.cursor()

    # Clear existing scores for this resolution
    cursor.execute("DELETE FROM hex_scores WHERE resolution = %s", (resolution,))
    logger.info(f"Cleared existing scores for resolution {resolution}")

    total = len(hexagons)
    inserted = 0
    start_time = time.time()

    for batch_start in range(0, total, batch_size):
        batch = hexagons[batch_start : batch_start + batch_size]
        rows = []

        for h3_index in batch:
            lat, lng = h3.cell_to_latlng(h3_index)

            # Query amenities near this hex centroid
            cursor.execute(
                """
                SELECT category,
                       ST_Distance(
                           geom::geography,
                           ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                       ) AS distance_m
                FROM amenities
                WHERE ST_DWithin(
                    geom::geography,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                    %s
                )
                ORDER BY category, distance_m
                """,
                (lng, lat, lng, lat, search_radius),
            )

            # Group by category
            amenities_by_category: dict[str, list[float]] = {}
            amenity_counts: dict[str, int] = {}
            for row in cursor.fetchall():
                cat = row[0]
                dist = row[1]
                if cat not in amenities_by_category:
                    amenities_by_category[cat] = []
                    amenity_counts[cat] = 0
                amenities_by_category[cat].append(dist)
                amenity_counts[cat] += 1

            # Calculate score
            score = calculate_score(amenities_by_category, lat, lng)

            # Build category scores dict
            cat_scores = {
                cs.category: cs.score for cs in score.category_scores
            }

            # Build WKT for hex polygon
            polygon_wkt = hex_to_polygon_wkt(h3_index)
            centroid_wkt = f"SRID=4326;POINT({lng} {lat})"

            rows.append((
                h3_index,
                resolution,
                score.overall,
                json.dumps(cat_scores),
                json.dumps(amenity_counts),
                centroid_wkt,
                polygon_wkt,
            ))

        # Batch insert
        if rows:
            execute_values(
                cursor,
                """
                INSERT INTO hex_scores
                    (h3_index, resolution, overall_score, category_scores,
                     amenity_counts, centroid, geom)
                VALUES %s
                ON CONFLICT (h3_index) DO UPDATE SET
                    overall_score = EXCLUDED.overall_score,
                    category_scores = EXCLUDED.category_scores,
                    amenity_counts = EXCLUDED.amenity_counts,
                    computed_at = NOW()
                """,
                rows,
                template=(
                    "(%s, %s, %s, %s::jsonb, %s::jsonb, "
                    "ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))"
                ),
            )
            conn.commit()

        inserted += len(rows)
        elapsed = time.time() - start_time
        rate = inserted / elapsed if elapsed > 0 else 0
        logger.info(
            f"Progress: {inserted}/{total} hexagons "
            f"({100 * inserted / total:.1f}%) "
            f"[{rate:.0f} hex/s]"
        )

    cursor.close()
    logger.info(
        f"Completed: {inserted} hexagons in {time.time() - start_time:.1f}s"
    )


def main():
    parser = argparse.ArgumentParser(description="Precompute H3 hex scores")
    parser.add_argument(
        "--resolution", type=int, default=9, help="H3 resolution (default: 9)"
    )
    parser.add_argument(
        "--batch-size", type=int, default=100, help="Batch size (default: 100)"
    )
    parser.add_argument(
        "--db-url", type=str, default=DB_URL, help="Database URL"
    )
    args = parser.parse_args()

    logger.info(f"H3 Resolution: {args.resolution}")

    # Get hexagons
    hexagons = get_chisinau_hexagons(args.resolution)
    logger.info(f"Found {len(hexagons)} hexagons covering Chișinău")

    # Connect to database
    conn = psycopg2.connect(args.db_url)
    logger.info("Connected to database")

    try:
        compute_hex_scores(
            conn,
            hexagons,
            resolution=args.resolution,
            batch_size=args.batch_size,
        )
    finally:
        conn.close()

    logger.info("Done!")


if __name__ == "__main__":
    main()
