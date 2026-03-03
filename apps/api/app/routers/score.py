"""Score API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas.score import (
    CategoryScoreResponse,
    CompareRequest,
    CompareResponse,
    ScoreRequest,
    ScoreResponse,
)
from ..services.geocoder import geocode
from ..services.scoring_service import compute_score

router = APIRouter(prefix="/api/v1", tags=["scoring"])


@router.get("/score", response_model=ScoreResponse)
async def get_score(
    lat: float = Query(ge=46.9, le=47.1),
    lng: float = Query(ge=28.7, le=29.0),
    preset: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get livability score for coordinates."""
    score = await compute_score(db, lat, lng, preset=preset)
    return ScoreResponse(
        overall=score.overall,
        grade=score.grade,
        lat=score.lat,
        lng=score.lng,
        category_scores=[
            CategoryScoreResponse(
                category=cs.category,
                score=cs.score,
                amenity_count=cs.amenity_count,
                nearest_distance=cs.nearest_distance,
                weight=cs.weight,
            )
            for cs in score.category_scores
        ],
    )


@router.get("/score/address", response_model=ScoreResponse)
async def get_score_by_address(
    q: str = Query(min_length=3),
    preset: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Geocode an address and return its livability score."""
    results = await geocode(q)
    if not results:
        raise HTTPException(status_code=404, detail="Address not found")

    location = results[0]
    score = await compute_score(
        db, location["lat"], location["lng"], preset=preset
    )
    return ScoreResponse(
        overall=score.overall,
        grade=score.grade,
        lat=score.lat,
        lng=score.lng,
        category_scores=[
            CategoryScoreResponse(
                category=cs.category,
                score=cs.score,
                amenity_count=cs.amenity_count,
                nearest_distance=cs.nearest_distance,
                weight=cs.weight,
            )
            for cs in score.category_scores
        ],
    )


@router.post("/compare", response_model=CompareResponse)
async def compare_locations(
    request: CompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """Compare livability scores for multiple locations."""
    scores = []
    for loc in request.locations:
        score = await compute_score(
            db, loc.lat, loc.lng, preset=loc.preset, custom_weights=loc.custom_weights
        )
        scores.append(ScoreResponse(
            overall=score.overall,
            grade=score.grade,
            lat=score.lat,
            lng=score.lng,
            category_scores=[
                CategoryScoreResponse(
                    category=cs.category,
                    score=cs.score,
                    amenity_count=cs.amenity_count,
                    nearest_distance=cs.nearest_distance,
                    weight=cs.weight,
                )
                for cs in score.category_scores
            ],
        ))
    return CompareResponse(scores=scores)
