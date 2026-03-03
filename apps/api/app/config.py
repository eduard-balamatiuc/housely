"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://housely:changeme@localhost:5432/housely"
    database_url_sync: str = "postgresql://housely:changeme@localhost:5432/housely"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # External services
    nominatim_url: str = "http://localhost:8088"
    valhalla_url: str = "http://localhost:8002"

    # Scoring defaults
    search_radius_m: float = 1500.0
    default_h3_resolution: int = 9

    # Cache TTL (seconds)
    score_cache_ttl: int = 3600
    geocode_cache_ttl: int = 86400

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
