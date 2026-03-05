"""Score-related Pydantic schemas."""

from pydantic import BaseModel, Field


class CategoryScoreResponse(BaseModel):
    category: str
    score: float = Field(ge=0, le=100)
    amenity_count: int
    nearest_distance: float | None = None
    weight: float = 1.0


class ScoreResponse(BaseModel):
    overall: float = Field(ge=0, le=100)
    grade: str
    lat: float
    lng: float
    category_scores: list[CategoryScoreResponse]


class ScoreRequest(BaseModel):
    lat: float = Field(ge=46.9, le=47.1, description="Latitude (Chisinau bounds)")
    lng: float = Field(ge=28.7, le=29.0, description="Longitude (Chisinau bounds)")
    preset: str | None = None
    custom_weights: dict[str, float] | None = None


class PersonalizedScoreRequest(BaseModel):
    lat: float = Field(ge=46.9, le=47.1)
    lng: float = Field(ge=28.7, le=29.0)
    preset: str | None = None
    custom_weights: dict[str, float] | None = None
    school_ranks: dict[int, int] | None = None  # {amenity_id: user_rank}


class CompareRequest(BaseModel):
    locations: list[ScoreRequest] = Field(min_length=2, max_length=4)


class CompareResponse(BaseModel):
    scores: list[ScoreResponse]


class HexScoreResponse(BaseModel):
    h3_index: str
    overall_score: float
    category_scores: dict[str, float]
    lat: float
    lng: float
