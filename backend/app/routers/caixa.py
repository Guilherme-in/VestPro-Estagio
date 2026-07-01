from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, log_audit

router = APIRouter(prefix="/caixa", tags=["caixa"])


@router.get("/hoje", response_model=List[schemas.CaixaResponse])
def get_hoje(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    registros = db.query(models.CaixaRegistro).filter(
        models.CaixaRegistro.tenant_id == current_user.tenant_id,
        models.CaixaRegistro.created_at >= today_start,
    ).order_by(models.CaixaRegistro.created_at).all()

    result = []
    for r in registros:
        user_nome = r.user.nome if r.user else None
        result.append(schemas.CaixaResponse(
            id=r.id, tipo=r.tipo, valor=r.valor, observacao=r.observacao,
            created_at=r.created_at, user_nome=user_nome,
        ))
    return result


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    registros = db.query(models.CaixaRegistro).filter(
        models.CaixaRegistro.tenant_id == current_user.tenant_id,
        models.CaixaRegistro.created_at >= today_start,
    ).order_by(models.CaixaRegistro.created_at).all()

    if not registros:
        return {"aberto": False, "abertura_valor": 0.0, "ultimo_tipo": None}

    ultimo = registros[-1]
    abertura = next((r for r in registros if r.tipo == "abertura"), None)
    return {
        "aberto": ultimo.tipo != "fechamento",
        "abertura_valor": abertura.valor if abertura else 0.0,
        "ultimo_tipo": ultimo.tipo,
        "total_registros": len(registros),
    }


@router.post("/", response_model=schemas.CaixaResponse)
def create_registro(
    data: schemas.CaixaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    registros_hoje = db.query(models.CaixaRegistro).filter(
        models.CaixaRegistro.tenant_id == current_user.tenant_id,
        models.CaixaRegistro.created_at >= today_start,
    ).order_by(models.CaixaRegistro.created_at).all()

    if data.tipo == "abertura" and registros_hoje:
        raise HTTPException(status_code=400, detail="Caixa já foi aberto hoje.")

    if data.tipo != "abertura" and not registros_hoje:
        raise HTTPException(status_code=400, detail="Caixa não foi aberto hoje.")

    if registros_hoje and registros_hoje[-1].tipo == "fechamento":
        raise HTTPException(status_code=400, detail="Caixa já foi fechado hoje.")

    registro = models.CaixaRegistro(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        tipo=data.tipo,
        valor=data.valor,
        observacao=data.observacao,
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)

    tipo_label = {"abertura": "Abertura", "fechamento": "Fechamento", "sangria": "Sangria", "suprimento": "Reforço"}.get(data.tipo, data.tipo)
    log_audit(db, current_user.id, current_user.tenant_id, data.tipo.upper(), "caixa", registro.id,
              f"{tipo_label} de caixa — R$ {data.valor:.2f}{' — ' + data.observacao if data.observacao else ''}")
    return schemas.CaixaResponse(
        id=registro.id, tipo=registro.tipo, valor=registro.valor,
        observacao=registro.observacao, created_at=registro.created_at,
        user_nome=current_user.nome,
    )


@router.get("/resumo-pagamentos")
def get_resumo_pagamentos(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retorna totais por forma de pagamento em um período."""
    hoje = date.today()
    start = datetime.combine(
        date.fromisoformat(start_date) if start_date else hoje,
        datetime.min.time()
    )
    end = datetime.combine(
        date.fromisoformat(end_date) if end_date else hoje,
        datetime.max.time()
    )

    vendas = db.query(models.Sale).filter(
        models.Sale.tenant_id == current_user.tenant_id,
        models.Sale.created_at >= start,
        models.Sale.created_at <= end,
    ).all()

    totais: dict = {}
    for v in vendas:
        fp = v.forma_pagamento or "dinheiro"
        if fp not in totais:
            totais[fp] = {"forma_pagamento": fp, "total": 0.0, "quantidade": 0}
        totais[fp]["total"] += v.total
        totais[fp]["quantidade"] += 1

    grand_total = sum(t["total"] for t in totais.values())
    result = []
    for t in sorted(totais.values(), key=lambda x: -x["total"]):
        t["percentual"] = round((t["total"] / grand_total * 100) if grand_total else 0, 1)
        result.append(t)

    return {
        "items": result,
        "total": grand_total,
        "num_vendas": len(vendas),
        "start_date": start.date().isoformat(),
        "end_date": end.date().isoformat(),
    }


@router.get("/historico")
def get_historico(
    dias: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retorna resumo diário dos últimos N dias."""
    result = []
    hoje = date.today()
    for i in range(dias - 1, -1, -1):
        d = hoje - timedelta(days=i)
        start = datetime.combine(d, datetime.min.time())
        end = datetime.combine(d, datetime.max.time())

        registros = db.query(models.CaixaRegistro).filter(
            models.CaixaRegistro.tenant_id == current_user.tenant_id,
            models.CaixaRegistro.created_at >= start,
            models.CaixaRegistro.created_at <= end,
        ).order_by(models.CaixaRegistro.created_at).all()

        # Vendas do dia
        vendas = db.query(models.Sale).filter(
            models.Sale.tenant_id == current_user.tenant_id,
            models.Sale.created_at >= start,
            models.Sale.created_at <= end,
        ).all()

        abertura_reg = next((r for r in registros if r.tipo == "abertura"), None)
        fechamento_reg = next((r for r in registros if r.tipo == "fechamento"), None)
        total_vendas = sum(v.total for v in vendas)
        total_sangrias = sum(r.valor for r in registros if r.tipo == "sangria")
        total_suprimentos = sum(r.valor for r in registros if r.tipo == "suprimento")
        saldo = (abertura_reg.valor if abertura_reg else 0) + total_vendas + total_suprimentos - total_sangrias

        result.append({
            "data": d.isoformat(),
            "dia_semana": d.strftime("%a"),
            "aberto": abertura_reg is not None,
            "fechado": fechamento_reg is not None,
            "abertura_valor": abertura_reg.valor if abertura_reg else None,
            "fechamento_valor": fechamento_reg.valor if fechamento_reg else None,
            "total_vendas": total_vendas,
            "num_vendas": len(vendas),
            "total_sangrias": total_sangrias,
            "total_suprimentos": total_suprimentos,
            "saldo_esperado": saldo if abertura_reg else None,
            "diferenca": (fechamento_reg.valor - saldo) if (fechamento_reg and abertura_reg) else None,
        })
    return result
