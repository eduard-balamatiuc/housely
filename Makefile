.PHONY: dev up down build logs clean import-osm precompute lint test

# Development
dev:
	docker compose up -d postgres redis martin
	@echo "Starting API..."
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
	@echo "Starting Web..."
	cd apps/web && pnpm dev &

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

clean:
	docker compose down -v
	rm -rf apps/web/.next apps/web/node_modules

# Data pipelines
import-osm:
	bash pipelines/osm/import_osm.sh

precompute:
	python pipelines/scoring/precompute_scores.py

# Quality
lint:
	cd apps/api && ruff check .
	cd apps/web && pnpm lint

test:
	cd apps/api && pytest
	cd packages/scoring && pytest

# Database
migrate:
	cd apps/api && alembic upgrade head

migrate-create:
	cd apps/api && alembic revision --autogenerate -m "$(msg)"
