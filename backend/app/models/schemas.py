from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    age: int
    bio: str

class UserLogin(BaseModel):
    email: str
    password: str

class LikeAction(BaseModel):
    user_id: str
    liked_user_id: str