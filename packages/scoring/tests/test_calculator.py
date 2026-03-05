from scoring.calculator import calculate_score, calculate_category_score, score_to_grade


def test_empty_category():
    assert calculate_category_score([], "supermarkets") == 0.0


def test_close_amenities_high_score():
    distances = [100, 200, 300, 350, 400]
    score = calculate_category_score(distances, "supermarkets")
    assert score == 100.0  # All within 400m


def test_far_amenities_low_score():
    distances = [1400, 1450, 1490]
    score = calculate_category_score(distances, "pharmacies")
    assert score < 10.0


def test_overall_score():
    amenities = {
        "supermarkets": [100, 200, 300, 400, 500],
        "public_transport": [50, 150, 250, 350, 450],
        "parks": [200, 400, 600],
        "pharmacies": [300, 500, 800],
    }
    result = calculate_score(amenities, lat=47.02, lng=28.83)
    assert 0 <= result.overall <= 100
    assert result.grade in ("A+", "A", "B+", "B", "C+", "C", "D", "F")
    assert len(result.category_scores) == 12  # All categories


def test_preset_changes_score():
    amenities = {
        "schools": [100, 200, 300],
        "kindergartens": [150, 250, 350],
        "restaurants_cafes": [1200, 1300, 1400, 1450, 1500],
        "gyms": [1300, 1400],
    }
    default_result = calculate_score(amenities, lat=47.02, lng=28.83)
    family_result = calculate_score(amenities, lat=47.02, lng=28.83, preset="family")

    # Family preset should score higher (schools/kindergartens weighted more, restaurants less)
    assert family_result.overall > default_result.overall


def test_grade_boundaries():
    assert score_to_grade(95) == "A+"
    assert score_to_grade(85) == "A"
    assert score_to_grade(75) == "B+"
    assert score_to_grade(65) == "B"
    assert score_to_grade(55) == "C+"
    assert score_to_grade(45) == "C"
    assert score_to_grade(30) == "D"
    assert score_to_grade(10) == "F"


def test_schools_counted_within_3km():
    """Schools at 2km should contribute a positive score (3km max range)."""
    amenities = {"schools": [2000, 2200, 2500]}
    result = calculate_score(amenities, lat=47.02, lng=28.83)
    school_score = next(
        cs for cs in result.category_scores if cs.category == "schools"
    )
    assert school_score.score > 0.0


def test_schools_beyond_3km_zero():
    """Schools beyond 3km should score zero."""
    amenities = {"schools": [3100, 4000, 5000]}
    result = calculate_score(amenities, lat=47.02, lng=28.83)
    school_score = next(
        cs for cs in result.category_scores if cs.category == "schools"
    )
    assert school_score.score == 0.0


def test_other_categories_unchanged():
    """Non-school categories still use the default 1500m cutoff."""
    amenities = {"supermarkets": [2000, 2200, 2500]}
    result = calculate_score(amenities, lat=47.02, lng=28.83)
    supermarket_score = next(
        cs for cs in result.category_scores if cs.category == "supermarkets"
    )
    assert supermarket_score.score == 0.0
