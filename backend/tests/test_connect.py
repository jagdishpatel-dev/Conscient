import uuid
from unittest.mock import patch

from app.core.security import decode_access_token


def _create_user_with_mood(client, username, mood):
    signup = client.post("/auth/signup", json={"username": username, "password": "password123"})
    headers = {"Authorization": f"Bearer {signup.json()['token']}"}
    with patch("app.api.routes.diary.index_entry"), patch(
        "app.api.routes.diary.classify_emotion", return_value=(mood, 0.9)
    ):
        client.post(
            "/diary",
            headers=headers,
            json={"title": "entry", "content": "content", "ai_access": True},
        )
    return headers


def test_no_suggestions_without_mood_data(client, unique_username):
    signup = client.post(
        "/auth/signup", json={"username": unique_username, "password": "password123"}
    )
    headers = {"Authorization": f"Bearer {signup.json()['token']}"}
    resp = client.get("/connect/suggestions", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_matches_by_shared_mood_only(client):
    suffix = uuid.uuid4().hex[:8]
    alice = _create_user_with_mood(client, f"alice_{suffix}", "sadness")
    _create_user_with_mood(client, f"bob_{suffix}", "sadness")
    _create_user_with_mood(client, f"carol_{suffix}", "joy")

    suggestions = client.get("/connect/suggestions", headers=alice).json()
    usernames = [s["username"] for s in suggestions]

    assert f"bob_{suffix}" in usernames
    assert f"carol_{suffix}" not in usernames
    matched = next(s for s in suggestions if s["username"] == f"bob_{suffix}")
    assert matched["shared_moods"] == ["sadness"]
    assert matched["request_sent"] is False


def test_connection_request_flow(client):
    suffix = uuid.uuid4().hex[:8]
    alice_username = f"alice_{suffix}"
    bob_username = f"bob_{suffix}"
    alice = _create_user_with_mood(client, alice_username, "fear")
    bob = _create_user_with_mood(client, bob_username, "fear")

    suggestions = client.get("/connect/suggestions", headers=alice).json()
    bob_id = next(s["user_id"] for s in suggestions if s["username"] == bob_username)

    resp = client.post(f"/connect/request/{bob_id}", headers=alice)
    assert resp.status_code == 204

    # sending again should be idempotent, not create a duplicate
    resp2 = client.post(f"/connect/request/{bob_id}", headers=alice)
    assert resp2.status_code == 204

    incoming = client.get("/connect/requests", headers=bob).json()
    assert len(incoming) == 1
    assert incoming[0]["from_username"] == alice_username

    suggestions_after = client.get("/connect/suggestions", headers=alice).json()
    matched = next(s for s in suggestions_after if s["username"] == bob_username)
    assert matched["request_sent"] is True


def test_cannot_request_self(client, unique_username):
    signup = client.post(
        "/auth/signup", json={"username": unique_username, "password": "password123"}
    )
    token = signup.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    my_id = decode_access_token(token)

    resp = client.post(f"/connect/request/{my_id}", headers=headers)
    assert resp.status_code == 400


def test_request_to_nonexistent_user(client, unique_username):
    headers = _create_user_with_mood(client, unique_username, "surprise")
    resp = client.post("/connect/request/000000000000000000000000", headers=headers)
    assert resp.status_code == 404
