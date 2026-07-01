"""Testes unitários e de integração - Produtos."""


def test_create_product(client, auth_headers):
    resp = client.post("/products/", json={
        "nome": "Camiseta Básica",
        "codigo": "CAM-001",
        "tamanho": "M",
        "cor": "Branco",
        "categoria": "Camisetas",
        "preco": 49.90,
        "preco_custo": 20.00,
        "quantidade_estoque": 100,
        "estoque_minimo": 10,
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["codigo"] == "CAM-001"
    assert data["preco"] == 49.90


def test_create_product_duplicate_code(client, auth_headers):
    resp = client.post("/products/", json={
        "nome": "Outro",
        "codigo": "CAM-001",
        "preco": 10.0,
    }, headers=auth_headers)
    assert resp.status_code == 400


def test_list_products(client, auth_headers):
    resp = client.get("/products/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_product_by_id(client, auth_headers):
    create = client.post("/products/", json={
        "nome": "Calça Jeans",
        "codigo": "CAL-001",
        "preco": 129.90,
    }, headers=auth_headers)
    pid = create.json()["id"]
    resp = client.get(f"/products/{pid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == pid


def test_update_product(client, auth_headers):
    create = client.post("/products/", json={
        "nome": "Bermuda",
        "codigo": "BER-001",
        "preco": 79.90,
    }, headers=auth_headers)
    pid = create.json()["id"]
    resp = client.put(f"/products/{pid}", json={"preco": 89.90}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["preco"] == 89.90


def test_get_nonexistent_product(client, auth_headers):
    resp = client.get("/products/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_create_category(client, auth_headers):
    resp = client.post("/categories/", json={
        "nome": "Camisetas",
        "descricao": "Camisetas masculinas e femininas",
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["nome"] == "Camisetas"


def test_list_categories(client, auth_headers):
    resp = client.get("/categories/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
