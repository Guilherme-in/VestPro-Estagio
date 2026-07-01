from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_admin, require_gerente_or_admin

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("/", response_model=schemas.Category, status_code=201)
def create_category(
    data: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    tid = current_user.tenant_id
    if db.query(models.Category).filter(
        models.Category.tenant_id == tid,
        models.Category.nome == data.nome
    ).first():
        raise HTTPException(status_code=400, detail="Categoria com este nome já existe.")
    cat = models.Category(**data.model_dump(), tenant_id=tid)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/", response_model=List[schemas.Category])
def list_categories(
    skip: int = 0,
    limit: int = 100,
    ativo: bool = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Category).filter(models.Category.tenant_id == current_user.tenant_id)
    if ativo is not None:
        query = query.filter(models.Category.ativo == ativo)
    return query.offset(skip).limit(limit).all()


@router.get("/{category_id}", response_model=schemas.Category)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.tenant_id == current_user.tenant_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return cat


@router.put("/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: int,
    data: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    tid = current_user.tenant_id
    cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.tenant_id == tid
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    if data.nome and data.nome != cat.nome:
        if db.query(models.Category).filter(
            models.Category.tenant_id == tid,
            models.Category.nome == data.nome
        ).first():
            raise HTTPException(status_code=400, detail="Já existe uma categoria com este nome.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.tenant_id == current_user.tenant_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    db.delete(cat)
    db.commit()
