"""Scoring service — bridges the scoring package with the database."""

import json

import redis.asyncio as redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from scoring import calculate_score, LivabilityScore

from ..config import settings


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
) -> LivabilityScore:
    """
    Compute livability score for a point.

    1. Check Redis cache (only for default weights)
    2. Query PostGIS for nearby amenities by category
    3. Run scoring algorithm
    4. Cache result
    """
    # Build cache key (only cache default/preset scores, not custom)
    cache_key = None
    if not custom_weights:
        cache_key = f"score:{lat:.5f}:{lng:.5f}:{preset or 'default'}"
        r = await get_redis()
        cached = await r.get(cache_key)
        if cached:
            data = json.loads(cached)
            return LivabilityScore(**data)

    # Query amenities by category within radius
    query = text("""
        SELECT
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
        query, {"lat": lat, "lng": lng, "radius": settings.search_radius_m}
    )
    rows = result.fetchall()

    # Group distances by category
    amenities_by_category: dict[str, list[float]] = {}
    for row in rows:
        cat = row.category
        if cat not in amenities_by_category:
            amenities_by_category[cat] = []
        amenities_by_category[cat].append(row.distance_m)

    # Calculate score
    score = calculate_score(
        amenities_by_category=amenities_by_category,
        lat=lat,
        lng=lng,
        preset=preset,
        custom_weights=custom_weights,
    )

    # Cache result
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
