from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_gerente_or_admin, require_can_manage_clients, log_audit

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=List[schemas.Customer])
def get_customers(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Customer).filter(
        models.Customer.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit).all()


@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(
    customer_id: int, db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.tenant_id == current_user.tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return customer


@router.post("/", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer: schemas.CustomerCreate, db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_manage_clients),
):
    tid = current_user.tenant_id
    if customer.cpf:
        if db.query(models.Customer).filter(
            models.Customer.tenant_id == tid,
            models.Customer.cpf == customer.cpf
        ).first():
            raise HTTPException(status_code=400, detail="CPF já cadastrado")
    db_customer = models.Customer(**customer.model_dump(), tenant_id=tid)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    log_audit(db, current_user.id, tid, "CREATE", "customer", db_customer.id, f"Cliente criado: {db_customer.nome}")
    return db_customer


@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int, customer: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_manage_clients),
):
    tid = current_user.tenant_id
    db_customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.tenant_id == tid
    ).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if customer.cpf and customer.cpf != db_customer.cpf:
        if db.query(models.Customer).filter(
            models.Customer.tenant_id == tid,
            models.Customer.cpf == customer.cpf
        ).first():
            raise HTTPException(status_code=400, detail="CPF já cadastrado")
    diffs = []
    for field, new_val in customer.model_dump(exclude_unset=True).items():
        old_val = getattr(db_customer, field, None)
        if old_val != new_val:
            diffs.append(f"{field}: {old_val!r} → {new_val!r}")
        setattr(db_customer, field, new_val)
    db.commit()
    db.refresh(db_customer)
    if diffs:
        log_audit(db, current_user.id, tid, "UPDATE", "customer", db_customer.id,
                  f"Cliente editado: {db_customer.nome} — {'; '.join(diffs)}")
    return db_customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int, db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_manage_clients),
):
    db_customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.tenant_id == current_user.tenant_id
    ).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    nome = db_customer.nome
    cid = db_customer.id
    tid = current_user.tenant_id
    db.delete(db_customer)
    db.commit()
    log_audit(db, current_user.id, tid, "DELETE", "customer", cid, f"Cliente excluído: {nome}")
