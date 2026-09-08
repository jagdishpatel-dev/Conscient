from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    username: str


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: Credentials) -> TokenResponse:
    existing = await User.find_one(User.username == payload.username)
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Username already exists")

    user = User(username=payload.username, password_hash=hash_password(payload.password))
    await user.insert()

    token = create_access_token(str(user.id))
    return TokenResponse(token=token, username=user.username)


@router.post("/login", response_model=TokenResponse)
async def login(payload: Credentials) -> TokenResponse:
    user = await User.find_one(User.username == payload.username)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid credentials")

    token = create_access_token(str(user.id))
    return TokenResponse(token=token, username=user.username)
