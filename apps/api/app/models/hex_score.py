"""H3 hex score ORM model."""

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB

from ..database import Base


class HexScore(Base):
    __tablename__ = "hex_scores"

    h3_index = Column(String, primary_key=True)
    resolution = Column(Integer, nullable=False, default=9)
    overall_score = Column(Float, nullable=False)
    category_scores = Column(JSONB, nullable=False, default={})
    amenity_counts = Column(JSONB, default={})
    centroid = Column(Geometry("POINT", srid=4326), nullable=False)
    geom = Column(Geometry("POLYGON", srid=4326), nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
