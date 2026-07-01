from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_gerente_or_admin, require_can_cancel_sales, log_audit

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("/", response_model=schemas.Sale, status_code=status.HTTP_201_CREATED)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tid = current_user.tenant_id

    if sale.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.id == sale.customer_id,
            models.Customer.tenant_id == tid
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")

    sale_items_data = []
    total = 0.0

    for item in sale.items:
        product = db.query(models.Product).filter(
            models.Product.id == item.product_id,
            models.Product.tenant_id == tid
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto com id {item.product_id} não encontrado")

        if product.quantidade_estoque < item.quantidade:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente para '{product.nome}'. Disponível: {product.quantidade_estoque}, Solicitado: {item.quantidade}"
            )

        subtotal = item.preco_unitario * item.quantidade
        total += subtotal
        sale_items_data.append({
            "product_id": item.product_id,
            "quantidade": item.quantidade,
            "preco_unitario": item.preco_unitario,
            "subtotal": subtotal
        })

    total -= sale.desconto

    db_sale = models.Sale(
        tenant_id=tid,
        customer_id=sale.customer_id,
        total=total,
        desconto=sale.desconto,
        forma_pagamento=sale.forma_pagamento,
        observacao=sale.observacao
    )
    db.add(db_sale)
    db.flush()

    for item_data in sale_items_data:
        db_item = models.SaleItem(sale_id=db_sale.id, **item_data)
        db.add(db_item)

        product = db.query(models.Product).filter(models.Product.id == item_data["product_id"]).first()
        product.quantidade_estoque -= item_data["quantidade"]

        db_movement = models.StockMovement(
            tenant_id=tid,
            product_id=item_data["product_id"],
            tipo=models.MovementType.SAIDA,
            quantidade=item_data["quantidade"],
            motivo="Venda",
            customer_id=sale.customer_id,
            observacao=f"Venda #{db_sale.id}"
        )
        db.add(db_movement)

    db.commit()
    db_sale = db.query(models.Sale).filter(models.Sale.id == db_sale.id).first()
    itens_desc = ", ".join(f"{i['quantidade']}x prod#{i['product_id']}" for i in sale_items_data)
    log_audit(db, current_user.id, tid, "CREATE", "sale", db_sale.id,
              f"Venda #{db_sale.id} — {sale.forma_pagamento} — R$ {db_sale.total:.2f} — {itens_desc}")
    return db_sale


@router.get("/", response_model=List[schemas.Sale])
def get_sales(
    skip: int = 0,
    limit: int = 100,
    customer_id: int = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from datetime import datetime
    query = db.query(models.Sale).filter(models.Sale.tenant_id == current_user.tenant_id)

    if customer_id:
        query = query.filter(models.Sale.customer_id == customer_id)
    if start_date:
        query = query.filter(models.Sale.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(models.Sale.created_at <= datetime.fromisoformat(end_date))

    return query.order_by(models.Sale.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{sale_id}", response_model=schemas.Sale)
def get_sale(sale_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sale = db.query(models.Sale).filter(
        models.Sale.id == sale_id,
        models.Sale.tenant_id == current_user.tenant_id
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return sale


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(sale_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_can_cancel_sales)):
    sale = db.query(models.Sale).filter(
        models.Sale.id == sale_id,
        models.Sale.tenant_id == current_user.tenant_id
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    sale_info = f"Venda #{sale_id} — R$ {sale.total:.2f}"
    for item in sale.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.quantidade_estoque += item.quantidade

    db.delete(sale)
    db.commit()
    log_audit(db, current_user.id, current_user.tenant_id, "DELETE", "sale", sale_id,
              f"Venda cancelada: {sale_info} — estoque restaurado")
    return None
