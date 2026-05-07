"""
Génère 100 profils de test dans Supabase.
Lancer : python seed_profiles.py
"""

import bcrypt
import random
import uuid
from datetime import date, timedelta
from supabase import create_client

SUPABASE_URL = "https://nnwgpojusfppkdrtcmil.supabase.co"
SUPABASE_KEY = "sb_publishable_kKkCK9DelZEQrGRZVXiqdQ_ODgYoADL"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PASSWORD_HASH = bcrypt.hashpw(b"test123", bcrypt.gensalt()).decode()

# ── Coordonnées de base : Paris
BASE_LAT = 48.8566
BASE_LON = 2.3522

# ── Données de noms
PRENOMS_F = [
    "Emma", "Léa", "Chloé", "Manon", "Inès", "Jade", "Lucie", "Clara",
    "Camille", "Sarah", "Alice", "Laura", "Océane", "Zoé", "Anaïs",
    "Julie", "Marine", "Eva", "Pauline", "Mathilde", "Charlotte", "Margot",
    "Lola", "Nina", "Juliette", "Elisa", "Amélie", "Clémence", "Noémie",
    "Audrey", "Céline", "Laure", "Emilie", "Virginie", "Isabelle",
    "Sophie", "Nathalie", "Florence", "Sandrine", "Caroline",
]

PRENOMS_M = [
    "Lucas", "Hugo", "Théo", "Nathan", "Tom", "Maxime", "Axel", "Antoine",
    "Nicolas", "Julien", "Romain", "Thomas", "Mathieu", "Alexandre", "Pierre",
    "Baptiste", "Quentin", "Kevin", "Florian", "Adrien", "Benjamin", "Clément",
    "Guillaume", "Louis", "Arthur", "Paul", "Simon", "Robin", "Alexis",
    "Victor", "Ethan", "Léo", "Gabriel", "Raphaël", "Tristan",
    "Sébastien", "François", "Laurent", "Vincent", "Stéphane",
]

BIOS = [
    "Fan de randonnée et de bonne cuisine 🍕",
    "Passionné de photographie et de voyages ✈️",
    "Amateur de jazz et de café bien chaud ☕",
    "J'adore les animaux et les soirées jeux de société",
    "Sportif le matin, gourmet le soir 🏃‍♂️",
    "Curieux de tout, aventurier dans l'âme",
    "Féru de cinéma et de littérature 📚",
    "Boulanger amateur — mes croissants sont légendaires",
    "Musicien le week-end, développeur la semaine 💻",
    "Je cherche quelqu'un pour explorer la ville avec moi",
    "Adepte du yoga et des marchés bio 🌿",
    "Passionnée de danse et de théâtre",
    "Grande amatrice de sushi 🍣 et de mangas",
    "Nature lover — les forêts me ressourcent",
    "Toujours partante pour un karaoké improvisé 🎤",
    "Runner du dimanche, flemmard le reste du temps",
    "Architecte le jour, cuisinier le soir",
    "Je collectionne les vinyles et les aventures",
    "Nomade digital à la recherche d'une vraie connexion",
    "Apprenti guitariste — mes voisins apprécient 🎸",
    "Épicurienne, amoureuse des bons vins 🍷",
    "Accro au paddle et aux couchers de soleil",
    "Chat ou chien ? Difficile de choisir, j'ai les deux 🐈",
    "Étudiante en droit avec une passion pour le dessin",
    "Ex-prof de sport reconverti en freelance",
    "Je vis pour les voyages et les rencontres authentiques",
    "Barista le matin, geek le soir",
    "Grande voyageuse — 32 pays au compteur",
    "Passionné de cuisine asiatique 🍜",
    "Ancien militaire, maintenant coach de vie",
]

SMOKING  = ["Non-fumeur", "Fumeur occasionnel", "Fumeur", None]
ALCOHOL  = ["Jamais", "Occasionnellement", "Régulièrement", None]
SPORT    = ["Jamais", "Parfois", "Régulièrement", "Tous les jours", None]
REL_TYPE = ["Relation sérieuse", "Quelque chose de casual", "On verra", "Amitié", None]

def random_dob(min_age=18, max_age=45):
    today = date.today()
    max_date = today - timedelta(days=min_age * 365)
    min_date = today - timedelta(days=max_age * 365)
    delta = (max_date - min_date).days
    return (min_date + timedelta(days=random.randint(0, delta))).isoformat()

def random_coords():
    # Éparpillés sur ~80km autour de Paris
    lat = BASE_LAT + random.uniform(-0.4, 0.4)
    lon = BASE_LON + random.uniform(-0.6, 0.6)
    return round(lat, 6), round(lon, 6)

def create_profiles():
    created = 0
    errors  = 0

    # 50 femmes + 50 hommes
    profiles = (
        [(p, "Femme", i) for i, p in enumerate(random.sample(PRENOMS_F * 3, 50))] +
        [(p, "Homme", i) for i, p in enumerate(random.sample(PRENOMS_M * 3, 50))]
    )
    random.shuffle(profiles)

    for prenom, genre, idx in profiles:
        email = f"test_{prenom.lower()}_{idx}_{random.randint(1000,9999)}@test.com"
        lat, lon = random_coords()
        height = random.choice([None, random.randint(155, 195)])

        # Suffixe unique pour éviter les doublons de username
        suffix = f"_{idx}{random.randint(10,99)}"
        username = prenom + suffix

        user_data = {
            "username":          username,
            "email":             email,
            "password_hash":     PASSWORD_HASH,
            "date_of_birth":     random_dob(),
            "bio":               random.choice(BIOS),
            "gender":            genre,
            "height":            height,
            "smoking":           random.choice(SMOKING),
            "alcohol":           random.choice(ALCOHOL),
            "sport":             random.choice(SPORT),
            "relationship_type": random.choice(REL_TYPE),
            "latitude":          lat,
            "longitude":         lon,
        }

        try:
            res = supabase.table("users").insert(user_data).execute()
            if not res.data:
                errors += 1
                continue

            user_id = res.data[0]["id"]

            # Photo aléatoire depuis randomuser.me
            gender_path = "women" if genre == "Femme" else "men"
            photo_num   = (idx % 90) + 1
            photo_url   = f"https://randomuser.me/api/portraits/{gender_path}/{photo_num}.jpg"

            supabase.table("photos").insert({
                "user_id":   user_id,
                "photo_url": photo_url,
                "is_main":   True,
            }).execute()

            created += 1
            print(f"  [{created}/100] {prenom} ({genre}) — {email}")

        except Exception as e:
            errors += 1
            print(f"  ERREUR {prenom}: {e}")

    print(f"\nTermine : {created} profils crees, {errors} erreurs.")
    print("Mot de passe de tous les comptes de test : test123")

if __name__ == "__main__":
    print("Creation de 100 profils de test...\n")
    create_profiles()
