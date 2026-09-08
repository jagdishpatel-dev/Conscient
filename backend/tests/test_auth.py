def test_signup_and_login(client, unique_username):
    resp = client.post(
        "/auth/signup", json={"username": unique_username, "password": "password123"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == unique_username
    assert "token" in body

    resp2 = client.post(
        "/auth/login", json={"username": unique_username, "password": "password123"}
    )
    assert resp2.status_code == 200
    assert "token" in resp2.json()


def test_signup_duplicate_username(client, unique_username):
    client.post("/auth/signup", json={"username": unique_username, "password": "password123"})
    resp = client.post(
        "/auth/signup", json={"username": unique_username, "password": "password123"}
    )
    assert resp.status_code == 400


def test_login_wrong_password(client, unique_username):
    client.post("/auth/signup", json={"username": unique_username, "password": "password123"})
    resp = client.post("/auth/login", json={"username": unique_username, "password": "wrong"})
    assert resp.status_code == 400


def test_login_nonexistent_user(client, unique_username):
    resp = client.post(
        "/auth/login", json={"username": unique_username, "password": "password123"}
    )
    assert resp.status_code == 400


def test_diary_requires_auth(client):
    resp = client.get("/diary")
    assert resp.status_code == 401


def test_diary_rejects_bad_token(client):
    resp = client.get("/diary", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
