#!/usr/bin/env bash
set -euo pipefail

# OSM Import Script for Housely
# Downloads Moldova PBF and imports into PostGIS using osm2pgsql with Flex output

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
PBF_URL="https://download.geofabrik.de/europe/moldova-latest.osm.pbf"
PBF_FILE="${DATA_DIR}/moldova-latest.osm.pbf"
LUA_STYLE="${SCRIPT_DIR}/osm_style.lua"

# Database connection (use env vars or defaults)
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-housely}"
DB_USER="${PGUSER:-housely}"
export PGPASSWORD="${PGPASSWORD:?Set PGPASSWORD environment variable}"

echo "=== Housely OSM Import ==="
echo "Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Create data directory
mkdir -p "${DATA_DIR}"

# Download PBF if not present or older than 7 days
if [ ! -f "${PBF_FILE}" ] || [ "$(find "${PBF_FILE}" -mtime +7 2>/dev/null)" ]; then
    echo "Downloading Moldova PBF..."
    wget -N -P "${DATA_DIR}" "${PBF_URL}"
else
    echo "Using cached PBF (less than 7 days old)"
fi

# Check osm2pgsql is installed
if ! command -v osm2pgsql &> /dev/null; then
    echo "ERROR: osm2pgsql not found. Install it:"
    echo "  macOS: brew install osm2pgsql"
    echo "  Ubuntu: apt install osm2pgsql"
    exit 1
fi

echo "osm2pgsql version: $(osm2pgsql --version 2>&1 | head -1)"

# Run osm2pgsql with Flex output
echo "Importing OSM data..."
osm2pgsql \
    --create \
    --output=flex \
    --style="${LUA_STYLE}" \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --database="${DB_NAME}" \
    --user="${DB_USER}" \
    --slim \
    --drop \
    --number-processes=4 \
    "${PBF_FILE}"

# Post-import: create spatial indexes if not exists
echo "Creating indexes..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" <<SQL
-- Ensure spatial indexes exist
CREATE INDEX IF NOT EXISTS idx_amenities_geom ON amenities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_amenities_category ON amenities (category);

-- Vacuum analyze for query planner
VACUUM ANALYZE amenities;

-- Report counts
SELECT category, COUNT(*) as count
FROM amenities
GROUP BY category
ORDER BY count DESC;
SQL

echo ""
echo "=== Import complete ==="
echo "Total amenities: $(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM amenities;")"
