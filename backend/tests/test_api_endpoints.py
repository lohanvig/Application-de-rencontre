"""
Tests unitaires — Endpoints FastAPI (main.py)
Utilise le TestClient de FastAPI + mocks des services.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


def _make_app_client():
    """
    Importe l'app en mockant le client Supabase pour éviter
    toute connexion réelle à la base de données.
    """
    with patch("app.database.supabase_client.supabase", MagicMock()):
        from app.main import app
        return TestClient(app)


@pytest.fixture(scope="module")
def client():
    return _make_app_client()


# ─────────────────────────────────────────────
# GET /
# ─────────────────────────────────────────────

class TestRootEndpoint:

    def test_root_retourne_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_retourne_message(self, client):
        response = client.get("/")
        data = response.json()
        assert "message" in data


# ─────────────────────────────────────────────
# POST /login
# ─────────────────────────────────────────────

class TestLoginEndpoint:

    @patch("app.main.login_user")
    def test_login_valide_retourne_user_id(self, mock_login, client):
        mock_login.return_value = {"id": "uuid-valid-123"}
        response = client.post("/login", json={
            "email": "alice@test.com",
            "password": "secret"
        })
        assert response.status_code == 200
        assert response.json()["user_id"] == "uuid-valid-123"

    @patch("app.main.login_user")
    def test_login_invalide_retourne_401(self, mock_login, client):
        mock_login.return_value = None
        response = client.post("/login", json={
            "email": "alice@test.com",
            "password": "mauvais"
        })
        assert response.status_code == 401

    def test_login_payload_incomplet_retourne_422(self, client):
        response = client.post("/login", json={"email": "alice@test.com"})
        assert response.status_code == 422


# ─────────────────────────────────────────────
# POST /dislike
# ─────────────────────────────────────────────

class TestDislikeEndpoint:

    @patch("app.main.add_dislike")
    def test_dislike_retourne_succes(self, mock_dislike, client):
        mock_dislike.return_value = None
        response = client.post("/dislike", json={
            "user_id": "user-A",
            "disliked_user_id": "user-B"
        })
        assert response.status_code == 200
        assert response.json()["success"] is True

    @patch("app.main.add_dislike")
    def test_dislike_appelle_service_avec_bons_ids(self, mock_dislike, client):
        mock_dislike.return_value = None
        client.post("/dislike", json={
            "user_id": "user-X",
            "disliked_user_id": "user-Y"
        })
        mock_dislike.assert_called_once_with("user-X", "user-Y")

    def test_dislike_payload_incomplet_retourne_422(self, client):
        response = client.post("/dislike", json={"user_id": "user-A"})
        assert response.status_code == 422


# ─────────────────────────────────────────────
# PUT /user/{user_id}/location
# ─────────────────────────────────────────────

class TestLocationEndpoint:

    @patch("app.main.supabase")
    def test_localisation_mise_a_jour(self, mock_sb, client):
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            MagicMock(data=[{"id": "user-A"}])

        response = client.put("/user/user-A/location", json={
            "latitude": 48.8566,
            "longitude": 2.3522
        })
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_localisation_payload_incomplet_retourne_422(self, client):
        response = client.put("/user/user-A/location", json={"latitude": 48.8566})
        assert response.status_code == 422
