import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    import warnings
    SECRET_KEY = "vestpro-secret-key-dev-only"
    warnings.warn(
        "SECRET_KEY não definida no .env — usando chave padrão insegura. "
        "Defina SECRET_KEY antes de ir para produção.",
        stacklevel=2,
    )
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None or not user.ativo:
        raise credentials_exception
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem realizar esta ação."
        )
    return current_user


def log_audit(db, user_id: int, tenant_id: int, action: str, resource: str, resource_id: int = None, details: str = None, ip: str = None):
    from app.models import AuditLog
    db.add(AuditLog(
        user_id=user_id, tenant_id=tenant_id,
        action=action, resource=resource,
        resource_id=resource_id, details=details, ip_address=ip,
    ))
    db.commit()


def get_extra_perms(user: models.User) -> list:
    import json
    try:
        return json.loads(user.permissoes_extras or '[]')
    except Exception:
        return []


def has_extra_perm(user: models.User, perm: str) -> bool:
    return perm in get_extra_perms(user)


def require_gerente_or_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.GERENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas gerentes e administradores podem realizar esta ação."
        )
    return current_user


def _perm_dependency(perm: str, detail: str):
    """Cria uma dependência FastAPI que aceita: ADMIN, GERENTE, ou usuário com permissão extra."""
    def dependency(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role == models.UserRole.ADMIN:
            return current_user
        if current_user.role == models.UserRole.GERENTE:
            return current_user
        if has_extra_perm(current_user, perm):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado. {detail}",
        )
    return dependency


# Dependências nomeadas por permissão
require_can_cancel_sales     = _perm_dependency("cancelar_vendas",         "Permissão 'cancelar_vendas' necessária.")
require_can_manage_products  = _perm_dependency("cadastrar_produtos",      "Permissão 'cadastrar_produtos' necessária.")
require_can_move_stock       = _perm_dependency("movimentacao_estoque",    "Permissão 'movimentacao_estoque' necessária.")
require_can_manage_clients   = _perm_dependency("gerenciar_clientes",      "Permissão 'gerenciar_clientes' necessária.")
require_can_view_reports     = _perm_dependency("ver_relatorios",          "Permissão 'ver_relatorios' necessária.")
require_can_view_audit       = _perm_dependency("ver_auditoria",           "Permissão 'ver_auditoria' necessária.")
