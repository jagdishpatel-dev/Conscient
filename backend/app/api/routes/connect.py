from collections import Counter, defaultdict

from beanie import PydanticObjectId
from beanie.operators import In
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.connection_request import ConnectionRequest
from app.models.diary_entry import DiaryEntry
from app.models.user import User

router = APIRouter(prefix="/connect", tags=["connect"])

MAX_SUGGESTIONS = 5
TOP_MOODS_PER_USER = 2

MOOD_COMMONALITY = {
    "joy": "Also celebrating some wins lately",
    "sadness": "Also navigating some heavy days",
    "anger": "Also working through some frustration",
    "fear": "Also sitting with some anxiety lately",
    "disgust": "Also processing some difficult feelings",
    "surprise": "Also adjusting to some unexpected changes",
    "neutral": "Also just taking things day by day",
}


class SuggestedUser(BaseModel):
    user_id: str
    username: str
    shared_moods: list[str]
    commonality: str
    last_active: str | None
    request_sent: bool


class IncomingRequest(BaseModel):
    from_user_id: str
    from_username: str
    created_at: str


async def _mood_profiles() -> dict[str, Counter]:
    """user_id -> Counter of mood label -> entry count, from AI-accessible entries only."""
    pipeline = [
        {"$match": {"mood": {"$ne": None}}},
        {"$group": {"_id": {"user_id": "$user_id", "mood": "$mood"}, "count": {"$sum": 1}}},
    ]
    results = await DiaryEntry.aggregate(pipeline).to_list()
    profiles: dict[str, Counter] = defaultdict(Counter)
    for r in results:
        profiles[r["_id"]["user_id"]][r["_id"]["mood"]] = r["count"]
    return profiles


async def _last_active_map() -> dict[str, str]:
    pipeline = [{"$group": {"_id": "$user_id", "last_date": {"$max": "$date"}}}]
    results = await DiaryEntry.aggregate(pipeline).to_list()
    return {r["_id"]: r["last_date"].isoformat() for r in results}


@router.get("/suggestions", response_model=list[SuggestedUser])
async def get_suggestions(user: User = Depends(get_current_user)) -> list[SuggestedUser]:
    my_id = str(user.id)
    profiles = await _mood_profiles()
    my_profile = profiles.get(my_id)
    if not my_profile:
        return []

    my_top = {mood for mood, _ in my_profile.most_common(TOP_MOODS_PER_USER)}

    matches: list[tuple[str, list[str]]] = []
    for other_id, other_profile in profiles.items():
        if other_id == my_id:
            continue
        other_top = {mood for mood, _ in other_profile.most_common(TOP_MOODS_PER_USER)}
        shared = my_top & other_top
        if shared:
            matches.append((other_id, sorted(shared)))

    matches.sort(key=lambda m: len(m[1]), reverse=True)
    matches = matches[:MAX_SUGGESTIONS]
    if not matches:
        return []

    user_ids = [PydanticObjectId(uid) for uid, _ in matches]
    users = await User.find(In(User.id, user_ids)).to_list()
    username_map = {str(u.id): u.username for u in users}

    last_active = await _last_active_map()
    already_sent = {
        r.to_user_id async for r in ConnectionRequest.find(ConnectionRequest.from_user_id == my_id)
    }

    return [
        SuggestedUser(
            user_id=uid,
            username=username_map[uid],
            shared_moods=shared,
            commonality=MOOD_COMMONALITY.get(shared[0], "Similar emotional patterns lately"),
            last_active=last_active.get(uid),
            request_sent=uid in already_sent,
        )
        for uid, shared in matches
        if uid in username_map
    ]


@router.post("/request/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def send_connection_request(
    target_user_id: str, user: User = Depends(get_current_user)
) -> None:
    if target_user_id == str(user.id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot connect with yourself")

    target = await User.get(target_user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    existing = await ConnectionRequest.find_one(
        ConnectionRequest.from_user_id == str(user.id),
        ConnectionRequest.to_user_id == target_user_id,
    )
    if existing is None:
        await ConnectionRequest(from_user_id=str(user.id), to_user_id=target_user_id).insert()


@router.get("/requests", response_model=list[IncomingRequest])
async def get_incoming_requests(user: User = Depends(get_current_user)) -> list[IncomingRequest]:
    requests = (
        await ConnectionRequest.find(ConnectionRequest.to_user_id == str(user.id))
        .sort("-created_at")
        .to_list()
    )
    if not requests:
        return []

    from_ids = [PydanticObjectId(r.from_user_id) for r in requests]
    users = await User.find(In(User.id, from_ids)).to_list()
    username_map = {str(u.id): u.username for u in users}

    return [
        IncomingRequest(
            from_user_id=r.from_user_id,
            from_username=username_map[r.from_user_id],
            created_at=r.created_at.isoformat(),
        )
        for r in requests
        if r.from_user_id in username_map
    ]
