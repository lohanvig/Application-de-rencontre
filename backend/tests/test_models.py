"""
Tests unitaires — Modèles Pydantic (schemas.py)
Validation des données entrantes sans base de données.
"""

import pytest
from pydantic import ValidationError

from app.models.schemas import UserCreate, LikeAction, UserLogin


# ─────────────────────────────────────────────
# UserCreate
# ─────────────────────────────────────────────

class TestUserCreate:

    def test_creation_valide_sans_genre(self):
        u = UserCreate(
            username="alice",
            email="alice@example.com",
            password="motdepasse123",
            date_of_birth="2000-05-15",
            bio="Coucou je suis Alice",
        )
        assert u.username == "alice"
        assert u.email == "alice@example.com"
        assert u.gender is None

    def test_creation_valide_avec_genre(self):
        u = UserCreate(
            username="bob",
            email="bob@example.com",
            password="secret",
            date_of_birth="1998-12-01",
            bio="Bio de Bob",
            gender="Homme",
        )
        assert u.gender == "Homme"

    def test_champ_username_obligatoire(self):
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@example.com",
                password="secret",
                date_of_birth="2000-01-01",
                bio="bio",
            )

    def test_champ_email_obligatoire(self):
        with pytest.raises(ValidationError):
            UserCreate(
                username="alice",
                password="secret",
                date_of_birth="2000-01-01",
                bio="bio",
            )

    def test_champ_password_obligatoire(self):
        with pytest.raises(ValidationError):
            UserCreate(
                username="alice",
                email="alice@example.com",
                date_of_birth="2000-01-01",
                bio="bio",
            )

    def test_champ_date_of_birth_obligatoire(self):
        with pytest.raises(ValidationError):
            UserCreate(
                username="alice",
                email="alice@example.com",
                password="secret",
                bio="bio",
            )

    def test_genre_optionnel_defaut_none(self):
        u = UserCreate(
            username="alice",
            email="alice@example.com",
            password="secret",
            date_of_birth="2000-01-01",
            bio="bio",
        )
        assert u.gender is None


# ─────────────────────────────────────────────
# LikeAction
# ─────────────────────────────────────────────

class TestLikeAction:

    def test_like_valide(self):
        like = LikeAction(user_id="uuid-aaa", liked_user_id="uuid-bbb")
        assert like.user_id == "uuid-aaa"
        assert like.liked_user_id == "uuid-bbb"

    def test_user_id_obligatoire(self):
        with pytest.raises(ValidationError):
            LikeAction(liked_user_id="uuid-bbb")

    def test_liked_user_id_obligatoire(self):
        with pytest.raises(ValidationError):
            LikeAction(user_id="uuid-aaa")


# ─────────────────────────────────────────────
# UserLogin
# ─────────────────────────────────────────────

class TestUserLogin:

    def test_login_valide(self):
        login = UserLogin(email="alice@example.com", password="secret")
        assert login.email == "alice@example.com"

    def test_email_obligatoire(self):
        with pytest.raises(ValidationError):
            UserLogin(password="secret")

    def test_password_obligatoire(self):
        with pytest.raises(ValidationError):
            UserLogin(email="alice@example.com")
