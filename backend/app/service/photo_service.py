def upload_photo(user_id, file_path, original_filename):
    import uuid
    from app.database.supabase_client import supabase

    SUPABASE_URL = "https://nnwgpojusfppkdrtcmil.supabase.co"

    # générer un nom unique
    ext = original_filename.split(".")[-1]
    filename = f"{user_id}_{uuid.uuid4()}.{ext}"

    # upload fichier
    with open(file_path, "rb") as f:
        supabase.storage.from_("profile-photos").upload(
            filename,
            f
        )

    # URL publique
    url = f"{SUPABASE_URL}/storage/v1/object/public/profile-photos/{filename}"

    # première photo → main, les suivantes non
    existing = supabase.table("photos").select("id").eq("user_id", user_id).limit(1).execute()
    is_main = len(existing.data or []) == 0

    # insérer dans la table photos
    response = supabase.table("photos").insert({
        "user_id": user_id,
        "photo_url": url,
        "is_main": is_main
    }).execute()

    # vérifier si l'insertion a renvoyé des données
    if not response.data:
        print("Erreur insertion photo : aucune donnée insérée")
    else:
        print("Photo ajoutée dans la table photos :", url)

    return url