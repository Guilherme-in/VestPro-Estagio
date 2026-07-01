from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_gerente_or_admin, log_audit

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("/", response_model=List[schemas.Supplier])
def get_suppliers(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Supplier).filter(
        models.Supplier.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit).all()


@router.get("/{supplier_id}", response_model=schemas.Supplier)
def get_supplier(
    supplier_id: int, db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.tenant_id == current_user.tenant_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return supplier


@router.post("/", response_model=schemas.Supplier, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier: schemas.SupplierCreate, db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    tid = current_user.tenant_id
    if supplier.cnpj:
        if db.query(models.Supplier).filter(
            models.Supplier.tenant_id == tid,
            models.Supplier.cnpj == supplier.cnpj
        ).first():
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    db_supplier = models.Supplier(**supplier.model_dump(), tenant_id=tid)
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    log_audit(db, current_user.id, tid, "CREATE", "supplier", db_supplier.id, f"Fornecedor criado: {db_supplier.nome}")
    return db_supplier


@router.put("/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(
    supplier_id: int, supplier: schemas.SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    tid = current_user.tenant_id
    db_supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.tenant_id == tid
    ).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    if supplier.cnpj and supplier.cnpj != db_supplier.cnpj:
        if db.query(models.Supplier).filter(
            models.Supplier.tenant_id == tid,
            models.Supplier.cnpj == supplier.cnpj
        ).first():
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    diffs = []
    for field, new_val in supplier.model_dump(exclude_unset=True).items():
        old_val = getattr(db_supplier, field, None)
        if old_val != new_val:
            diffs.append(f"{field}: {old_val!r} → {new_val!r}")
        setattr(db_supplier, field, new_val)
    db.commit()
    db.refresh(db_supplier)
    if diffs:
        log_audit(db, current_user.id, tid, "UPDATE", "supplier", db_supplier.id,
                  f"Fornecedor editado: {db_supplier.nome} — {'; '.join(diffs)}")
    return db_supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int, db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    db_supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.tenant_id == current_user.tenant_id
    ).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    nome = db_supplier.nome
    sid = db_supplier.id
    tid = current_user.tenant_id
    db.delete(db_supplier)
    db.commit()
    log_audit(db, current_user.id, tid, "DELETE", "supplier", sid, f"Fornecedor excluído: {nome}")
