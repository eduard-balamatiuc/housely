"""Amenity API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas.amenity import AmenityListResponse, AmenityResponse

router = APIRouter(prefix="/api/v1", tags=["amenities"])


@router.get("/amenities", response_model=AmenityListResponse)
async def get_amenities(
    min_lat: float = Query(alias="bbox_south"),
    min_lng: float = Query(alias="bbox_west"),
    max_lat: float = Query(alias="bbox_north"),
    max_lng: float = Query(alias="bbox_east"),
    category: str | None = None,
    limit: int = Query(default=500, le=2000),
    db: AsyncSession = Depends(get_db),
):
    """Get amenities within a bounding box, optionally filtered by category."""
    sql = """
        SELECT id, osm_id, name, category, subcategory,
               ST_Y(geom) as lat, ST_X(geom) as lng
        FROM amenities
        WHERE geom && ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
    """
    params: dict = {
        "min_lat": min_lat,
        "min_lng": min_lng,
        "max_lat": max_lat,
        "max_lng": max_lng,
        "limit": limit,
    }
    if category is not None:
        sql += " AND category = :category"
        params["category"] = category
    sql += " LIMIT :limit"

    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    amenities = [
        AmenityResponse(
            id=row.id,
            osm_id=row.osm_id,
            name=row.name,
            category=row.category,
            subcategory=row.subcategory,
            lat=row.lat,
            lng=row.lng,
        )
        for row in rows
    ]

    return AmenityListResponse(
        amenities=amenities,
        total=len(amenities),
        bbox=[min_lng, min_lat, max_lng, max_lat],
    )
