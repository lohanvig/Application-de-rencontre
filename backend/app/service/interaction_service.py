from app.database.supabase_client import supabase
from app.service.match_service import check_and_create_match


def get_profiles_to_swipe(user_id):
    """
    Récupère les profils non encore likés par l'utilisateur
    et leur photo principale
    """

    # récupérer les ids déjà likés
    liked = supabase.table("likes") \
        .select("liked_user_id") \
        .eq("user_id", user_id) \
        .execute()

    liked_ids = [row["liked_user_id"] for row in liked.data] if liked.data else []

    # récupérer les utilisateurs différents de l'utilisateur
    query = supabase.table("users") \
        .select("*") \
        .neq("id", user_id)

    if liked_ids:
        query = query.not_("id", f"in.({','.join(liked_ids)})")

    users = query.execute().data or []

    profiles = []

    for u in users:

        # récupérer la photo principale
        photos = supabase.table("photos") \
            .select("photo_url") \
            .eq("user_id", u["id"]) \
            .eq("is_main", True) \
            .limit(1) \
            .execute()

        photo_url = None
        if photos.data:
            photo_url = photos.data[0]["photo_url"]

        profiles.append({
            "id": u["id"],
            "username": u["username"],
            "bio": u.get("bio"),
            "age": u.get("age"),
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