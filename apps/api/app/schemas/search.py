"""Search-related Pydantic schemas."""

from pydantic import BaseModel


class SearchResult(BaseModel):
    display_name: str
    lat: float
    lng: float
    osm_type: str | None = None
    osm_id: int | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
