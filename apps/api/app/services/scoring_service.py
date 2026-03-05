"""Scoring service — bridges the scoring package with the database."""

import json

import redis.asyncio as redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from scoring import calculate_score, CATEGORY_MAX_DISTANCE, LivabilityScore

from ..config import settings
from .school_service import build_quality_multipliers


_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def compute_score(
    db: AsyncSession,
    lat: float,
    lng: float,
    preset: str | None = None,
    custom_weights: dict[str, float] | None = None,
    school_ranks: dict[int, int] | None = None,
) -> LivabilityScore:
    """
    Compute livability score for a point.

    1. Check Redis cache (only for default weights, no custom school ranks)
    2. Query PostGIS for nearby amenities by category
    3. Build quality multipliers for schools
    4. Run scoring algorithm
    5. Cache result
    """
    # Build cache key (only cache default/preset scores, not custom)
    cache_key = None
    if not custom_weights and not school_ranks:
        cache_key = f"score:{lat:.5f}:{lng:.5f}:{preset or 'default'}"
        r = await get_redis()
        cached = await r.get(cache_key)
        if cached:
            data = json.loads(cached)
            return LivabilityScore(**data)

    # Use the largest category radius so we capture e.g. schools within 3km
    search_radius = max(
        settings.search_radius_m,
        *(CATEGORY_MAX_DISTANCE.values()),
    )

    # Query amenities by category within radius (include id for school ranking lookup)
    query = text("""
        SELECT
            id,
            category,
            ST_Distance(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            ) AS distance_m
        FROM amenities
        WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radius
        )
        ORDER BY category, distance_m
    """)

    result = await db.execute(
        query, {"lat": lat, "lng": lng, "radius": search_radius}
    )
    rows = result.fetchall()

    # Group distances and IDs by category
    amenities_by_category: dict[str, list[float]] = {}
    school_amenity_ids: list[int] = []
    for row in rows:
        cat = row.category
        if cat not in amenities_by_category:
            amenities_by_category[cat] = []
        amenities_by_category[cat].append(row.distance_m)
        if cat == "schools":
            school_amenity_ids.append(row.id)

    # Build quality multipliers for schools
    quality_data: dict[str, list[float]] | None = None
    if school_amenity_ids:
        # Look up educat.md ranks for nearby school amenities
        rank_query = text("""
            SELECT amenity_id, educat_rank
            FROM school_rankings
            WHERE amenity_id = ANY(:ids)
        """)
        rank_result = await db.execute(rank_query, {"ids": school_amenity_ids})
        rank_rows = rank_result.fetchall()
        rank_lookup = {row.amenity_id: row.educat_rank for row in rank_rows}

        multipliers = build_quality_multipliers(school_amenity_ids, rank_lookup, school_ranks)
        quality_data = {"schools": multipliers}

    # Calculate score
    score = calculate_score(
        amenities_by_category=amenities_by_category,
        lat=lat,
        lng=lng,
        preset=preset,
        custom_weights=custom_weights,
        quality_data=quality_data,
    )

    # Cache result (skip when user-specific school ranks provided)
    if cache_key:
        r = await get_redis()
        cache_data = json.dumps({
            "overall": score.overall,
            "grade": score.grade,
            "category_scores": [
                {
                    "category": cs.category,
                    "score": cs.score,
                    "amenity_count": cs.amenity_count,
                    "nearest_distance": cs.nearest_distance,
                    "weight": cs.weight,
                }
                for cs in score.category_scores
            ],
            "lat": score.lat,
            "lng": score.lng,
        })
        await r.setex(cache_key, settings.score_cache_ttl, cache_data)

    return score
