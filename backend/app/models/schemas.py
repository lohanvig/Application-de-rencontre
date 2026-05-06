from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    date_of_birth: str  # YYYY-MM-DD
    bio: str
    gender: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class LikeAction(BaseModel):
    user_id: str
    liked_user_id: str
