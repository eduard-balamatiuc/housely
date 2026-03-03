-- Housely OSM Flex Output Style
-- Maps OSM tags to amenity categories for livability scoring

-- Define the amenities table
local amenities = osm2pgsql.define_table({
    name = 'amenities',
    ids = { type = 'any', id_column = 'osm_id' },
    columns = {
        { column = 'name', type = 'text' },
        { column = 'category', type = 'text', not_null = true },
        { column = 'subcategory', type = 'text' },
        { column = 'tags', type = 'jsonb' },
        { column = 'geom', type = 'point', projection = 4326, not_null = true },
    },
})

-- Category mapping: OSM tag key/value → (category, subcategory)
local tag_mapping = {
    -- Schools
    { key = 'amenity', value = 'school', category = 'schools', subcategory = 'school' },

    -- Kindergartens
    { key = 'amenity', value = 'kindergarten', category = 'kindergartens', subcategory = 'kindergarten' },

    -- Pharmacies
    { key = 'amenity', value = 'pharmacy', category = 'pharmacies', subcategory = 'pharmacy' },

    -- Gyms & Sports
    { key = 'leisure', value = 'fitness_centre', category = 'gyms', subcategory = 'fitness_centre' },
    { key = 'leisure', value = 'sports_centre', category = 'gyms', subcategory = 'sports_centre' },

    -- Supermarkets & Shopping
    { key = 'shop', value = 'supermarket', category = 'supermarkets', subcategory = 'supermarket' },
    { key = 'shop', value = 'convenience', category = 'supermarkets', subcategory = 'convenience' },
    { key = 'amenity', value = 'marketplace', category = 'supermarkets', subcategory = 'marketplace' },

    -- Public Transport
    { key = 'highway', value = 'bus_stop', category = 'public_transport', subcategory = 'bus_stop' },
    { key = 'public_transport', value = 'platform', category = 'public_transport', subcategory = 'platform' },
    { key = 'railway', value = 'tram_stop', category = 'public_transport', subcategory = 'tram_stop' },
    { key = 'public_transport', value = 'station', category = 'public_transport', subcategory = 'station' },

    -- Parks
    { key = 'leisure', value = 'park', category = 'parks', subcategory = 'park' },
    { key = 'leisure', value = 'garden', category = 'parks', subcategory = 'garden' },

    -- Medical
    { key = 'amenity', value = 'clinic', category = 'medical', subcategory = 'clinic' },
    { key = 'amenity', value = 'hospital', category = 'medical', subcategory = 'hospital' },
    { key = 'amenity', value = 'doctors', category = 'medical', subcategory = 'doctors' },
    { key = 'amenity', value = 'dentist', category = 'medical', subcategory = 'dentist' },

    -- Restaurants & Cafes
    { key = 'amenity', value = 'restaurant', category = 'restaurants_cafes', subcategory = 'restaurant' },
    { key = 'amenity', value = 'cafe', category = 'restaurants_cafes', subcategory = 'cafe' },
    { key = 'amenity', value = 'fast_food', category = 'restaurants_cafes', subcategory = 'fast_food' },
    { key = 'amenity', value = 'bar', category = 'restaurants_cafes', subcategory = 'bar' },

    -- Banks & ATMs
    { key = 'amenity', value = 'bank', category = 'banks_atms', subcategory = 'bank' },
    { key = 'amenity', value = 'atm', category = 'banks_atms', subcategory = 'atm' },

    -- Parking
    { key = 'amenity', value = 'parking', category = 'parking', subcategory = 'parking' },

    -- Cultural
    { key = 'amenity', value = 'theatre', category = 'cultural', subcategory = 'theatre' },
    { key = 'amenity', value = 'cinema', category = 'cultural', subcategory = 'cinema' },
    { key = 'amenity', value = 'library', category = 'cultural', subcategory = 'library' },
    { key = 'amenity', value = 'arts_centre', category = 'cultural', subcategory = 'arts_centre' },
    { key = 'tourism', value = 'museum', category = 'cultural', subcategory = 'museum' },
}

-- Helper: extract relevant tags as JSON-friendly table
local function extract_tags(object)
    local result = {}
    local dominated_tags = {
        'amenity', 'shop', 'leisure', 'highway', 'public_transport',
        'railway', 'tourism', 'name', 'name:ro', 'name:ru', 'name:en',
        'opening_hours', 'phone', 'website', 'addr:street', 'addr:housenumber',
        'addr:city', 'operator', 'brand', 'wheelchair', 'internet_access',
    }
    for _, tag in ipairs(dominated_tags) do
        local val = object.tags[tag]
        if val then
            result[tag] = val
        end
    end
    return result
end

-- Process nodes
function osm2pgsql.process_node(object)
    for _, mapping in ipairs(tag_mapping) do
        if object.tags[mapping.key] == mapping.value then
            amenities:insert({
                name = object.tags.name or object.tags['name:ro'] or object.tags['name:ru'],
                category = mapping.category,
                subcategory = mapping.subcategory,
                tags = extract_tags(object),
                geom = object:as_point(),
            })
            return  -- Only insert once per node (first match wins)
        end
    end
end

-- Process ways (for area-based amenities like parks, parking lots)
function osm2pgsql.process_way(object)
    if not object.is_closed then
        return
    end

    for _, mapping in ipairs(tag_mapping) do
        if object.tags[mapping.key] == mapping.value then
            -- Use centroid for area features
            amenities:insert({
                name = object.tags.name or object.tags['name:ro'] or object.tags['name:ru'],
                category = mapping.category,
                subcategory = mapping.subcategory,
                tags = extract_tags(object),
                geom = object:as_polygon():centroid(),
            })
            return
        end
    end
end

-- Process relations (for multipolygon parks, etc.)
function osm2pgsql.process_relation(object)
    if object.tags.type ~= 'multipolygon' then
        return
    end

    for _, mapping in ipairs(tag_mapping) do
        if object.tags[mapping.key] == mapping.value then
            local geom = object:as_multipolygon()
            if geom then
                amenities:insert({
                    name = object.tags.name or object.tags['name:ro'] or object.tags['name:ru'],
                    category = mapping.category,
                    subcategory = mapping.subcategory,
                    tags = extract_tags(object),
                    geom = geom:centroid(),
                })
            end
            return
        end
    end
end
