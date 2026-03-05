from scoring.decay import distance_decay


def test_within_min_distance():
    assert distance_decay(0) == 1.0
    assert distance_decay(200) == 1.0
    assert distance_decay(400) == 1.0


def test_beyond_max_distance():
    assert distance_decay(1500) == 0.0
    assert distance_decay(2000) == 0.0
    assert distance_decay(10000) == 0.0


def test_decay_midpoint():
    mid = distance_decay(950)  # Midpoint of 400-1500 range
    assert 0.0 < mid < 1.0
    assert mid == 0.25  # (1 - 0.5)^2 = 0.25


def test_monotonically_decreasing():
    distances = [400, 600, 800, 1000, 1200, 1400, 1500]
    scores = [distance_decay(d) for d in distances]
    for i in range(len(scores) - 1):
        assert scores[i] >= scores[i + 1]


def test_custom_max_distance():
    # With max_distance=3000, 1500m should still yield a positive score
    assert distance_decay(1500, max_distance=3000.0) > 0.0
    assert distance_decay(2000, max_distance=3000.0) > 0.0
    assert distance_decay(3000, max_distance=3000.0) == 0.0
    assert distance_decay(3500, max_distance=3000.0) == 0.0


def test_custom_max_distance_full_score_unchanged():
    # Within MIN_DISTANCE still gets full score regardless of max_distance
    assert distance_decay(200, max_distance=3000.0) == 1.0
    assert distance_decay(400, max_distance=3000.0) == 1.0
