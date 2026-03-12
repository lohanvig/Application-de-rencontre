from app.database.supabase_client import supabase
from app.service.match_service import check_and_create_match


def get_profiles_to_swipe(user_id):

    liked = supabase.table("likes") \
        .select("liked_user_id") \
        .eq("user_id", user_id) \
        .execute()

    liked_ids = []
    if liked.data:
        liked_ids = [row["liked_user_id"] for row in liked.data]

    query = supabase.table("users").select("*").neq("id", user_id)

    if liked_ids:
        ids = ",".join(liked_ids)
        query = query.not_("id", f"in.({ids})")

    users = query.execute().data or []

    profiles = []

    for u in users:

        photos = supabase.table("photos") \
            .select("photo_url") \
            .eq("user_id", u["id"]) \
            .eq("is_main", True) \
            .execute()

        photo_url = photos.data[0]["photo_url"] if photos.data else None

        profiles.append({
            "id": u["id"],
            "username": u["username"],
            "age": u["age"],
            "bio": u["bio"],
            "photo_url": photo_url
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