from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app import models, schemas
from app.database import get_db
from app.utils.auth import require_admin, require_can_view_audit

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/", response_model=List[schemas.AuditLogResponse])
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_can_view_audit),
):
    query = db.query(models.AuditLog).filter(models.AuditLog.tenant_id == current_user.tenant_id)

    if action:
        query = query.filter(models.AuditLog.action == action)
    if resource:
        query = query.filter(models.AuditLog.resource == resource)
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if start_date:
        query = query.filter(models.AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(models.AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))

    logs = query.order_by(models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for log in logs:
        item = schemas.AuditLogResponse.model_validate(log)
        item.user_nome = log.user.nome if log.user else "Sistema"
        result.append(item)
    return result
