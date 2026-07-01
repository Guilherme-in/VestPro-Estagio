import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_password_hash, get_current_user, require_admin, log_audit

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.UserResponse, status_code=201)
def create_user(
    data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    tid = current_user.tenant_id
    if db.query(models.User).filter(
        models.User.tenant_id == tid,
        models.User.username == data.username
    ).first():
        raise HTTPException(status_code=400, detail="Username já em uso.")
    if db.query(models.User).filter(
        models.User.tenant_id == tid,
        models.User.email == data.email
    ).first():
        raise HTTPException(status_code=400, detail="E-mail já em uso.")

    user = models.User(
        tenant_id=tid,
        nome=data.nome,
        email=data.email,
        username=data.username,
        hashed_password=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, tid, "CREATE", "user", user.id, f"Funcionário criado: {user.nome} ({user.role})")
    return user


@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    users = db.query(models.User).filter(
        models.User.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit).all()
    return [schemas.UserResponse.from_orm_with_extras(u) for u in users]


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.tenant_id == current_user.tenant_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return user


@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    tid = current_user.tenant_id
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.tenant_id == tid
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    update_dict = data.model_dump(exclude_unset=True)
    if "password" in update_dict:
        update_dict["hashed_password"] = get_password_hash(update_dict.pop("password"))
    if "permissoes_extras" in update_dict:
        update_dict["permissoes_extras"] = json.dumps(update_dict["permissoes_extras"])

    diffs = []
    for field, new_val in update_dict.items():
        if field == "hashed_password":
            diffs.append("senha alterada")
            setattr(user, field, new_val)
            continue
        old_val = getattr(user, field, None)
        if old_val != new_val:
            if field == "permissoes_extras":
                diffs.append(f"permissoes_extras atualizadas")
            else:
                diffs.append(f"{field}: {old_val!r} → {new_val!r}")
        setattr(user, field, new_val)
    db.commit()
    db.refresh(user)
    if diffs:
        log_audit(db, current_user.id, tid, "UPDATE", "user", user.id,
                  f"Funcionário editado: {user.nome} — {'; '.join(diffs)}")
    return schemas.UserResponse.from_orm_with_extras(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Você não pode excluir seu próprio usuário.")
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.tenant_id == current_user.tenant_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    nome = user.nome
    tid = current_user.tenant_id
    db.delete(user)
    db.commit()
    log_audit(db, current_user.id, tid, "DELETE", "user", user_id, f"Funcionário excluído: {nome}")
