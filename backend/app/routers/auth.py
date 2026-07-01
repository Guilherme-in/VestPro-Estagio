from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.utils.auth import (
    verify_password, get_password_hash, create_access_token, get_current_user, log_audit
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(request: Request, body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Usuário desativado. Contate o administrador.")

    token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "tenant_id": user.tenant_id,
    })
    log_audit(db, user.id, user.tenant_id, "LOGIN", "auth", details=f"Login: {user.username}", ip=request.client.host if request.client else None)

    user_data = schemas.UserResponse.model_validate(user)
    user_data.nome_loja = user.tenant.nome_loja if user.tenant else None

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
    }


@router.post("/register", response_model=schemas.Token, status_code=201)
def register_admin(request: Request, body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """
    Cria uma nova loja (tenant) com seu administrador.
    Cada admin que se registra cria um ambiente isolado.
    """
    # Verifica se username/email já existem (em qualquer tenant)
    if db.query(models.User).filter(models.User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username já em uso.")
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=400, detail="E-mail já em uso.")

    # Cria o novo tenant (loja)
    tenant = models.Tenant(nome_loja=body.nome_loja)
    db.add(tenant)
    db.flush()  # gera o tenant.id sem commitar

    # Cria o admin vinculado ao tenant
    user = models.User(
        tenant_id=tenant.id,
        nome=body.nome,
        email=body.email,
        username=body.username,
        hashed_password=get_password_hash(body.password),
        role=models.UserRole.ADMIN,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, user.id, tenant.id, "REGISTER", "auth", details=f"Nova loja criada: {body.nome_loja}", ip=request.client.host if request.client else None)

    token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "tenant_id": user.tenant_id,
    })

    user_data = schemas.UserResponse.model_validate(user)
    user_data.nome_loja = tenant.nome_loja

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    user_data = schemas.UserResponse.model_validate(current_user)
    user_data.nome_loja = current_user.tenant.nome_loja if current_user.tenant else None
    return user_data
