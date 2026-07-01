from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_admin, get_password_hash, verify_password

router = APIRouter(prefix="/tenant", tags=["tenant"])


class TenantUpdate(BaseModel):
    nome_loja: str = Field(..., min_length=1, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    telefone: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = Field(None, max_length=300)


class ProfileUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=100)
    password_atual: Optional[str] = None
    password_nova: Optional[str] = Field(None, min_length=6)


@router.get("/me", response_model=schemas.TenantResponse)
def get_tenant(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Loja não encontrada.")
    return tenant


@router.put("/me", response_model=schemas.TenantResponse)
def update_tenant(
    data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Loja não encontrada.")
    tenant.nome_loja = data.nome_loja
    tenant.cnpj = data.cnpj
    tenant.telefone = data.telefone
    tenant.endereco = data.endereco
    db.commit()
    db.refresh(tenant)
    return tenant


@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if data.password_nova:
        if not data.password_atual:
            raise HTTPException(status_code=400, detail="Informe a senha atual para alterá-la.")
        if not verify_password(data.password_atual, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Senha atual incorreta.")

    if data.email and data.email != current_user.email:
        existing = db.query(models.User).filter(
            models.User.tenant_id == current_user.tenant_id,
            models.User.email == data.email,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="E-mail já em uso.")

    if data.nome:
        current_user.nome = data.nome
    if data.email:
        current_user.email = data.email
    if data.password_nova:
        current_user.hashed_password = get_password_hash(data.password_nova)

    db.commit()
    db.refresh(current_user)

    user_data = schemas.UserResponse.model_validate(current_user)
    user_data.nome_loja = current_user.tenant.nome_loja if current_user.tenant else None
    return user_data


@router.get("/stats")
def get_tenant_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Estatísticas gerais da loja para a tela de configurações."""
    tid = current_user.tenant_id
    total_users = db.query(models.User).filter(models.User.tenant_id == tid).count()
    total_products = db.query(models.Product).filter(models.Product.tenant_id == tid).count()
    total_sales = db.query(models.Sale).filter(models.Sale.tenant_id == tid).count()
    total_customers = db.query(models.Customer).filter(models.Customer.tenant_id == tid).count()
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tid).first()

    return {
        "nome_loja": tenant.nome_loja if tenant else "",
        "created_at": tenant.created_at if tenant else None,
        "total_users": total_users,
        "total_products": total_products,
        "total_sales": total_sales,
        "total_customers": total_customers,
    }
