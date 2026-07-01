from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_gerente_or_admin, require_can_move_stock, log_audit

router = APIRouter(prefix="/movements", tags=["movements"])


@router.post("/", response_model=schemas.StockMovement, status_code=status.HTTP_201_CREATED)
def create_movement(
    movement: schemas.StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_move_stock),
):
    tid = current_user.tenant_id
    product = db.query(models.Product).filter(
        models.Product.id == movement.product_id,
        models.Product.tenant_id == tid
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if movement.customer_id:
        if not db.query(models.Customer).filter(
            models.Customer.id == movement.customer_id,
            models.Customer.tenant_id == tid
        ).first():
            raise HTTPException(status_code=404, detail="Cliente não encontrado")

    if movement.supplier_id:
        if not db.query(models.Supplier).filter(
            models.Supplier.id == movement.supplier_id,
            models.Supplier.tenant_id == tid
        ).first():
            raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    if movement.tipo == models.MovementType.SAIDA:
        if product.quantidade_estoque < movement.quantidade:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente. Disponível: {product.quantidade_estoque}, Solicitado: {movement.quantidade}"
            )
        product.quantidade_estoque -= movement.quantidade
    elif movement.tipo == models.MovementType.ENTRADA:
        product.quantidade_estoque += movement.quantidade
    elif movement.tipo == models.MovementType.DEVOLUCAO:
        product.quantidade_estoque += movement.quantidade

    db_movement = models.StockMovement(**movement.model_dump(), tenant_id=tid)
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    log_audit(db, current_user.id, tid, "CREATE", "movement", db_movement.id,
              f"Movimentação {movement.tipo} — {movement.quantidade} un. prod#{movement.product_id} — {movement.motivo or ''}")
    return db_movement


@router.get("/", response_model=List[schemas.StockMovement])
def get_movements(
    skip: int = 0,
    limit: int = 100,
    product_id: int = None,
    tipo: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.StockMovement).filter(models.StockMovement.tenant_id == current_user.tenant_id)
    if product_id:
        query = query.filter(models.StockMovement.product_id == product_id)
    if tipo:
        query = query.filter(models.StockMovement.tipo == tipo)
    return query.order_by(models.StockMovement.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{movement_id}", response_model=schemas.StockMovement)
def get_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    movement = db.query(models.StockMovement).filter(
        models.StockMovement.id == movement_id,
        models.StockMovement.tenant_id == current_user.tenant_id
    ).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    return movement
