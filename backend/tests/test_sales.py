"""Testes - Vendas e fluxo completo PDV."""
import pytest
import uuid


@pytest.fixture
def produto(client, auth_headers):
    """Cria produto com estoque para testes de venda."""
    code = f"VND-{uuid.uuid4().hex[:6].upper()}"
    resp = client.post("/products/", json={
        "nome": "Camiseta Venda",
        "codigo": code,
        "preco": 80.00,
        "preco_custo": 30.00,
        "quantidade_estoque": 50,
        "estoque_minimo": 5,
    }, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def cliente(client, auth_headers):
    resp = client.post("/customers/", json={"nome": "Cliente Venda"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()


def test_create_sale(client, auth_headers, produto):
    resp = client.post("/sales/", json={
        "items": [{"product_id": produto["id"], "quantidade": 2, "preco_unitario": 80.00}],
        "forma_pagamento": "dinheiro",
        "desconto": 0,
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["total"] == 160.00
    assert len(data["items"]) == 1


def test_sale_deducts_stock(client, auth_headers, produto):
    """Venda deve reduzir o estoque do produto."""
    estoque_antes = produto["quantidade_estoque"]
    qtd = 3
    client.post("/sales/", json={
        "items": [{"product_id": produto["id"], "quantidade": qtd, "preco_unitario": 80.00}],
        "forma_pagamento": "pix",
        "desconto": 0,
    }, headers=auth_headers)
    prod_after = client.get(f"/products/{produto['id']}", headers=auth_headers).json()
    assert prod_after["quantidade_estoque"] == estoque_antes - qtd


def test_sale_with_discount(client, auth_headers, produto):
    resp = client.post("/sales/", json={
        "items": [{"product_id": produto["id"], "quantidade": 1, "preco_unitario": 80.00}],
        "forma_pagamento": "cartao_credito",
        "desconto": 10.00,
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["total"] == 70.00


def test_sale_with_customer(client, auth_headers, produto, cliente):
    resp = client.post("/sales/", json={
        "items": [{"product_id": produto["id"], "quantidade": 1, "preco_unitario": 80.00}],
        "forma_pagamento": "dinheiro",
        "desconto": 0,
        "customer_id": cliente["id"],
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["customer_id"] == cliente["id"]


def test_list_sales(client, auth_headers):
    resp = client.get("/sales/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_sale_by_id(client, auth_headers, produto):
    create = client.post("/sales/", json={
        "items": [{"product_id": produto["id"], "quantidade": 1, "preco_unitario": 80.00}],
        "forma_pagamento": "dinheiro",
        "desconto": 0,
    }, headers=auth_headers)
    sid = create.json()["id"]
    resp = client.get(f"/sales/{sid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == sid


def test_cancel_sale_restores_stock(client, auth_headers, produto):
    """Cancelar venda deve devolver o estoque."""
    estoque_antes = client.get(f"/products/{produto['id']}", headers=auth_headers).json()["quantidade_estoque"]
    qtd = 2
    sale = client.post("/sales/", json={
        "items": [{"product_id": produto["id"], "quantidade": qtd, "preco_unitario": 80.00}],
        "forma_pagamento": "dinheiro",
        "desconto": 0,
    }, headers=auth_headers).json()

    client.delete(f"/sales/{sale['id']}", headers=auth_headers)
    estoque_depois = client.get(f"/products/{produto['id']}", headers=auth_headers).json()["quantidade_estoque"]
    assert estoque_depois == estoque_antes


def test_sale_nonexistent_product(client, auth_headers):
    resp = client.post("/sales/", json={
        "items": [{"product_id": 99999, "quantidade": 1, "preco_unitario": 10.00}],
        "forma_pagamento": "dinheiro",
        "desconto": 0,
    }, headers=auth_headers)
    assert resp.status_code == 404
