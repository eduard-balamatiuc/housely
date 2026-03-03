# Housely — Claude Code Guidelines

## Project Overview

Location intelligence platform for apartment buying in Chișinău, Moldova. Users search an address or click the map to see a 0–100 livability score with category breakdown, city-wide heatmap, and side-by-side comparison.

## Repository

- **GitHub:** git@github.com:eduard-balamatiuc/housely.git
- **Branch:** main
- **Conventional commits required** — enforced by husky + commitlint
  - Format: `type(scope): message` (e.g. `feat(api): add caching`)
  - Scopes: `api`, `web`, `scoring`, `pipeline`, `infra`, `ci`, `deps`
  - Types: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`, `perf`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 3 |
| Map | MapLibre GL JS, react-map-gl, deck.gl 9 |
| Charts | Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Pydantic v2 |
| Scoring | Custom package at `packages/scoring/` (src layout) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Tile Server | Martin (reads from PostGIS) |
| Geocoding | Nominatim (self-hosted, Moldova) |
| Routing | Valhalla (isochrones) |
| Cache | Redis 7 |
| Package mgr | pnpm (frontend), pip (backend) |

## Monorepo Structure

```
housely/
├── apps/
│   ├── web/                    # Next.js frontend (port 3000)
│   │   └── src/
│   │       ├── app/            # Pages (App Router)
│   │       ├── components/     # map/, scoring/, search/, filters/, compare/, ui/
│   │       ├── hooks/
│   │       ├── lib/api.ts      # API client
│   │       └── types/index.ts  # All TypeScript types + constants
│   └── api/                    # FastAPI backend (port 8000)
│       ├── app/
│       │   ├── main.py         # App entrypoint
│       │   ├── config.py       # Pydantic Settings
│       │   ├── database.py     # Async SQLAlchemy engine
│       │   ├── routers/        # score, amenities, heatmap, search
│       │   ├── services/       # scoring_service, geocoder
│       │   ├── models/         # Amenity, HexScore (SQLAlchemy)
│       │   └── schemas/        # Pydantic request/response models
│       ├── alembic/            # DB migrations
│       └── tests/
├── packages/
│   └── scoring/                # Core scoring algorithm (src layout)
│       ├── src/scoring/
│       │   ├── decay.py        # Polynomial distance decay
│       │   ├── weights.py      # Categories, presets, weights
│       │   └── calculator.py   # Score computation
│       └── tests/
├── pipelines/
│   ├── osm/                    # import_osm.sh + osm_style.lua
│   └── scoring/                # precompute_scores.py (H3 batch)
├── infrastructure/
│   ├── docker-compose.yml      # Dev stack
│   ├── docker-compose.prod.yml # Prod stack (nginx + SSL)
│   ├── postgres/init.sql       # DB schema + Martin tile functions
│   ├── martin/config.yaml
│   └── nginx/
└── .github/workflows/ci.yml
```

## Key Architecture Decisions

- **Scoring algorithm**: Walk Score-style with polynomial decay. Full score ≤400m, zero ≥1500m. 12 amenity categories, weighted average.
- **H3 hexagons**: Resolution 9 (~174m edge), precomputed for instant heatmap. Batch job in `pipelines/scoring/precompute_scores.py`.
- **Martin tile server**: Serves vector tiles directly from PostGIS tables (amenities, hex_scores) + custom SQL functions.
- **Credentials**: All passwords via env vars. `.env` is gitignored. `.env.example` has placeholders.
- **Docker Compose dev**: postgres on port 5433 (to avoid conflicts), redis on 6379.

## Development Commands

```bash
# Start infrastructure
cd infrastructure && docker compose --env-file ../.env up -d postgres redis

# Start API
cd apps/api && DATABASE_URL="postgresql+asyncpg://housely:housely_dev@localhost:5433/housely" \
  REDIS_URL="redis://localhost:6379/0" uvicorn app.main:app --reload --port 8000

# Start frontend
cd apps/web && pnpm dev

# Import OSM data (requires osm2pgsql)
PGPASSWORD=housely_dev PGHOST=localhost PGPORT=5433 PGUSER=housely PGDATABASE=housely \
  bash pipelines/osm/import_osm.sh

# Precompute H3 hex scores
python pipelines/scoring/precompute_scores.py \
  --db-url "postgresql://housely:housely_dev@localhost:5433/housely"

# Run tests
cd packages/scoring && pytest tests/ -v
cd apps/api && pytest tests/ -v

# Lint
cd apps/api && ruff check .
cd apps/web && pnpm lint
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/score?lat=&lng=` | Livability score by coordinates |
| GET | `/api/v1/score/address?q=` | Geocode + score |
| POST | `/api/v1/compare` | Compare 2-4 locations |
| GET | `/api/v1/amenities?bbox_south=&bbox_west=&bbox_north=&bbox_east=` | Amenities in bbox |
| GET | `/api/v1/heatmap/{resolution}` | H3 hex scores |
| GET | `/api/v1/search?q=` | Address autocomplete |

## Database Tables

- `amenities` — POIs with PostGIS point geometry, category, subcategory, JSONB tags
- `hex_scores` — precomputed H3 hex scores with polygon geometry, category breakdown
- `geocode_cache` — cached geocoding results

## Scoring Categories (12)

schools, kindergartens, pharmacies, gyms, supermarkets, public_transport, parks, medical, restaurants_cafes, banks_atms, parking, cultural

## Scoring Presets

- `default` — all equal (1.0)
- `family` — schools/kindergartens/parks weighted 2.5-3x
- `young_professional` — transport/restaurants/gyms weighted 2-2.5x
- `retiree` — pharmacies/medical/parks weighted 2.5-3x

## Current Status (Phase 1 MVP)

**Completed:**
- Full monorepo structure
- Docker Compose (dev + prod)
- Scoring engine with tests
- OSM data pipeline (import_osm.sh + Lua style)
- H3 precomputation pipeline
- FastAPI backend with all endpoints
- Next.js frontend with all components
- CI/CD (GitHub Actions)
- Husky + commitlint hooks
- Security fix (no hardcoded credentials)

**Not yet done (next steps):**
- Import actual OSM data (run `import_osm.sh` — needs `osm2pgsql`)
- Run H3 precomputation
- Start Nominatim container (for geocoding/search to work)
- Write API integration tests
- Add error boundaries and loading states to frontend
- Mobile responsive polish
- Phase 2: Transit (Roataway GTFS), school ratings, air quality, isochrones
- Phase 3: 999.md scraper, listing map layer, user accounts

## User Preferences

- Git user: `eduard-balamatiuc <balamatiuc2@gmail.com>`
- Conventional commits enforced
- Commits as the GitHub user (not Claude)
- Always push after committing when asked
