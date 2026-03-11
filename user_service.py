from supabase_client import supabase
import bcrypt

def create_user(username: str, email: str, password: str, age: int, bio: str):
    # Hasher le mot de passe
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    data = {
        "username": username,
        "email": email,
        "age": age,
        "bio": bio,
        "password_hash": password_hash
    }
    
    response = supabase.table("users").insert(data).execute()
    return response

def verify_password(email: str, password: str):
    res = supabase.table("users").select("id, password_hash").eq("email", email).execute()
    if not res.data:
        return False
    
    password_hash = res.data[0]["password_hash"]
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

