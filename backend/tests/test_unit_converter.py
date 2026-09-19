"""Unit conversion tests (PRD 30-32, 68)."""

import pytest

from app.services import unit_converter as uc


def test_weight_conversions():
    assert uc.convert_to_base(5, "kg", "kg") == 5
    assert uc.convert_to_base(500, "gram", "kg") == 0.5
    assert uc.convert_to_base(1, "quintal", "kg") == 100


def test_volume_conversions():
    assert uc.convert_to_base(2, "litre", "litre") == 2
    assert uc.convert_to_base(500, "ml", "litre") == 0.5


def test_count_conversions():
    assert uc.convert_to_base(1, "dozen", "piece") == 12


def test_product_specific_unit_wins():
    # 1 bag = 50 kg for this product
    assert uc.convert_to_base(2, "bag", "kg", {"bag": 50.0}) == 100


def test_spoken_aliases_normalize():
    assert uc.convert_to_base(3, "kilos", "kg") == 3
    assert uc.convert_to_base(3, "Kilo", "kg") == 3


def test_incompatible_units_raise():
    with pytest.raises(uc.UnitError):
        uc.convert_to_base(1, "litre", "kg")


def test_missing_unit_assumed_base():
    assert uc.convert_to_base(7, None, "kg") == 7
