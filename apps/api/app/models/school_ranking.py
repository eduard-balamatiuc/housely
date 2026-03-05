"""SchoolRanking ORM model."""

from sqlalchemy import BigInteger, Column, DateTime, Float, Integer, String, Text, ForeignKey, func

from ..database import Base


class SchoolRanking(Base):
    __tablename__ = "school_rankings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    educat_rank = Column(Integer, nullable=False, unique=True)
    educat_name = Column(Text, nullable=False)
    sector = Column(String)
    amenity_id = Column(BigInteger, ForeignKey("amenities.id"))
    matched_name = Column(Text)
    match_confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
