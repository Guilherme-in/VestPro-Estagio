"""Testes - Clientes."""


def test_create_customer(client, auth_headers):
    resp = client.post("/customers/", json={
        "nome": "João Silva",
        "email": "joao@email.com",
        "telefone": "11999999999",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nome"] == "João Silva"
    assert "id" in data


def test_create_customer_duplicate_cpf(client, auth_headers):
    payload = {"nome": "Maria A", "cpf": "111.111.111-11"}
    client.post("/customers/", json=payload, headers=auth_headers)
    resp = client.post("/customers/", json={"nome": "Maria B", "cpf": "111.111.111-11"}, headers=auth_headers)
    assert resp.status_code == 400
    assert "CPF" in resp.json()["detail"]


def test_list_customers(client, auth_headers):
    resp = client.get("/customers/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_customer_by_id(client, auth_headers):
    create = client.post("/customers/", json={"nome": "Pedro"}, headers=auth_headers)
    cid = create.json()["id"]
    resp = client.get(f"/customers/{cid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == cid


def test_update_customer(client, auth_headers):
    create = client.post("/customers/", json={"nome": "Ana"}, headers=auth_headers)
    cid = create.json()["id"]
    resp = client.put(f"/customers/{cid}", json={"nome": "Ana Lima"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["nome"] == "Ana Lima"


def test_get_nonexistent_customer(client, auth_headers):
    resp = client.get("/customers/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_vendedor_cannot_create_customer(client, auth_headers):
    """RBAC: vendedor não pode cadastrar clientes."""
    # garante que o vendedor existe
    client.post("/users/", json={
        "nome": "Vend2", "email": "vend2@test.com",
        "username": "vend2", "password": "vend123", "role": "VENDEDOR",
    }, headers=auth_headers)
    login = client.post("/auth/login", json={"username": "vend2", "password": "vend123"})
    assert login.status_code == 200
    vend_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.post("/customers/", json={"nome": "Cliente Bloqueado"}, headers=vend_headers)
    assert resp.status_code == 403


def test_delete_customer(client, auth_headers):
    create = client.post("/customers/", json={"nome": "Excluir"}, headers=auth_headers)
    cid = create.json()["id"]
    resp = client.delete(f"/customers/{cid}", headers=auth_headers)
    assert resp.status_code == 204
