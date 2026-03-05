"""School quality multipliers based on educat.md rankings."""

QUALITY_MAX = 1.5  # rank 1 boost
QUALITY_MIN = 0.7  # rank 26 (lowest ranked)
QUALITY_UNRANKED = 0.8  # unranked schools


def get_quality_multiplier(rank: int | None, total_ranked: int = 26) -> float:
    """
    Linear interpolation from QUALITY_MAX (rank 1) to QUALITY_MIN (rank N).

    Args:
        rank: 1-based rank from educat.md, or None for unranked schools.
        total_ranked: Total number of ranked schools.

    Returns:
        Multiplier to apply to distance-decayed school score.
    """
    if rank is None:
        return QUALITY_UNRANKED
    return QUALITY_MAX - (rank - 1) * (QUALITY_MAX - QUALITY_MIN) / max(total_ranked - 1, 1)
