"""
Polynomial distance decay for livability scoring.

Full score at <=400m, zero at >=max_distance (default 1500m).
Uses a polynomial curve (not linear) so nearby amenities
matter much more than distant ones.
"""

# Distance thresholds in meters
MIN_DISTANCE = 400.0   # Full score within this radius
MAX_DISTANCE = 1500.0  # Zero score beyond this radius (default)
DECAY_POWER = 2.0      # Polynomial exponent (2 = quadratic decay)


def distance_decay(
    distance_m: float,
    max_distance: float = MAX_DISTANCE,
) -> float:
    """
    Compute a decay factor [0.0, 1.0] based on distance.

    - distance <= 400m          -> 1.0 (full score)
    - distance >= max_distance  -> 0.0 (zero score)
    - Between: polynomial decay (quadratic by default)

    Args:
        distance_m: Distance in meters.
        max_distance: Distance at which score drops to zero.

    Returns:
        Decay factor between 0.0 and 1.0.
    """
    if distance_m <= MIN_DISTANCE:
        return 1.0
    if distance_m >= max_distance:
        return 0.0

    # Normalize distance to [0, 1] range within the decay window
    normalized = (distance_m - MIN_DISTANCE) / (max_distance - MIN_DISTANCE)

    # Apply polynomial decay: (1 - normalized)^power
    return (1.0 - normalized) ** DECAY_POWER
