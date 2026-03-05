"""
Category weights and scoring presets.

Default: all categories weighted equally (1.0).
Presets adjust weights for different buyer personas.
"""

from dataclasses import dataclass


# All supported amenity categories
CATEGORIES = [
    "schools",
    "kindergartens",
    "pharmacies",
    "gyms",
    "supermarkets",
    "public_transport",
    "parks",
    "medical",
    "restaurants_cafes",
    "banks_atms",
    "parking",
    "cultural",
]

# Per-category search radius / max decay distance (meters).
# Categories not listed use the global default (1500m).
CATEGORY_MAX_DISTANCE: dict[str, float] = {
    "schools": 3000.0,
}

# How many nearest amenities to consider per category
CATEGORY_TOP_N = {
    "schools": 3,
    "kindergartens": 3,
    "pharmacies": 3,
    "gyms": 2,
    "supermarkets": 5,
    "public_transport": 5,
    "parks": 3,
    "medical": 3,
    "restaurants_cafes": 5,
    "banks_atms": 3,
    "parking": 3,
    "cultural": 2,
}

# Default weights (all equal)
CATEGORY_WEIGHTS: dict[str, float] = {cat: 1.0 for cat in CATEGORIES}


@dataclass(frozen=True)
class ScoringPreset:
    name: str
    slug: str
    description: str
    weights: dict[str, float]


PRESETS: dict[str, ScoringPreset] = {
    "default": ScoringPreset(
        name="Balanced",
        slug="default",
        description="All categories weighted equally",
        weights={cat: 1.0 for cat in CATEGORIES},
    ),
    "family": ScoringPreset(
        name="Family with Kids",
        slug="family",
        description="Prioritizes kindergartens, schools, parks, and medical facilities",
        weights={
            "schools": 3.0,
            "kindergartens": 3.0,
            "pharmacies": 1.5,
            "gyms": 0.5,
            "supermarkets": 1.5,
            "public_transport": 1.0,
            "parks": 2.5,
            "medical": 2.0,
            "restaurants_cafes": 0.5,
            "banks_atms": 1.0,
            "parking": 1.5,
            "cultural": 1.0,
        },
    ),
    "young_professional": ScoringPreset(
        name="Young Professional",
        slug="young_professional",
        description="Prioritizes transport, gyms, restaurants, and nightlife",
        weights={
            "schools": 0.0,
            "kindergartens": 0.0,
            "pharmacies": 0.5,
            "gyms": 2.0,
            "supermarkets": 1.5,
            "public_transport": 2.5,
            "parks": 1.0,
            "medical": 0.5,
            "restaurants_cafes": 2.5,
            "banks_atms": 1.0,
            "parking": 1.0,
            "cultural": 2.0,
        },
    ),
    "retiree": ScoringPreset(
        name="Retiree",
        slug="retiree",
        description="Prioritizes pharmacies, medical, parks, and quiet neighborhoods",
        weights={
            "schools": 0.0,
            "kindergartens": 0.0,
            "pharmacies": 3.0,
            "gyms": 0.5,
            "supermarkets": 2.0,
            "public_transport": 1.5,
            "parks": 2.5,
            "medical": 3.0,
            "restaurants_cafes": 1.0,
            "banks_atms": 1.5,
            "parking": 0.5,
            "cultural": 1.5,
        },
    ),
}


def get_weights(
    preset: str | None = None,
    custom_weights: dict[str, float] | None = None,
) -> dict[str, float]:
    """
    Get category weights -- from preset, custom overrides, or default.

    Args:
        preset: Preset slug (e.g. "family", "young_professional").
        custom_weights: Dict of category -> weight overrides.

    Returns:
        Complete dict of category weights.
    """
    if custom_weights:
        # Start from default, apply overrides
        weights = CATEGORY_WEIGHTS.copy()
        for cat, w in custom_weights.items():
            if cat in weights:
                weights[cat] = max(0.0, w)
        return weights

    if preset and preset in PRESETS:
        return PRESETS[preset].weights.copy()

    return CATEGORY_WEIGHTS.copy()
