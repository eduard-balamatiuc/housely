"""Housely API -- FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import amenities, heatmap, schools, score, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from .services.scoring_service import _redis
    if _redis:
        await _redis.close()


app = FastAPI(
    title="Housely API",
    description="Location intelligence API for apartment buying in Chisinau",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(score.router)
app.include_router(amenities.router)
app.include_router(heatmap.router)
app.include_router(search.router)
app.include_router(schools.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "housely-api"}
