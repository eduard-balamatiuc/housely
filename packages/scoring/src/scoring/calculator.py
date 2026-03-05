"""
Core livability score calculator.

Given a point and nearby amenities, computes:
- Per-category scores (0-100)
- Overall weighted score (0-100)
- Score grade (A+ to F)
"""

from dataclasses import dataclass

from .decay import MAX_DISTANCE, distance_decay
from .weights import CATEGORIES, CATEGORY_MAX_DISTANCE, CATEGORY_TOP_N, get_weights


@dataclass
class CategoryScore:
    category: str
    score: float  # 0-100
    amenity_count: int
    nearest_distance: float | None  # meters, None if no amenities
    weight: float


@dataclass
class LivabilityScore:
    overall: float  # 0-100
    grade: str  # A+, A, B+, B, C+, C, D, F
    category_scores: list[CategoryScore]
    lat: float
    lng: float


def score_to_grade(score: float) -> str:
    """Convert a 0-100 score to a letter grade."""
    if score >= 90:
        return "A+"
    if score >= 80:
        return "A"
    if score >= 70:
        return "B+"
    if score >= 60:
        return "B"
    if score >= 50:
        return "C+"
    if score >= 40:
        return "C"
    if score >= 25:
        return "D"
    return "F"


def calculate_category_score(
    distances: list[float],
    category: str,
    quality_multipliers: list[float] | None = None,
) -> float:
    """
    Calculate score for a single category given distances to amenities.

    Takes the N nearest amenities (N from CATEGORY_TOP_N),
    applies distance decay to each, optionally multiplies by quality,
    averages the values, and scales to 0-100.

    Args:
        distances: Sorted list of distances (meters) to amenities in this category.
        category: Category name (for looking up top_n).
        quality_multipliers: Optional list of quality multipliers aligned with distances.
            When provided, each decayed value is multiplied by the corresponding multiplier.

    Returns:
        Category score from 0 to 100.
    """
    if not distances:
        return 0.0

    top_n = CATEGORY_TOP_N.get(category, 3)
    max_dist = CATEGORY_MAX_DISTANCE.get(category, MAX_DISTANCE)
    nearest = distances[:top_n]

    # Apply decay to each amenity distance (category-specific max distance)
    decayed = [distance_decay(d, max_distance=max_dist) for d in nearest]

    # Apply quality multipliers if provided
    if quality_multipliers:
        nearest_multipliers = quality_multipliers[:top_n]
        decayed = [
            d * m for d, m in zip(decayed, nearest_multipliers)
        ]

    # Average decayed values
    avg_decay = sum(decayed) / top_n  # Divide by top_n, not len(nearest)
    # This penalizes categories with fewer amenities than expected

    return round(min(avg_decay * 100, 100.0), 1)


def calculate_score(
    amenities_by_category: dict[str, list[float]],
    lat: float,
    lng: float,
    preset: str | None = None,
    custom_weights: dict[str, float] | None = None,
    quality_data: dict[str, list[float]] | None = None,
) -> LivabilityScore:
    """
    Calculate overall livability score for a location.

    Args:
        amenities_by_category: Dict mapping category name to sorted list
            of distances (meters) to amenities in that category.
        lat: Latitude of the scored point.
        lng: Longitude of the scored point.
        preset: Optional preset slug for weight selection.
        custom_weights: Optional custom weight overrides.
        quality_data: Optional dict mapping category to list of quality multipliers
            aligned with the distance lists. Used for school ranking boosts.

    Returns:
        LivabilityScore with overall score, grade, and per-category breakdown.
    """
    weights = get_weights(preset=preset, custom_weights=custom_weights)

    category_scores: list[CategoryScore] = []
    weighted_sum = 0.0
    total_weight = 0.0

    for category in CATEGORIES:
        distances = amenities_by_category.get(category, [])
        multipliers = quality_data.get(category) if quality_data else None
        cat_score = calculate_category_score(distances, category, quality_multipliers=multipliers)
        weight = weights.get(category, 1.0)

        category_scores.append(CategoryScore(
            category=category,
            score=cat_score,
            amenity_count=len(distances),
            nearest_distance=distances[0] if distances else None,
            weight=weight,
        ))

        if weight > 0:
            weighted_sum += cat_score * weight
            total_weight += weight

    overall = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0.0

    return LivabilityScore(
        overall=overall,
        grade=score_to_grade(overall),
        category_scores=category_scores,
        lat=lat,
        lng=lng,
    )
