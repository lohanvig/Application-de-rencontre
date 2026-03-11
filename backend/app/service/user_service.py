from app.database.supabase_client import supabase
import bcrypt

def create_or_get_user(username, email, password, age, bio):
    """
    Crée un utilisateur ou récupère son ID si l'email existe déjà
    """
    # vérifier si email existe
    existing = supabase.table("users").select("*").eq("email", email).execute()

    if existing.data:
        print("Email déjà utilisé, récupération de l'utilisateur existant")
        user_id = existing.data[0]["id"]
        return {"id": user_id}

    # créer mot de passe hashé
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    data = {
        "username": username,
        "email": email,
        "age": age,
        "bio": bio,
        "password_hash": password_hash
    }

    response = supabase.table("users").insert(data).execute()

    if not response.data:
        raise Exception("Erreur lors de la création de l'utilisateur")

    user_id = response.data[0]["id"]
    print("Nouvel utilisateur créé :", user_id)
    return {"id": user_id}

def login_user(email, password):

    res = supabase.table("users").select("*").eq("email", email).execute()

    if not res.data:
        return None

    user = res.data[0]

    if bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return user

    return None