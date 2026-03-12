from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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


# 5️⃣ Récupérer les matches
@app.get("/matches/{user_id}")
def matches_endpoint(user_id: str):

    from app.database.supabase_client import supabase

    matches = supabase.table("matches").select("*").or_(
        f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
    ).execute()

    return {"matches": matches.data}