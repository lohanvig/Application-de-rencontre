from  app.database.supabase_client import supabase

def get_profiles(user_id):

    response = supabase.table("users") \
        .select("id, username, bio, photos(url)") \
        .neq("id", user_id) \
        .execute()

    return response.data