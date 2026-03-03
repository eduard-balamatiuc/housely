"""Amenity ORM model."""

from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Column, DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from ..database import Base


class Amenity(Base):
    __tablename__ = "amenities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    osm_id = Column(BigInteger, index=True)
    name = Column(Text)
    category = Column(String, nullable=False, index=True)
    subcategory = Column(String)
    tags = Column(JSONB, default={})
    geom = Column(Geometry("POINT", srid=4326), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_amenities_geom", geom, postgresql_using="gist"),
        Index("idx_amenities_geom_category", geom, postgresql_using="gist"),
    )
