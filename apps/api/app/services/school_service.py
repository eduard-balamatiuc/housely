"""School ranking service — queries nearby schools with educat.md rankings."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from scoring import get_quality_multiplier

from ..config import settings


async def get_nearby_schools(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius: float | None = None,
) -> list[dict]:
    """
    Query schools within radius, LEFT JOIN school_rankings.
    Returns ranked schools first (by rank), then unranked (by distance).
    """
    search_radius = radius or settings.search_radius_m

    query = text("""
        SELECT
            a.id AS amenity_id,
            a.name,
            ST_Distance(
                a.geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            ) AS distance_m,
            sr.educat_rank,
            sr.sector,
            ST_Y(a.geom) AS lat,
            ST_X(a.geom) AS lng
        FROM amenities a
        LEFT JOIN school_rankings sr ON sr.amenity_id = a.id
        WHERE a.category = 'schools'
          AND ST_DWithin(
              a.geom::geography,
              ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
              :radius
          )
        ORDER BY
            CASE WHEN sr.educat_rank IS NOT NULL THEN 0 ELSE 1 END,
            sr.educat_rank NULLS LAST,
            distance_m
    """)

    result = await db.execute(query, {"lat": lat, "lng": lng, "radius": search_radius})
    rows = result.fetchall()

    return [
        {
            "amenity_id": row.amenity_id,
            "name": row.name,
            "distance_m": round(row.distance_m, 1),
            "educat_rank": row.educat_rank,
            "sector": row.sector,
            "lat": row.lat,
            "lng": row.lng,
        }
        for row in rows
    ]


async def get_all_rankings(db: AsyncSession) -> list[dict]:
    """Return all 26 educat.md school rankings with match status."""
    query = text("""
        SELECT
            sr.educat_rank,
            sr.educat_name,
            sr.sector,
            sr.amenity_id,
            sr.matched_name,
            sr.match_confidence
        FROM school_rankings sr
        ORDER BY sr.educat_rank
    """)

    result = await db.execute(query)
    rows = result.fetchall()

    return [
        {
            "educat_rank": row.educat_rank,
            "educat_name": row.educat_name,
            "sector": row.sector,
            "amenity_id": row.amenity_id,
            "matched_name": row.matched_name,
            "match_confidence": row.match_confidence,
        }
        for row in rows
    ]


def build_quality_multipliers(
    amenity_ids: list[int],
    rank_lookup: dict[int, int],
    user_ranks: dict[int, int] | None = None,
) -> list[float]:
    """
    Build quality multipliers aligned with the amenity_ids list.

    Args:
        amenity_ids: Ordered list of school amenity IDs (by distance).
        rank_lookup: Dict mapping amenity_id -> educat_rank from DB.
        user_ranks: Optional dict mapping amenity_id -> user's custom rank.

    Returns:
        List of quality multipliers aligned with amenity_ids.
    """
    multipliers = []
    for aid in amenity_ids:
        if user_ranks and aid in user_ranks:
            rank = user_ranks[aid]
        else:
            rank = rank_lookup.get(aid)
        multipliers.append(get_quality_multiplier(rank))
    return multipliers
