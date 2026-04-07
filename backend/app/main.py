from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.database.supabase_client import supabase
from pydantic import BaseModel

from app.service.user_service import create_or_get_user
from app.service.photo_service import upload_photo
from app.service.interaction_service import get_profiles_to_swipe, add_like
from app.models.schemas import UserCreate, LikeAction

app = FastAPI(title="API V1 - Application de Rencontre")


# 🔓 Autoriser les appels depuis ton app mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # pour le dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 🧪 Route test
@app.get("/")
def root():
    return {"message": "Dating API running 🚀"}


# 1️⃣ Créer utilisateur
@app.post("/user")
def create_user_endpoint(user: UserCreate):

    u = create_or_get_user(
        user.username,
        user.email,
        user.password,
        user.age,
        user.bio
    )

    return {"user_id": u["id"]}


# 2️⃣ Upload photo
@app.post("/user/{user_id}/photo")
def upload_photo_endpoint(user_id: str, file: UploadFile = File(...)):

    filename = file.filename
    path = f"temp_{filename}"

    with open(path, "wb") as f:
        f.write(file.file.read())

    url = upload_photo(user_id, path, filename)

    return {"photo_url": url}

@app.get("/user/{user_id}")
def get_user(user_id: str):

    user = supabase.table("users") \
        .select("*") \
        .eq("id", user_id) \
        .execute()

    if not user.data:
        return {"error": "User not found"}

    u = user.data[0]

    photo = supabase.table("photos") \
        .select("photo_url") \
        .eq("user_id", user_id) \
        .eq("is_main", True) \
        .execute()

    photo_url = photo.data[0]["photo_url"] if photo.data else None

    return {
        "id": u["id"],
        "username": u["username"],
        "age": u["age"],
        "bio": u["bio"],
        "photo_url": photo_url
    }


# 3️⃣ Récupérer profils à swiper
@app.get("/profiles/{user_id}")
def profiles_endpoint(user_id: str):

    profiles = get_profiles_to_swipe(user_id)

    return {"profiles": profiles}


# 4️⃣ Liker un profil
@app.post("/like")
def like_endpoint(like: LikeAction):

    data, is_match, match_id = add_like(
        like.user_id,
        like.liked_user_id
    )

    return {
        "success": True,
        "is_match": is_match,
        "match_id": match_id
    }


@app.get("/matches/{user_id}")
def matches_endpoint(user_id: str):

    from app.database.supabase_client import supabase

    # Récupère tous les matches de l'utilisateur
    matches = supabase.table("matches").select("*").or_(
        f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
    ).execute()

    results = []

    for m in matches.data:
        # ID de l'autre personne
        other_user_id = m["user2_id"] if m["user1_id"] == user_id else m["user1_id"]

        # Infos de l'autre utilisateur
        user_res = supabase.table("users") \
            .select("id, username, age, bio") \
            .eq("id", other_user_id) \
            .execute()

        # Photo principale
        photo_res = supabase.table("photos") \
            .select("photo_url") \
            .eq("user_id", other_user_id) \
            .limit(1) \
            .execute()

        # 🔹 Dernier message pour ce match
        last_msg_res = supabase.table("messages") \
            .select("content") \
            .eq("match_id", m["id"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        last_message = last_msg_res.data[0]["content"] if last_msg_res.data else ""

        results.append({
            "match_id": m["id"],       # ID du match
            "id": user_res.data[0]["id"],
            "username": user_res.data[0]["username"],
            "photo_url": photo_res.data[0]["photo_url"] if photo_res.data else None,
            "last_message": last_message
        })

    return {"matches": results}

@app.get("/messages/{match_id}")
def get_messages(match_id: str):

    messages = supabase.table("messages") \
        .select("*") \
        .eq("match_id", match_id) \
        .order("created_at", desc=False) \
        .execute()

    return {"messages": messages.data}



class MessageCreate(BaseModel):
    match_id: str
    sender_id: str
    content: str

@app.post("/messages")
def send_message(message: MessageCreate):
    try:
        res = supabase.table("messages").insert({
            "match_id": message.match_id,
            "sender_id": message.sender_id,
            "content": message.content
        }).execute()

        return {"success": True, "message": message.content}
    except Exception as e:
        return {"error": str(e)}