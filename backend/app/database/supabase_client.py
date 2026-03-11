from supabase import create_client, Client

SUPABASE_URL = "https://nnwgpojusfppkdrtcmil.supabase.co"
SUPABASE_KEY = "sb_publishable_kKkCK9DelZEQrGRZVXiqdQ_ODgYoADL"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
