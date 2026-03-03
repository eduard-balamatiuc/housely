# Housely

Location intelligence platform for apartment buying in Chișinău. Search any address and instantly see a 0–100 livability score with category breakdown, city-wide heatmap, and side-by-side comparison.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ & pnpm
- Python 3.12+

### Development

```bash
# Start infrastructure
docker compose up -d

# Import OSM data
make import-osm

# Precompute H3 hex scores
make precompute

# Start API (in apps/api/)
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload

# Start frontend (in apps/web/)
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000

## Architecture

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, MapLibre GL JS, deck.gl
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, PostGIS
- **Database:** PostgreSQL 16 + PostGIS 3.4 + h3-pg
- **Tile Server:** Martin (Rust)
- **Geocoding:** Nominatim (self-hosted, Moldova)
- **Routing:** Valhalla (isochrones)
- **Cache:** Redis

## Project Structure

```
housely/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend
├── packages/
│   └── scoring/      # Core scoring algorithm
├── pipelines/
│   ├── osm/          # OSM data import
│   └── scoring/      # H3 precomputation
├── infrastructure/   # Docker, nginx, configs
└── docs/
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/score?lat=&lng=` | Livability score for coordinates |
| `GET /api/v1/score/address?q=` | Geocode + score |
| `GET /api/v1/amenities?bbox=&category=` | Amenities in bounding box |
| `POST /api/v1/compare` | Compare two locations |
| `GET /api/v1/heatmap/{resolution}` | H3 hex scores for heatmap |
| `GET /api/v1/search?q=` | Address autocomplete |

## License

MIT
