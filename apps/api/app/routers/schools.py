"""School ranking API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas.school import (
    NearbySchoolResponse,
    NearbySchoolsResponse,
    SchoolRankingResponse,
    SchoolRankingsListResponse,
)
from ..services.school_service import get_nearby_schools, get_all_rankings

router = APIRouter(prefix="/api/v1/schools", tags=["schools"])


@router.get("/nearby", response_model=NearbySchoolsResponse)
async def nearby_schools(
    lat: float = Query(ge=46.9, le=47.1),
    lng: float = Query(ge=28.7, le=29.0),
    radius: float = Query(default=1500, ge=100, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Get nearby schools with educat.md rankings."""
    schools = await get_nearby_schools(db, lat, lng, radius=radius)
    return NearbySchoolsResponse(
        schools=[NearbySchoolResponse(**s) for s in schools],
        total=len(schools),
    )


@router.get("/rankings", response_model=SchoolRankingsListResponse)
async def list_rankings(db: AsyncSession = Depends(get_db)):
    """Get all 26 educat.md school rankings with match status."""
    rankings = await get_all_rankings(db)
    return SchoolRankingsListResponse(
        rankings=[SchoolRankingResponse(**r) for r in rankings],
        total=len(rankings),
    )
