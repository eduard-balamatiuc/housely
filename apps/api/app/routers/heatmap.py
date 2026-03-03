"""Heatmap API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas.score import HexScoreResponse

router = APIRouter(prefix="/api/v1", tags=["heatmap"])


@router.get("/heatmap/{resolution}", response_model=list[HexScoreResponse])
async def get_heatmap(
    resolution: int = 9,
    min_lat: float = Query(default=46.95, alias="bbox_south"),
    min_lng: float = Query(default=28.75, alias="bbox_west"),
    max_lat: float = Query(default=47.08, alias="bbox_north"),
    max_lng: float = Query(default=28.95, alias="bbox_east"),
    db: AsyncSession = Depends(get_db),
):
    """Get H3 hex scores for heatmap rendering."""
    query = text("""
        SELECT h3_index, overall_score, category_scores,
               ST_Y(centroid) as lat, ST_X(centroid) as lng
        FROM hex_scores
        WHERE resolution = :resolution
        AND centroid && ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
    """)

    result = await db.execute(
        query,
        {
            "resolution": resolution,
            "min_lat": min_lat,
            "min_lng": min_lng,
            "max_lat": max_lat,
            "max_lng": max_lng,
        },
    )
    rows = result.fetchall()

    return [
        HexScoreResponse(
            h3_index=row.h3_index,
            overall_score=row.overall_score,
            category_scores=row.category_scores,
            lat=row.lat,
            lng=row.lng,
        )
        for row in rows
    ]
