from app.database.supabase_client import supabase

def check_and_create_match(user_id, liked_user_id):
    """
    Vérifie si un match existe et crée la ligne si c'est un match.
    Retourne (is_match: bool, match_id: str | None)
    """
    # 1️⃣ vérifier si liked_user_id a déjà liké user_id
    response = supabase.table("likes").select("*").eq("user_id", liked_user_id).eq("liked_user_id", user_id).execute()
    already_liked = bool(response.data)

    if already_liked:
        # 2️⃣ créer le match dans la table matches
        user1, user2 = sorted([user_id, liked_user_id])  # pour éviter doublons inversés
        existing_match = supabase.table("matches").select("*")\
            .eq("user1_id", user1).eq("user2_id", user2).execute()

        if not existing_match.data:  # si le match n'existe pas encore
            match_response = supabase.table("matches").insert({
                "user1_id": user1,
                "user2_id": user2
            }).execute()
            match_id = match_response.data[0]["id"] if match_response.data else None
            return True, match_id

        # déjà existant
        return True, existing_match.data[0]["id"]

    return False, None