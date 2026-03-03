"""Search/geocoding API endpoints."""

from fastapi import APIRouter, Query

from ..schemas.search import SearchResponse, SearchResult
from ..services.geocoder import geocode

router = APIRouter(prefix="/api/v1", tags=["search"])


@router.get("/search", response_model=SearchResponse)
async def search_address(
    q: str = Query(min_length=2, description="Address search query"),
):
    """Address autocomplete using Nominatim."""
    results = await geocode(q)
    return SearchResponse(
        results=[
            SearchResult(
                display_name=r["display_name"],
                lat=r["lat"],
                lng=r["lng"],
                osm_type=r.get("osm_type"),
                osm_id=r.get("osm_id"),
            )
            for r in results
        ]
    )
