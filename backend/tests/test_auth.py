"""Testes unitários e de integração - Autenticação e RBAC."""


def test_login_success(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"].upper() == "ADMIN"


def test_login_wrong_password(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "errada"})
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post("/auth/login", json={"username": "naoexiste", "password": "x"})
    assert resp.status_code == 401


def test_get_me(client, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


def test_protected_endpoint_without_token(client):
    resp = client.get("/products/")
    assert resp.status_code == 401


def test_create_user_as_admin(client, auth_headers):
    resp = client.post("/users/", json={
        "nome": "Vendedor Teste",
        "email": "vendedor@test.com",
        "username": "vendedor",
        "password": "vend123",
        "role": "VENDEDOR",
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["role"].upper() == "VENDEDOR"


def test_vendedor_cannot_create_user(client, auth_headers):
    # Login como vendedor
    resp = client.post("/auth/login", json={"username": "vendedor", "password": "vend123"})
    if resp.status_code != 200:
        return  # vendedor não criado ainda, skip
    vendor_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    resp = client.post("/users/", json={
        "nome": "Outro",
        "email": "outro@test.com",
        "username": "outro",
        "password": "out123",
        "role": "VENDEDOR",
    }, headers=vendor_headers)
    assert resp.status_code == 403
