"""
Tests unitaires — user_service.py
La base de données Supabase est simulée (mock) pour isoler la logique métier.
"""

import pytest
import bcrypt
from unittest.mock import MagicMock, patch


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _mock_execute(data):
    """Retourne un objet simulant supabase ...execute() avec .data = data."""
    m = MagicMock()
    m.data = data
    return m


def _make_chain(data):
    """Retourne une chaîne de mocks fluente pour supabase.table().select()...execute()."""
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.insert.return_value = chain
    chain.execute.return_value = _mock_execute(data)
    return chain


# ─────────────────────────────────────────────
# create_or_get_user
# ─────────────────────────────────────────────

class TestCreateOrGetUser:

    @patch("app.service.user_service.supabase")
    def test_nouvel_utilisateur_cree(self, mock_sb):
        # Aucun utilisateur existant → insertion réussie
        existing_chain = _make_chain([])          # select → vide
        insert_chain   = _make_chain([{"id": "new-uuid-123"}])

        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            _mock_execute([])
        mock_sb.table.return_value.insert.return_value.execute.return_value = \
            _mock_execute([{"id": "new-uuid-123"}])

        from app.service.user_service import create_or_get_user
        result = create_or_get_user(
            username="alice",
            email="alice@example.com",
            password="motdepasse",
            date_of_birth="2000-01-01",
            bio="Coucou",
        )
        assert result["id"] == "new-uuid-123"

    @patch("app.service.user_service.supabase")
    def test_utilisateur_existant_retourne_sans_insertion(self, mock_sb):
        # L'email existe déjà → retourne l'ID sans insérer
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            _mock_execute([{"id": "existing-uuid-456"}])

        from app.service.user_service import create_or_get_user
        result = create_or_get_user(
            username="alice",
            email="alice@example.com",
            password="motdepasse",
            date_of_birth="2000-01-01",
            bio="Coucou",
        )
        assert result["id"] == "existing-uuid-456"
        # insert ne doit pas être appelé
        mock_sb.table.return_value.insert.assert_not_called()

    @patch("app.service.user_service.supabase")
    def test_mot_de_passe_est_hache(self, mock_sb):
        # Le mot de passe brut ne doit jamais être stocké tel quel
        inserts = []

        def fake_insert(data):
            inserts.append(data)
            chain = MagicMock()
            chain.execute.return_value = _mock_execute([{"id": "uuid-xyz"}])
            return chain

        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            _mock_execute([])
        mock_sb.table.return_value.insert.side_effect = fake_insert

        from app.service.user_service import create_or_get_user
        create_or_get_user("bob", "bob@test.com", "monmotdepasse", "1995-03-10", "bio")

        stored_hash = inserts[0]["password_hash"]
        assert stored_hash != "monmotdepasse"
        assert bcrypt.checkpw(b"monmotdepasse", stored_hash.encode())


# ─────────────────────────────────────────────
# login_user
# ─────────────────────────────────────────────

class TestLoginUser:

    def _hashed(self, pwd: str) -> str:
        return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

    @patch("app.service.user_service.supabase")
    def test_connexion_reussie(self, mock_sb):
        user = {"id": "uuid-001", "email": "alice@test.com", "password_hash": self._hashed("secret")}
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            _mock_execute([user])

        from app.service.user_service import login_user
        result = login_user("alice@test.com", "secret")
        assert result is not None
        assert result["id"] == "uuid-001"

    @patch("app.service.user_service.supabase")
    def test_mauvais_mot_de_passe(self, mock_sb):
        user = {"id": "uuid-001", "email": "alice@test.com", "password_hash": self._hashed("secret")}
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            _mock_execute([user])

        from app.service.user_service import login_user
        result = login_user("alice@test.com", "mauvais_mdp")
        assert result is None

    @patch("app.service.user_service.supabase")
    def test_email_inexistant(self, mock_sb):
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            _mock_execute([])

        from app.service.user_service import login_user
        result = login_user("inconnu@test.com", "secret")
        assert result is None
