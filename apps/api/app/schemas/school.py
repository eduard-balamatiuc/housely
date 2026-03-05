"""School-related Pydantic schemas."""

from pydantic import BaseModel


class NearbySchoolResponse(BaseModel):
    amenity_id: int
    name: str | None = None
    distance_m: float
    educat_rank: int | None = None
    sector: str | None = None
    lat: float
    lng: float


class NearbySchoolsResponse(BaseModel):
    schools: list[NearbySchoolResponse]
    total: int


class SchoolRankingResponse(BaseModel):
    educat_rank: int
    educat_name: str
    sector: str | None = None
    amenity_id: int | None = None
    matched_name: str | None = None
    match_confidence: float | None = None


class SchoolRankingsListResponse(BaseModel):
    rankings: list[SchoolRankingResponse]
    total: int
