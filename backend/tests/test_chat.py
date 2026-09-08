from unittest.mock import patch


def _signup(client, username):
    resp = client.post("/auth/signup", json={"username": username, "password": "password123"})
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def test_chat_requires_auth(client):
    resp = client.post("/chat", json={"content": "Hello"})
    assert resp.status_code == 401


def test_chat_roundtrip_and_history(client, unique_username):
    headers = _signup(client, unique_username)

    with patch(
        "app.api.routes.chat.generate_reply", return_value=("Mocked empathetic reply", [])
    ) as mock_reply:
        resp = client.post("/chat", headers=headers, json={"content": "Hello"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["response"] == "Mocked empathetic reply"
    assert body["cited_entries"] == []
    mock_reply.assert_called_once()

    history = client.get("/chat/history", headers=headers)
    assert history.status_code == 200
    messages = history.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Hello"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["content"] == "Mocked empathetic reply"


def test_chat_history_scoped_per_user(client, unique_username):
    headers_a = _signup(client, unique_username)
    headers_b = _signup(client, f"{unique_username}_b")

    with patch("app.api.routes.chat.generate_reply", return_value=("reply", [])):
        client.post("/chat", headers=headers_a, json={"content": "Only Alice sees this"})

    history_b = client.get("/chat/history", headers=headers_b).json()
    assert history_b == []
