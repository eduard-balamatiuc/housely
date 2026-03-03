"""Geocoding service using self-hosted Nominatim."""

import httpx

from ..config import settings


async def geocode(query: str) -> list[dict]:
    """
    Geocode an address query using Nominatim.
    Returns list of {display_name, lat, lng, osm_type, osm_id}.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.nominatim_url}/search",
            params={
                "q": query,
                "format": "jsonv2",
                "limit": 5,
                "countrycodes": "md",
                "addressdetails": 1,
            },
        )
        resp.raise_for_status()
        results = resp.json()

    return [
        {
            "display_name": r.get("display_name", ""),
            "lat": float(r["lat"]),
            "lng": float(r["lon"]),
            "osm_type": r.get("osm_type"),
            "osm_id": int(r["osm_id"]) if r.get("osm_id") else None,
        }
        for r in results
    ]


async def reverse_geocode(lat: float, lng: float) -> dict | None:
    """Reverse geocode coordinates to an address."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.nominatim_url}/reverse",
            params={
                "lat": lat,
                "lon": lng,
                "format": "jsonv2",
            },
        )
        resp.raise_for_status()
        result = resp.json()

    if "error" in result:
        return None

    return {
        "display_name": result.get("display_name", ""),
        "lat": float(result["lat"]),
        "lng": float(result["lon"]),
    }
