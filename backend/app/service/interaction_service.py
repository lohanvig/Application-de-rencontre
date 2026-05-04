from app.database.supabase_client import supabase
from app.service.match_service import check_and_create_match


def get_received_likes(user_id):
    liked_me = supabase.table("likes").select("user_id").eq("liked_user_id", user_id).execute()
    liked_me_ids = [row["user_id"] for row in (liked_me.data or [])]

    if not liked_me_ids:
        return []

    i_liked = supabase.table("likes").select("liked_user_id").eq("user_id", user_id).execute()
    i_liked_ids = {row["liked_user_id"] for row in (i_liked.data or [])}

    pending_ids = [uid for uid in liked_me_ids if uid not in i_liked_ids]

    profiles = []
    for uid in pending_ids:
        user = supabase.table("users").select("*").eq("id", uid).execute()
        if not user.data:
            continue
        u = user.data[0]

        photos = supabase.table("photos").select("photo_url, is_main").eq("user_id", uid).execute()
        photos_data = sorted(photos.data or [], key=lambda p: not p.get("is_main", False))
        all_photos = [p["photo_url"] for p in photos_data]

        profiles.append({
            "id": u["id"],
            "username": u["username"],
            "age": u["age"],
            "bio": u["bio"],
            "photo_url": all_photos[0] if all_photos else None,
            "photos": all_photos,
        })

    return profiles


def get_profiles_to_swipe(user_id):

    liked = supabase.table("likes").select("liked_user_id").eq("user_id", user_id).execute()
    liked_ids = [row["liked_user_id"] for row in (liked.data or [])]

    query = supabase.table("users").select("*").neq("id", user_id)

    if liked_ids:
        query = query.not_.in_("id", liked_ids)

    # exclure les utilisateurs bloqués (dans les deux sens)
    try:
        blocked_by_me = supabase.table("blocks").select("blocked_user_id").eq("user_id", user_id).execute()
        blocked_me = supabase.table("blocks").select("user_id").eq("blocked_user_id", user_id).execute()
        blocked_ids = [r["blocked_user_id"] for r in (blocked_by_me.data or [])]
        blocked_ids += [r["user_id"] for r in (blocked_me.data or [])]
        if blocked_ids:
            query = query.not_.in_("id", blocked_ids)
    except Exception:
        pass

    users_response = query.execute()
    users = users_response.data or []

    profiles = []

    for u in users:

        photos = (
            supabase.table("photos")
            .select("photo_url, is_main")
            .eq("user_id", u["id"])
            .execute()
        )

        photos_data = sorted(photos.data or [], key=lambda p: not p.get("is_main", False))
        all_photos = [p["photo_url"] for p in photos_data]
        main_photo = all_photos[0] if all_photos else None

        profiles.append({
            "id": u["id"],
            "username": u["username"],
            "age": u["age"],
            "bio": u["bio"],
            "photo_url": main_photo,
            "photos": all_photos,
        })

    return profiles


def add_like(user_id, liked_user_id):
    """
    Ajoute un like et vérifie si c'est un match
    """

    response = supabase.table("likes").insert({
        "user_id": user_id,
        "liked_user_id": liked_user_id
    }).execute()

    # vérifier le match
    is_match, match_id = check_and_create_match(user_id, liked_user_id)

    if is_match:
        print(f"C'est un match ! Match ID : {match_id}")

    return response.data, is_match, match_id