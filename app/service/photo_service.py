from app.database.supabase_client import supabase

SUPABASE_URL = "https://nnwgpojusfppkdrtcmil.supabase.co"

def upload_photo(user_id, file_path, filename):

    with open(file_path, "rb") as f:
        supabase.storage.from_("profile-photos").upload(
            filename,
            f
        )

    url = f"{SUPABASE_URL}/storage/v1/object/public/profile-photos/{filename}"

    supabase.table("photos").insert({
        "user_id": user_id,
        "photo_url": url,
        "is_main": True
    }).execute()

    return url