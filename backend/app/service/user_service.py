from app.database.supabase_client import supabase
import bcrypt


def create_or_get_user(username, email, password, date_of_birth, bio, gender=None):
    existing = supabase.table("users").select("*").eq("email", email).execute()
    if existing.data:
        return {"id": existing.data[0]["id"]}

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    data = {
        "username": username,
        "email": email,
        "date_of_birth": date_of_birth,
        "bio": bio,
        "password_hash": password_hash,
    }
    if gender:
        data["gender"] = gender

    response = supabase.table("users").insert(data).execute()
    if not response.data:
        raise Exception("Erreur lors de la création de l'utilisateur")

    return {"id": response.data[0]["id"]}


def login_user(email, password):
    res = supabase.table("users").select("*").eq("email", email).execute()
    if not res.data:
        return None
    user = res.data[0]
    if bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return user
    return None
