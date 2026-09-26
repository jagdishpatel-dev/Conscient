from unittest.mock import patch


def _signup(client, username):
    resp = client.post("/auth/signup", json={"username": username, "password": "password123"})
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def test_create_and_list_entry(client, unique_username):
    headers = _signup(client, unique_username)

    with patch("app.api.routes.diary.index_entry") as mock_index, patch(
        "app.api.routes.diary.classify_emotion", return_value=("joy", 0.9)
    ) as mock_classify:
        resp = client.post(
            "/diary",
            headers=headers,
            json={"title": "Test entry", "content": "Some content", "ai_access": True},
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Test entry"
    assert body["mood"] is None  # not tagged synchronously

    # background task runs within TestClient's request/response cycle
    mock_classify.assert_called_once()
    assert mock_index.call_count == 2  # once on save, once again after mood tagging

    listed = client.get("/diary", headers=headers)
    assert listed.status_code == 200
    entries = listed.json()
    assert len(entries) == 1
    assert entries[0]["mood"] == "joy"


def test_ai_access_off_skips_indexing_and_mood(client, unique_username):
    headers = _signup(client, unique_username)

    with patch("app.api.routes.diary.index_entry") as mock_index, patch(
        "app.api.routes.diary.classify_emotion"
    ) as mock_classify:
        resp = client.post(
            "/diary",
            headers=headers,
            json={"title": "Private", "content": "Should not be indexed", "ai_access": False},
        )

    assert resp.status_code == 201
    mock_index.assert_not_called()
    mock_classify.assert_not_called()

    entries = client.get("/diary", headers=headers).json()
    assert entries[0]["mood"] is None


def test_entries_are_scoped_per_user(client, unique_username):
    headers_a = _signup(client, unique_username)
    headers_b = _signup(client, f"{unique_username}_b")

    with patch("app.api.routes.diary.index_entry"), patch(
        "app.api.routes.diary.classify_emotion", return_value=("neutral", 0.5)
    ):
        client.post(
            "/diary",
            headers=headers_a,
            json={"title": "A's entry", "content": "content", "ai_access": True},
        )

    entries_b = client.get("/diary", headers=headers_b).json()
    assert entries_b == []
