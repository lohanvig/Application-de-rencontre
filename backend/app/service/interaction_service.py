from app.database.supabase_client import supabase
from app.service.match_service import check_and_create_match


def get_profiles_to_swipe(user_id):

    # récupérer les utilisateurs déjà likés
    liked = (
        supabase.table("likes")
        .select("liked_user_id")
        .eq("user_id", user_id)
        .execute()
    )

    liked_ids = []
    if liked.data:
        liked_ids = [row["liked_user_id"] for row in liked.data]

    # récupérer les utilisateurs différents de l'utilisateur actuel
    query = (
        supabase.table("users")
        .select("*")
        .neq("id", user_id)
    )

    # exclure les profils déjà likés
    if liked_ids:
        query = query.not_.in_("id", liked_ids)

    users_response = query.execute()
    users = users_response.data or []

    profiles = []

    for u in users:

        photos = (
            supabase.table("photos")
            .select("photo_url, is_main")
            .eq("user_id", u["id"])
            .order("is_main", desc=True)
            .execute()
        )

        all_photos = [p["photo_url"] for p in (photos.data or [])]
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