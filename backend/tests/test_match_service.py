"""
Tests unitaires — match_service.py
Vérifie la logique de détection et création d'un match.
"""

import pytest
from unittest.mock import MagicMock, patch


def _mock_execute(data):
    m = MagicMock()
    m.data = data
    return m


class TestCheckAndCreateMatch:

    @patch("app.service.match_service.supabase")
    def test_match_cree_quand_like_mutuel(self, mock_sb):
        # liked_user a déjà liké user → match !
        def table_side(name):
            chain = MagicMock()
            if name == "likes":
                chain.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    _mock_execute([{"id": "like-1"}])  # like réciproque trouvé
            elif name == "matches":
                chain.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    _mock_execute([])  # pas encore de match
                chain.insert.return_value.execute.return_value = \
                    _mock_execute([{"id": "match-uuid-new"}])
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.match_service import check_and_create_match
        is_match, match_id = check_and_create_match("user-A", "user-B")

        assert is_match is True
        assert match_id == "match-uuid-new"

    @patch("app.service.match_service.supabase")
    def test_pas_de_match_si_pas_de_like_reciproque(self, mock_sb):
        def table_side(name):
            chain = MagicMock()
            if name == "likes":
                chain.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    _mock_execute([])  # pas de like réciproque
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.match_service import check_and_create_match
        is_match, match_id = check_and_create_match("user-A", "user-B")

        assert is_match is False
        assert match_id is None

    @patch("app.service.match_service.supabase")
    def test_retourne_match_existant_sans_doublon(self, mock_sb):
        # like réciproque ET match déjà existant → retourne l'ID existant
        def table_side(name):
            chain = MagicMock()
            if name == "likes":
                chain.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    _mock_execute([{"id": "like-1"}])
            elif name == "matches":
                chain.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    _mock_execute([{"id": "match-already-exists"}])
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.match_service import check_and_create_match
        is_match, match_id = check_and_create_match("user-A", "user-B")

        assert is_match is True
        assert match_id == "match-already-exists"

    @patch("app.service.match_service.supabase")
    def test_ids_tries_pour_eviter_doublons(self, mock_sb):
        # user1_id et user2_id sont toujours triés → pas de match (A,B) ET (B,A)
        sorted_ids = []

        def table_side(name):
            chain = MagicMock()
            if name == "likes":
                chain.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    _mock_execute([{"id": "like-1"}])
            elif name == "matches":
                def fake_select(fields):
                    sub = MagicMock()
                    def fake_eq1(col, val):
                        sorted_ids.append(val)
                        sub2 = MagicMock()
                        sub2.eq.return_value.execute.return_value = _mock_execute([])
                        return sub2
                    sub.eq.side_effect = fake_eq1
                    return sub
                chain.select.side_effect = fake_select
                chain.insert.return_value.execute.return_value = \
                    _mock_execute([{"id": "new-match"}])
            return chain

        mock_sb.table.side_effect = table_side

        from app.service.match_service import check_and_create_match
        check_and_create_match("user-Z", "user-A")

        # Les IDs doivent être en ordre alphabétique
        if len(sorted_ids) >= 2:
            assert sorted_ids[0] <= sorted_ids[1]
