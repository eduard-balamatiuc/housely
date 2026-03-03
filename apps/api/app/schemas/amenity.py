"""Amenity-related Pydantic schemas."""

from pydantic import BaseModel


class AmenityResponse(BaseModel):
    id: int
    osm_id: int | None = None
    name: str | None = None
    category: str
    subcategory: str | None = None
    lat: float
    lng: float
    distance: float | None = None  # distance from query point, if applicable

    model_config = {"from_attributes": True}


class AmenityListResponse(BaseModel):
    amenities: list[AmenityResponse]
    total: int
    bbox: list[float] | None = None
