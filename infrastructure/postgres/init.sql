-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- H3 extension (install manually if not available in image)
-- CREATE EXTENSION IF NOT EXISTS h3;

-- Amenities table
CREATE TABLE IF NOT EXISTS amenities (
    id BIGSERIAL PRIMARY KEY,
    osm_id BIGINT,
    name TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    tags JSONB DEFAULT '{}',
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amenities_geom ON amenities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_amenities_category ON amenities (category);
CREATE INDEX IF NOT EXISTS idx_amenities_geom_category ON amenities USING GIST (geom) WHERE category IS NOT NULL;

-- H3 hex scores table
CREATE TABLE IF NOT EXISTS hex_scores (
    h3_index TEXT PRIMARY KEY,
    resolution INTEGER NOT NULL DEFAULT 9,
    overall_score FLOAT NOT NULL,
    category_scores JSONB NOT NULL DEFAULT '{}',
    amenity_counts JSONB DEFAULT '{}',
    centroid GEOMETRY(Point, 4326) NOT NULL,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hex_scores_geom ON hex_scores USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hex_scores_resolution ON hex_scores (resolution);
CREATE INDEX IF NOT EXISTS idx_hex_scores_overall ON hex_scores (overall_score);

-- Search cache table
CREATE TABLE IF NOT EXISTS geocode_cache (
    query TEXT PRIMARY KEY,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    display_name TEXT,
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- School rankings table (educat.md 2025 BAC results)
CREATE TABLE IF NOT EXISTS school_rankings (
    id SERIAL PRIMARY KEY,
    educat_rank INTEGER NOT NULL UNIQUE,
    educat_name TEXT NOT NULL,
    sector TEXT,
    amenity_id BIGINT REFERENCES amenities(id),
    matched_name TEXT,
    match_confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_rankings_amenity ON school_rankings (amenity_id);

-- Martin function for hex tiles
CREATE OR REPLACE FUNCTION hex_tiles(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
    result bytea;
BEGIN
    WITH bounds AS (
        SELECT ST_TileEnvelope(z, x, y) AS geom
    ),
    mvt AS (
        SELECT ST_AsMVTGeom(
            ST_Transform(h.geom, 3857),
            bounds.geom,
            4096, 64, true
        ) AS geom,
        h.h3_index,
        h.overall_score,
        h.category_scores::text as category_scores
        FROM hex_scores h, bounds
        WHERE ST_Intersects(
            ST_Transform(h.geom, 3857),
            bounds.geom
        )
    )
    SELECT ST_AsMVT(mvt, 'hex_scores', 4096, 'geom')
    INTO result
    FROM mvt;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- Martin function for amenity tiles
CREATE OR REPLACE FUNCTION amenity_tiles(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
    result bytea;
    cat text;
BEGIN
    cat := query_params->>'category';

    WITH bounds AS (
        SELECT ST_TileEnvelope(z, x, y) AS geom
    ),
    mvt AS (
        SELECT ST_AsMVTGeom(
            ST_Transform(a.geom, 3857),
            bounds.geom,
            4096, 64, true
        ) AS geom,
        a.id,
        a.name,
        a.category,
        a.subcategory
        FROM amenities a, bounds
        WHERE ST_Intersects(
            ST_Transform(a.geom, 3857),
            bounds.geom
        )
        AND (cat IS NULL OR a.category = cat)
    )
    SELECT ST_AsMVT(mvt, 'amenities', 4096, 'geom')
    INTO result
    FROM mvt;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;
