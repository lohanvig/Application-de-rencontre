"""
Tests unitaires — Fonctions pures (sans base de données)
calculate_age() et haversine() de interaction_service.py
"""

import pytest
from datetime import date

from app.service.interaction_service import calculate_age, haversine


# ─────────────────────────────────────────────
# calculate_age
# ─────────────────────────────────────────────

class TestCalculateAge:

    def test_age_normal(self):
        today = date.today()
        dob = date(today.year - 25, today.month, today.day)
        assert calculate_age(dob.isoformat()) == 25

    def test_anniversaire_aujourd_hui(self):
        today = date.today()
        dob = date(today.year - 30, today.month, today.day)
        assert calculate_age(dob.isoformat()) == 30

    def test_anniversaire_demain(self):
        today = date.today()
        # Né demain il y a 20 ans → n'a pas encore eu son anniversaire cette année
        import datetime
        demain = today + datetime.timedelta(days=1)
        dob = date(today.year - 20, demain.month, demain.day)
        assert calculate_age(dob.isoformat()) == 19

    def test_majeur_exactement_18_ans(self):
        today = date.today()
        dob = date(today.year - 18, today.month, today.day)
        assert calculate_age(dob.isoformat()) == 18

    def test_input_none_retourne_none(self):
        assert calculate_age(None) is None

    def test_chaine_vide_retourne_none(self):
        assert calculate_age("") is None

    def test_format_invalide_retourne_none(self):
        assert calculate_age("32/13/2000") is None

    def test_format_texte_retourne_none(self):
        assert calculate_age("pas-une-date") is None

    def test_age_tres_eleve(self):
        assert calculate_age("1920-06-15") is not None
        assert calculate_age("1920-06-15") > 100


# ─────────────────────────────────────────────
# haversine
# ─────────────────────────────────────────────

class TestHaversine:

    def test_meme_point_distance_zero(self):
        assert haversine(48.8566, 2.3522, 48.8566, 2.3522) == 0

    def test_paris_lyon(self):
        # Paris → Lyon ≈ 392 km
        dist = haversine(48.8566, 2.3522, 45.7640, 4.8357)
        assert 380 <= dist <= 405

    def test_paris_marseille(self):
        # Paris → Marseille ≈ 661 km
        dist = haversine(48.8566, 2.3522, 43.2965, 5.3698)
        assert 650 <= dist <= 675

    def test_paris_new_york(self):
        # Paris → New York ≈ 5 837 km
        dist = haversine(48.8566, 2.3522, 40.7128, -74.0060)
        assert 5800 <= dist <= 5900

    def test_distance_symetrique(self):
        # distance(A, B) == distance(B, A)
        d1 = haversine(48.8566, 2.3522, 45.7640, 4.8357)
        d2 = haversine(45.7640, 4.8357, 48.8566, 2.3522)
        assert d1 == d2

    def test_retourne_entier(self):
        result = haversine(48.8566, 2.3522, 45.7640, 4.8357)
        assert isinstance(result, int)
