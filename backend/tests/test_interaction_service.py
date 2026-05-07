"""
Tests unitaires — interaction_service.py
Swipe, like, dislike, cooldown et filtrage de profils.
"""

import pytest
from unittest.mock import MagicMock, patch, call
from datetime import date


def _mock_execute(data):
    m = MagicMock()
    m.data = data
    return m


# ─────────────────────────────────────────────
# add_dislike
# ─────────────────────────────────────────────

class TestAddDislike:

    @patch("app.service.interaction_service.supabase")
    def test_insert_appele_avec_bons_ids(self, mock_sb):
        insert_data = {}

        def fake_insert(data):
            insert_data.update(data)
            chain = MagicMock()
            chain.execute.return_value = _mock_execute([{"id": "dislike-1"}])
            return chain

        mock_sb.table.return_value.insert.side_effect = fake_insert

        from app.service.interaction_service import add_dislike
        add_dislike("user-A", "user-B")

        assert insert_data["user_id"] == "user-A"
        assert insert_data["disliked_user_id"] == "user-B"

    @patch("app.service.interaction_service.supabase")
    def test_table_dislikes_utilisee(self, mock_sb):
        mock_sb.table.return_value.insert.return_value.execute.return_value = \
            _mock_execute([{"id": "d1"}])

        from app.service.interaction_service import add_dislike
        add_dislike("user-A", "user-B")

        mock_sb.table.assert_called_with("dislikes")


# ─────────────────────────────────────────────
# add_like
# ─────────────────────────────────────────────

class TestAddLike:

    @patch("app.service.interaction_service.check_and_create_match")
    @patch("app.service.interaction_service.supabase")
    def test_like_sans_match(self, mock_sb, mock_match):
        mock_sb.table.return_value.insert.return_value.execute.return_value = \
            _mock_execute([{"id": "like-1"}])
        mock_match.return_value = (False, None)

        from app.service.interaction_service import add_like
        data, is_match, match_id = add_like("user-A", "user-B")

        assert is_match is False
        assert match_id is None

    @patch("app.service.interaction_service.check_and_create_match")
    @patch("app.service.interaction_service.supabase")
    def test_like_avec_match(self, mock_sb, mock_match):
        mock_sb.table.return_value.insert.return_value.execute.return_value = \
            _mock_execute([{"id": "like-1"}])
        mock_match.return_value = (True, "match-uuid-99")

        from app.service.interaction_service import add_like
        data, is_match, match_id = add_like("user-A", "user-B")

        assert is_match is True
        assert match_id == "match-uuid-99"

    @patch("app.service.interaction_service.check_and_create_match")
    @patch("app.service.interaction_service.supabase")
    def test_check_match_appele_avec_bons_ids(self, mock_sb, mock_match):
        mock_sb.table.return_value.insert.return_value.execute.return_value = \
            _mock_execute([{"id": "like-1"}])
        mock_match.return_value = (False, None)

        from app.service.interaction_service import add_like
        add_like("user-X", "user-Y")

        mock_match.assert_called_once_with("user-X", "user-Y")


# ─────────────────────────────────────────────
# get_profiles_to_swipe — filtres âge et distance
# ─────────────────────────────────────────────

class TestGetProfilesToSwipe:

    def _user(self, uid, dob, lat=None, lon=None):
        return {
            "id": uid,
            "username": f"user_{uid}",
            "date_of_birth": dob,
            "bio": "",
            "gender": None,
            "height": None,
            "smoking": None,
            "alcohol": None,
            "sport": None,
            "relationship_type": None,
            "latitude": lat,
            "longitude": lon,
        }

    @patch("app.service.interaction_service.supabase")
    def test_filtre_age_minimum(self, mock_sb):
        today = date.today()
        user_17_dob = date(today.year - 17, today.month, today.day).isoformat()
        user_20_dob = date(today.year - 20, today.month, today.day).isoformat()

        users = [
            self._user("uid-17", user_17_dob),
            self._user("uid-20", user_20_dob),
        ]

        def table_side(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.neq.return_value = chain
            chain.not_ = chain
            chain.in_.return_value = chain
            chain.gte.return_value = chain
            chain.execute.return_value = _mock_execute(
                [] if name in ("likes", "dislikes", "blocks", "photos") else users
            )
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.interaction_service import get_profiles_to_swipe
        profiles = get_profiles_to_swipe("me", min_age=18, max_age=99)

        ids = [p["id"] for p in profiles]
        assert "uid-20" in ids
        assert "uid-17" not in ids

    @patch("app.service.interaction_service.supabase")
    def test_filtre_distance(self, mock_sb):
        # Paris (48.8566, 2.3522) → Lyon ~392km, Bordeaux ~500km
        users = [
            self._user("lyon", date(2000, 1, 1).isoformat(), lat=45.7640, lon=4.8357),
            self._user("bordeaux", date(2000, 1, 1).isoformat(), lat=44.8378, lon=-0.5792),
        ]

        def table_side(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.neq.return_value = chain
            chain.not_ = chain
            chain.in_.return_value = chain
            chain.gte.return_value = chain
            chain.execute.return_value = _mock_execute(
                [] if name in ("likes", "dislikes", "blocks", "photos") else users
            )
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.interaction_service import get_profiles_to_swipe
        # Zone de 450 km autour de Paris → Lyon oui, Bordeaux non
        profiles = get_profiles_to_swipe(
            "me", max_distance=450,
            lat=48.8566, lon=2.3522
        )
        ids = [p["id"] for p in profiles]
        assert "lyon" in ids
        assert "bordeaux" not in ids

    @patch("app.service.interaction_service.supabase")
    def test_profil_contient_champs_attendus(self, mock_sb):
        users = [
            self._user("uid-1", date(2000, 1, 1).isoformat())
        ]

        def table_side(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.neq.return_value = chain
            chain.not_ = chain
            chain.in_.return_value = chain
            chain.gte.return_value = chain
            chain.execute.return_value = _mock_execute(
                [] if name in ("likes", "dislikes", "blocks", "photos") else users
            )
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.interaction_service import get_profiles_to_swipe
        profiles = get_profiles_to_swipe("me")

        assert len(profiles) == 1
        p = profiles[0]
        for key in ("id", "username", "age", "bio", "gender", "photos", "distance"):
            assert key in p, f"Champ manquant : {key}"
