from app.database.supabase_client import supabase
import bcrypt

def create_user(username, email, password, age, bio):

    # vérifier si email existe
    existing = supabase.table("users").select("id").eq("email", email).execute()

    if existing.data:
        print("Email déjà utilisé")
        return None

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    data = {
        "username": username,
        "email": email,
        "age": age,
        "bio": bio,
        "password_hash": password_hash
    }

    response = supabase.table("users").insert(data).execute()

    return response.data

def login_user(email, password):

    res = supabase.table("users").select("*").eq("email", email).execute()

    if not res.data:
        return None

    user = res.data[0]

    if bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return user

    return None