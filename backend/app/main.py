from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database.supabase_client import supabase
import os
import tempfile

from app.service.user_service import create_or_get_user, login_user
from app.service.photo_service import upload_photo
from app.service.interaction_service import get_profiles_to_swipe, add_like, get_received_likes
from app.models.schemas import UserCreate, LikeAction

import requests
import json

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
    filename = file.filename or "photo.jpg"
    path = os.path.join(tempfile.gettempdir(), f"temp_{user_id}_{filename}")

    try:
        with open(path, "wb") as f:
            f.write(file.file.read())
        url = upload_photo(user_id, path, filename)
    finally:
        if os.path.exists(path):
            os.remove(path)

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

# 🔑 LOGIN
class LoginData(BaseModel):
    email: str
    password: str

@app.post("/login")
def login_endpoint(data: LoginData):
    user = login_user(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {"user_id": user["id"]}

# ✏️ UPDATE USER
class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None

@app.put("/user/{user_id}")
def update_user(user_id: str, data: UserUpdate):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        supabase.table("users").update(updates).eq("id", user_id).execute()
    return {"success": True}

# 📍 LOCALISATION
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

@app.put("/user/{user_id}/location")
def update_location(user_id: str, data: LocationUpdate):
    supabase.table("users").update({
        "latitude": data.latitude,
        "longitude": data.longitude
    }).eq("id", user_id).execute()
    return {"success": True}

# 🔍 PROFILES
@app.get("/profiles/{user_id}")
def profiles_endpoint(
    user_id: str,
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    max_distance: Optional[int] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
):
    profiles = get_profiles_to_swipe(user_id, min_age, max_age, max_distance, lat, lon)
    return {"profiles": profiles}

# 💘 LIKE
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

# 💘 LIKES REÇUS
@app.get("/likes/received/{user_id}")
def received_likes_endpoint(user_id: str):
    profiles = get_received_likes(user_id)
    for p in profiles:
        p["is_online"] = p["id"] in active_connections
    return {"profiles": profiles}

# 💔 UNMATCH
@app.delete("/match/{match_id}")
def delete_match_endpoint(match_id: str):
    supabase.table("messages").delete().eq("match_id", match_id).execute()
    supabase.table("matches").delete().eq("id", match_id).execute()
    return {"success": True}

# 🚫 BLOQUER
class BlockAction(BaseModel):
    user_id: str
    blocked_user_id: str
    match_id: Optional[str] = None

@app.post("/block")
def block_user_endpoint(data: BlockAction):
    if data.match_id:
        supabase.table("messages").delete().eq("match_id", data.match_id).execute()
        supabase.table("matches").delete().eq("id", data.match_id).execute()
    try:
        supabase.table("blocks").insert({
            "user_id": data.user_id,
            "blocked_user_id": data.blocked_user_id
        }).execute()
    except Exception as e:
        print("blocks table:", e)
    return {"success": True}

# 💬 MATCHES
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

        last_msg = supabase.table("messages") \
            .select("content, created_at") \
            .eq("match_id", m["id"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        content = ""
        updated_at = None

        if last_msg.data:
            content = last_msg.data[0]["content"]
            updated_at = last_msg.data[0]["created_at"]

        results.append({
            "match_id": m["id"],
            "id": user_res.data[0]["id"],
            "username": user_res.data[0]["username"],
            "photo_url": photo_res.data[0]["photo_url"] if photo_res.data else None,
            "last_message": content,
            "updated_at": updated_at,
            "is_online": other_user_id in active_connections,
        })

    # 🔥 TRI PROPRE
    results.sort(
        key=lambda x: x["updated_at"] or "1970-01-01",
        reverse=True
    )

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

# 📤 SEND MESSAGE
class MessageCreate(BaseModel):
    match_id: str
    sender_id: str
    content: str

@app.post("/messages")
async def send_message(message: MessageCreate):

    try:
        created_at = datetime.utcnow().isoformat()

        # 💾 DB
        inserted = supabase.table("messages").insert({
            "match_id": message.match_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": created_at
        }).execute()
        message_id = inserted.data[0]["id"] if inserted.data else None

        # 🔍 MATCH
        match = supabase.table("matches") \
            .select("*") \
            .eq("id", message.match_id) \
            .execute()

        m = match.data[0]

        other_user_id = (
            m["user2_id"] if m["user1_id"] == message.sender_id else m["user1_id"]
        )

        # 🔥 PAYLOAD COMPLET (IMPORTANT)
        ws_payload = {
            "type": "new_message",
            "id": message_id,
            "match_id": message.match_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": created_at
        }

        async def send_ws(user_id):
            if user_id in active_connections:
                try:
                    await active_connections[user_id].send_json(ws_payload)
                except:
                    del active_connections[user_id]

        # 🔥 ENVOI AUX 2 USERS
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
        print("ERROR:", e)
        return {"error": str(e)}

# 🔔 PUSH TOKEN
class PushToken(BaseModel):
    user_id: str
    push_token: str

@app.post("/user/push-token")
def save_push_token(data: PushToken):
    supabase.table("users").update({
        "push_token": data.push_token
    }).eq("id", data.user_id).execute()

    return {"success": True}

# 🔔 NOTIF
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

async def notify_status(user_id: str, is_online: bool):
    try:
        matches = supabase.table("matches").select("user1_id, user2_id").or_(
            f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
        ).execute()
        event_type = "user_online" if is_online else "user_offline"
        for m in (matches.data or []):
            other_id = m["user2_id"] if m["user1_id"] == user_id else m["user1_id"]
            if other_id in active_connections:
                try:
                    await active_connections[other_id].send_json({"type": event_type, "user_id": user_id})
                except Exception:
                    active_connections.pop(other_id, None)
    except Exception as e:
        print("notify_status error:", e)

# 🔌 WEBSOCKET
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):

    await websocket.accept()
    active_connections[user_id] = websocket
    await notify_status(user_id, True)

    print(f"{user_id} connecté")

    try:
        while True:
            raw = await websocket.receive_text()

            if raw == "ping":
                continue

            try:
                payload = json.loads(raw)
                event_type = payload.get("type")
                recipient_id = payload.get("recipient_id")

                if event_type in ("call_offer", "call_answer", "call_ice_candidate", "call_reject", "call_end"):
                    if recipient_id and recipient_id in active_connections:
                        fwd = {k: v for k, v in payload.items() if k != "recipient_id"}
                        fwd["type"] = event_type
                        fwd["sender_id"] = user_id
                        try:
                            await active_connections[recipient_id].send_json(fwd)
                        except Exception:
                            active_connections.pop(recipient_id, None)

                elif event_type == "message_reaction":
                    msg_id = payload.get("message_id")
                    emoji = payload.get("emoji")
                    if msg_id and emoji:
                        try:
                            supabase.table("messages").update({"reaction": emoji}).eq("id", msg_id).execute()
                        except Exception as e:
                            print("reaction update error:", e)
                    if recipient_id and recipient_id in active_connections:
                        try:
                            await active_connections[recipient_id].send_json({
                                "type": "message_reaction",
                                "message_id": msg_id,
                                "emoji": emoji,
                                "sender_id": user_id,
                            })
                        except Exception:
                            active_connections.pop(recipient_id, None)

                elif event_type in ("typing", "read") and recipient_id in active_connections:
                    out_type = "typing" if event_type == "typing" else "messages_read"
                    try:
                        await active_connections[recipient_id].send_json({
                            "type": out_type,
                            "match_id": payload.get("match_id"),
                            "sender_id": user_id,
                        })
                    except Exception:
                        active_connections.pop(recipient_id, None)
            except Exception:
                pass

    except WebSocketDisconnect:
        print(f"{user_id} déconnecté")
        active_connections.pop(user_id, None)
        await notify_status(user_id, False)


# 📸 GET PHOTOS UTILISATEUR
@app.get("/user/{user_id}/photos")
def get_user_photos(user_id: str):
    photos = supabase.table("photos").select("photo_url, is_main").eq("user_id", user_id).execute()
    sorted_photos = sorted(photos.data or [], key=lambda p: not p.get("is_main", False))
    return {"photos": sorted_photos}


# ⭐ DÉFINIR PHOTO PRINCIPALE
class SetMainPhoto(BaseModel):
    photo_url: str

@app.put("/user/{user_id}/photo/main")
def set_main_photo(user_id: str, data: SetMainPhoto):
    supabase.table("photos").update({"is_main": False}).eq("user_id", user_id).execute()
    supabase.table("photos").update({"is_main": True}).eq("user_id", user_id).eq("photo_url", data.photo_url).execute()
    return {"success": True}


# 🗑️ SUPPRIMER UNE PHOTO
@app.delete("/user/{user_id}/photo")
def delete_user_photo(user_id: str, photo_url: str = Query(...)):
    was_main_res = supabase.table("photos").select("is_main").eq("user_id", user_id).eq("photo_url", photo_url).execute()
    was_main = was_main_res.data and was_main_res.data[0].get("is_main")
    supabase.table("photos").delete().eq("user_id", user_id).eq("photo_url", photo_url).execute()
    if was_main:
        remaining = supabase.table("photos").select("photo_url").eq("user_id", user_id).limit(1).execute()
        if remaining.data:
            supabase.table("photos").update({"is_main": True}).eq("user_id", user_id).eq("photo_url", remaining.data[0]["photo_url"]).execute()
    return {"success": True}


# 🎤 MESSAGE VOCAL
SUPABASE_URL = "https://nnwgpojusfppkdrtcmil.supabase.co"

@app.post("/messages/audio")
async def send_audio_message(
    match_id: str = Form(...),
    sender_id: str = Form(...),
    file: UploadFile = File(...),
):
    import uuid
    filename = f"voice_{sender_id}_{uuid.uuid4()}.m4a"
    path = os.path.join(tempfile.gettempdir(), filename)
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
        with open(path, "rb") as f:
            supabase.storage.from_("voice-messages").upload(filename, f)
        audio_url = f"{SUPABASE_URL}/storage/v1/object/public/voice-messages/{filename}"
    finally:
        if os.path.exists(path):
            os.remove(path)

    created_at = datetime.utcnow().isoformat()
    inserted = supabase.table("messages").insert({
        "match_id": match_id,
        "sender_id": sender_id,
        "content": "🎤 Message vocal",
        "content_type": "audio",
        "audio_url": audio_url,
        "created_at": created_at
    }).execute()
    message_id = inserted.data[0]["id"] if inserted.data else None

    match = supabase.table("matches").select("*").eq("id", match_id).execute()
    m = match.data[0]
    other_user_id = m["user2_id"] if m["user1_id"] == sender_id else m["user1_id"]

    ws_payload = {
        "type": "new_message",
        "id": message_id,
        "match_id": match_id,
        "sender_id": sender_id,
        "content": "🎤 Message vocal",
        "content_type": "audio",
        "audio_url": audio_url,
        "created_at": created_at,
    }

    async def _send(uid):
        if uid in active_connections:
            try:
                await active_connections[uid].send_json(ws_payload)
            except Exception:
                active_connections.pop(uid, None)

    await _send(other_user_id)
    await _send(sender_id)

    return {"success": True}