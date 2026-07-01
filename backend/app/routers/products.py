from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_admin, require_gerente_or_admin, require_can_manage_products, log_audit
from app.utils.s3 import upload_product_image, delete_product_image

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_manage_products),
):
    tid = current_user.tenant_id
    if db.query(models.Product).filter(
        models.Product.tenant_id == tid,
        models.Product.codigo == product.codigo
    ).first():
        raise HTTPException(status_code=400, detail=f"Produto com código {product.codigo} já existe")

    db_product = models.Product(**product.model_dump(), tenant_id=tid)
    db.add(db_product)
    db.flush()  # gera o id do produto

    # Registra entrada inicial se tiver estoque
    if db_product.quantidade_estoque and db_product.quantidade_estoque > 0:
        movimento = models.StockMovement(
            tenant_id=tid,
            product_id=db_product.id,
            tipo=models.MovementType.ENTRADA,
            quantidade=db_product.quantidade_estoque,
            motivo="Cadastro inicial do produto",
        )
        db.add(movimento)

    db.commit()
    db.refresh(db_product)
    log_audit(db, current_user.id, tid, "CREATE", "product", db_product.id, f"Produto criado: {db_product.nome} (cód. {db_product.codigo})")
    return db_product


@router.post("/{product_id}/image", response_model=schemas.Product)
async def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.tenant_id == current_user.tenant_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if product.image_url:
        delete_product_image(product.image_url)

    url = await upload_product_image(file)
    product.image_url = url
    db.commit()
    db.refresh(product)
    return product


@router.get("/", response_model=List[schemas.Product])
def list_products(
    skip: int = 0,
    limit: int = 100,
    categoria: Optional[str] = None,
    cor: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Product).filter(models.Product.tenant_id == current_user.tenant_id)
    if categoria:
        query = query.filter(models.Product.categoria == categoria)
    if cor:
        query = query.filter(models.Product.cor == cor)
    return query.offset(skip).limit(limit).all()


@router.get("/{product_id}", response_model=schemas.Product)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.tenant_id == current_user.tenant_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Produto com id {product_id} não encontrado")
    return product


@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product_update: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_manage_products),
):
    tid = current_user.tenant_id
    db_product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.tenant_id == tid
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail=f"Produto com id {product_id} não encontrado")

    if product_update.codigo and product_update.codigo != db_product.codigo:
        if db.query(models.Product).filter(
            models.Product.tenant_id == tid,
            models.Product.codigo == product_update.codigo
        ).first():
            raise HTTPException(status_code=400, detail=f"Código {product_update.codigo} já em uso")

    updates = product_update.model_dump(exclude_unset=True)
    diffs = []
    for field, new_val in updates.items():
        old_val = getattr(db_product, field, None)
        if old_val != new_val:
            diffs.append(f"{field}: {old_val!r} → {new_val!r}")
        setattr(db_product, field, new_val)

    db.commit()
    db.refresh(db_product)
    if diffs:
        log_audit(db, current_user.id, tid, "UPDATE", "product", db_product.id,
                  f"Produto editado: {db_product.nome} — {'; '.join(diffs)}")
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    tid = current_user.tenant_id
    db_product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.tenant_id == tid
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail=f"Produto com id {product_id} não encontrado")

    movements_count = db.query(models.StockMovement).filter(
        models.StockMovement.product_id == product_id,
        models.StockMovement.tenant_id == tid
    ).count()
    sale_items_count = db.query(models.SaleItem).filter(models.SaleItem.product_id == product_id).count()

    if movements_count > 0 or sale_items_count > 0:
        details = []
        if movements_count > 0:
            details.append(f"{movements_count} movimentação(ões)")
        if sale_items_count > 0:
            details.append(f"{sale_items_count} item(ns) de venda")
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir '{db_product.nome}' pois possui {', '.join(details)} relacionada(s)."
        )

    if db_product.image_url:
        delete_product_image(db_product.image_url)

    nome = db_product.nome
    pid = db_product.id
    db.delete(db_product)
    db.commit()
    log_audit(db, current_user.id, tid, "DELETE", "product", pid, f"Produto excluído: {nome}")
