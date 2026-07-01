"""Testes - Movimentações de estoque."""
import pytest
import uuid


@pytest.fixture
def prod_mov(client, auth_headers):
    code = f"MOV-{uuid.uuid4().hex[:6].upper()}"
    resp = client.post("/products/", json={
        "nome": "Produto Movimento",
        "codigo": code,
        "preco": 50.00,
        "quantidade_estoque": 20,
        "estoque_minimo": 2,
    }, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()


def test_create_entrada(client, auth_headers, prod_mov):
    resp = client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Reposição de estoque",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["tipo"] == "ENTRADA"
    assert data["quantidade"] == 10


def test_entrada_increases_stock(client, auth_headers, prod_mov):
    estoque_antes = prod_mov["quantidade_estoque"]
    qtd = 5
    client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "ENTRADA",
        "quantidade": qtd,
        "motivo": "Compra",
    }, headers=auth_headers)
    prod = client.get(f"/products/{prod_mov['id']}", headers=auth_headers).json()
    assert prod["quantidade_estoque"] == estoque_antes + qtd


def test_create_saida(client, auth_headers, prod_mov):
    resp = client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "SAIDA",
        "quantidade": 3,
        "motivo": "Venda avulsa",
    }, headers=auth_headers)
    assert resp.status_code == 201


def test_saida_reduces_stock(client, auth_headers, prod_mov):
    estoque_antes = prod_mov["quantidade_estoque"]
    qtd = 4
    client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "SAIDA",
        "quantidade": qtd,
        "motivo": "Saída",
    }, headers=auth_headers)
    prod = client.get(f"/products/{prod_mov['id']}", headers=auth_headers).json()
    assert prod["quantidade_estoque"] == estoque_antes - qtd


def test_saida_insufficient_stock(client, auth_headers, prod_mov):
    resp = client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "SAIDA",
        "quantidade": 9999,
        "motivo": "Excede estoque",
    }, headers=auth_headers)
    assert resp.status_code == 400
    assert "insuficiente" in resp.json()["detail"].lower()


def test_create_devolucao(client, auth_headers, prod_mov):
    estoque_antes = prod_mov["quantidade_estoque"]
    resp = client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "DEVOLUCAO",
        "quantidade": 2,
        "motivo": "Cliente devolveu",
    }, headers=auth_headers)
    assert resp.status_code == 201
    prod = client.get(f"/products/{prod_mov['id']}", headers=auth_headers).json()
    assert prod["quantidade_estoque"] == estoque_antes + 2


def test_list_movements(client, auth_headers):
    resp = client.get("/movements/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_vendedor_cannot_create_movement(client, auth_headers, prod_mov):
    """RBAC: vendedor não pode registrar movimentação manual."""
    client.post("/users/", json={
        "nome": "Vend4", "email": "vend4@test.com",
        "username": "vend4", "password": "vend123", "role": "VENDEDOR",
    }, headers=auth_headers)
    login = client.post("/auth/login", json={"username": "vend4", "password": "vend123"})
    assert login.status_code == 200
    vend_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.post("/movements/", json={
        "product_id": prod_mov["id"],
        "tipo": "ENTRADA",
        "quantidade": 1,
        "motivo": "Tentativa bloqueada",
    }, headers=vend_headers)
    assert resp.status_code == 403


def test_movement_nonexistent_product(client, auth_headers):
    resp = client.post("/movements/", json={
        "product_id": 99999,
        "tipo": "ENTRADA",
        "quantidade": 1,
        "motivo": "Produto inexistente",
    }, headers=auth_headers)
    assert resp.status_code == 404
