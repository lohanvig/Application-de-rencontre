from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from app.database.supabase_client import supabase

from app.service.user_service import create_or_get_user
from app.service.photo_service import upload_photo
from app.service.interaction_service import get_profiles_to_swipe, add_like
from app.models.schemas import UserCreate, LikeAction

import requests

app = FastAPI(title="API V1 - Application de Rencontre")

# 🔓 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔌 CONNEXIONS WS
active_connections = {}

# 🧪 TEST
@app.get("/")
def root():
    return {"message": "Dating API running 🚀"}


# 👤 CREATE USER
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


# 📸 UPLOAD PHOTO
@app.post("/user/{user_id}/photo")
def upload_photo_endpoint(user_id: str, file: UploadFile = File(...)):
    filename = file.filename
    path = f"temp_{filename}"

    with open(path, "wb") as f:
        f.write(file.file.read())

    url = upload_photo(user_id, path, filename)
    return {"photo_url": url}


# 👤 GET USER
@app.get("/user/{user_id}")
def get_user(user_id: str):
    user = supabase.table("users").select("*").eq("id", user_id).execute()

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


# 🔍 PROFILES
@app.get("/profiles/{user_id}")
def profiles_endpoint(user_id: str):
    profiles = get_profiles_to_swipe(user_id)
    return {"profiles": profiles}


# 💘 LIKE + MATCH
@app.post("/like")
def like_endpoint(like: LikeAction):

    data, is_match, match_id = add_like(
        like.user_id,
        like.liked_user_id
    )

    if is_match:
        other_user = supabase.table("users") \
            .select("push_token") \
            .eq("id", like.liked_user_id) \
            .execute()

        if other_user.data:
            token = other_user.data[0]["push_token"]

            if token:
                send_push_notification(
                    token,
                    "💘 Nouveau match !",
                    "Quelqu’un t’a liké en retour 😉",
                    match_id,
                    like.user_id
                )

    return {
        "success": True,
        "is_match": is_match,
        "match_id": match_id
    }


# 💬 MATCHES LIST
@app.get("/matches/{user_id}")
def matches_endpoint(user_id: str):

    matches = supabase.table("matches").select("*").or_(
        f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
    ).execute()

    results = []

    for m in matches.data:

        other_user_id = m["user2_id"] if m["user1_id"] == user_id else m["user1_id"]

        user_res = supabase.table("users") \
            .select("id, username") \
            .eq("id", other_user_id) \
            .execute()

        photo_res = supabase.table("photos") \
            .select("photo_url") \
            .eq("user_id", other_user_id) \
            .limit(1) \
            .execute()

        last_msg_res = supabase.table("messages") \
            .select("content, created_at") \
            .eq("match_id", m["id"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        last_message = ""
        updated_at = None

        if last_msg_res.data:
            last_message = last_msg_res.data[0]["content"]
            updated_at = last_msg_res.data[0]["created_at"]

        results.append({
            "match_id": m["id"],
            "id": user_res.data[0]["id"],
            "username": user_res.data[0]["username"],
            "photo_url": photo_res.data[0]["photo_url"] if photo_res.data else None,
            "last_message": last_message,
            "updated_at": updated_at
        })

    # 🔥 TRI PAR DERNIER MESSAGE
    results.sort(key=lambda x: x["updated_at"] or "", reverse=True)

    return {"matches": results}


# 📩 GET MESSAGES
@app.get("/messages/{match_id}")
def get_messages(match_id: str):
    messages = supabase.table("messages") \
        .select("*") \
        .eq("match_id", match_id) \
        .order("created_at", desc=False) \
        .execute()

    return {"messages": messages.data}


# 📤 SEND MESSAGE + WS + NOTIF
class MessageCreate(BaseModel):
    match_id: str
    sender_id: str
    content: str


@app.post("/messages")
async def send_message(message: MessageCreate):

    try:
        created_at = datetime.utcnow().isoformat()

        # 💾 DB
        supabase.table("messages").insert({
            "match_id": message.match_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": created_at
        }).execute()

        # 🔍 MATCH
        match = supabase.table("matches") \
            .select("*") \
            .eq("id", message.match_id) \
            .execute()

        if not match.data:
            return {"error": "Match not found"}

        m = match.data[0]

        other_user_id = (
            m["user2_id"] if m["user1_id"] == message.sender_id else m["user1_id"]
        )

        ws_payload = {
            "match_id": message.match_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": created_at
        }

        # 🔥 ENVOI WS SÉCURISÉ
        async def send_ws(user_id):
            if user_id in active_connections:
                try:
                    await active_connections[user_id].send_json(ws_payload)
                except:
                    del active_connections[user_id]

        await send_ws(other_user_id)
        await send_ws(message.sender_id)

        # 🔔 PUSH SI OFFLINE
        if other_user_id not in active_connections:

            user = supabase.table("users") \
                .select("push_token") \
                .eq("id", other_user_id) \
                .execute()

            if user.data:
                token = user.data[0]["push_token"]

                if token:
                    send_push_notification(
                        token,
                        "💬 Nouveau message",
                        message.content,
                        message.match_id,
                        message.sender_id
                    )

        return {"success": True}

    except Exception as e:
        print("ERROR SEND MESSAGE:", e)
        return {"error": str(e)}


# 🔔 SAVE PUSH TOKEN
class PushToken(BaseModel):
    user_id: str
    push_token: str


@app.post("/user/push-token")
def save_push_token(data: PushToken):
    supabase.table("users").update({
        "push_token": data.push_token
    }).eq("id", data.user_id).execute()

    return {"success": True}


# 🔔 SEND NOTIFICATION
def send_push_notification(token, title, body, match_id=None, sender_id=None):

    requests.post(
        "https://exp.host/--/api/v2/push/send",
        json={
            "to": token,
            "title": title,
            "body": body,
            "data": {
                "matchId": match_id,
                "senderId": sender_id
            }
        }
    )


# 🔌 WEBSOCKET
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):

    await websocket.accept()
    active_connections[user_id] = websocket

    print(f"{user_id} connecté")

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        print(f"{user_id} déconnecté")
        if user_id in active_connections:
            del active_connections[user_id]