"""Testes - Fornecedores."""


def test_create_supplier(client, auth_headers):
    resp = client.post("/suppliers/", json={
        "nome": "Fornecedor ABC",
        "cnpj": "12.345.678/0001-99",
        "telefone": "1133334444",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nome"] == "Fornecedor ABC"
    assert "id" in data


def test_create_supplier_duplicate_cnpj(client, auth_headers):
    client.post("/suppliers/", json={"nome": "Forn A", "cnpj": "99.999.999/0001-01"}, headers=auth_headers)
    resp = client.post("/suppliers/", json={"nome": "Forn B", "cnpj": "99.999.999/0001-01"}, headers=auth_headers)
    assert resp.status_code == 400
    assert "CNPJ" in resp.json()["detail"]


def test_list_suppliers(client, auth_headers):
    resp = client.get("/suppliers/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_supplier_by_id(client, auth_headers):
    create = client.post("/suppliers/", json={"nome": "Forn XYZ"}, headers=auth_headers)
    sid = create.json()["id"]
    resp = client.get(f"/suppliers/{sid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == sid


def test_update_supplier(client, auth_headers):
    create = client.post("/suppliers/", json={"nome": "Forn Update"}, headers=auth_headers)
    sid = create.json()["id"]
    resp = client.put(f"/suppliers/{sid}", json={"telefone": "1100001111"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["telefone"] == "1100001111"


def test_get_nonexistent_supplier(client, auth_headers):
    resp = client.get("/suppliers/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_vendedor_cannot_create_supplier(client, auth_headers):
    """RBAC: vendedor não pode cadastrar fornecedores."""
    client.post("/users/", json={
        "nome": "Vend3", "email": "vend3@test.com",
        "username": "vend3", "password": "vend123", "role": "VENDEDOR",
    }, headers=auth_headers)
    login = client.post("/auth/login", json={"username": "vend3", "password": "vend123"})
    assert login.status_code == 200
    vend_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.post("/suppliers/", json={"nome": "Forn Bloqueado"}, headers=vend_headers)
    assert resp.status_code == 403


def test_delete_supplier(client, auth_headers):
    create = client.post("/suppliers/", json={"nome": "Forn Excluir"}, headers=auth_headers)
    sid = create.json()["id"]
    resp = client.delete(f"/suppliers/{sid}", headers=auth_headers)
    assert resp.status_code == 204
