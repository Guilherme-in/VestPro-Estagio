from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from typing import List, Optional
from datetime import datetime, date
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user, require_gerente_or_admin
from app.utils.external_api import get_exchange_rates

router = APIRouter(prefix="/reports", tags=["reports"])


def format_currency(value: float) -> str:
    """Format currency to Brazilian Real"""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# ─── Paleta de cores ─────────────────────────────────────────────────────────
_PRIMARY  = colors.HexColor('#4f46e5')
_DARK     = colors.HexColor('#1e293b')
_SLATE    = colors.HexColor('#64748b')
_ROW_ALT  = colors.HexColor('#f8fafc')
_BORDER   = colors.HexColor('#cbd5e1')
_GREEN    = colors.HexColor('#059669')
_AMBER    = colors.HexColor('#d97706')
_PURPLE   = colors.HexColor('#7c3aed')
_RED      = colors.HexColor('#dc2626')


def _page_footer(canvas, doc):
    """Rodapé com linha e número de página em todas as páginas."""
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(colors.HexColor('#e2e8f0'))
    canvas.setLineWidth(0.5)
    canvas.line(30, 32, w - 30, 32)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(_SLATE)
    canvas.drawString(30, 20, "VestPro – Sistema de Gestão de Estoque")
    canvas.drawRightString(w - 30, 20, f"Página {doc.page}")
    canvas.restoreState()


def _header_block(elements, title: str, store_name: str = "", subtitle: str = "", emission: str = ""):
    """Cabeçalho padronizado: marca | loja, título, subtítulo, data de emissão."""
    styles = getSampleStyleSheet()

    # Linha de marca
    brand_data = [["VestPro", store_name]]
    brand_t = Table(brand_data, colWidths=[3.5 * inch, 4 * inch])
    brand_t.setStyle(TableStyle([
        ('FONTNAME',  (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE',  (0, 0), (0, 0), 13),
        ('TEXTCOLOR', (0, 0), (0, 0), _PRIMARY),
        ('FONTSIZE',  (1, 0), (1, 0), 10),
        ('TEXTCOLOR', (1, 0), (1, 0), _SLATE),
        ('ALIGN',     (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN',    (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, _PRIMARY),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(brand_t)
    elements.append(Spacer(1, 0.18 * inch))

    # Título
    elements.append(Paragraph(title, ParagraphStyle(
        'RPTitle', fontName='Helvetica-Bold', fontSize=19,
        textColor=_DARK, spaceAfter=10, alignment=TA_CENTER)))

    if subtitle:
        elements.append(Paragraph(subtitle, ParagraphStyle(
            'RPSub', fontName='Helvetica', fontSize=11,
            textColor=_SLATE, spaceAfter=2, alignment=TA_CENTER)))

    if emission:
        elements.append(Paragraph(emission, ParagraphStyle(
            'RPEmit', fontName='Helvetica', fontSize=9,
            textColor=_SLATE, spaceAfter=0, alignment=TA_RIGHT)))

    elements.append(Spacer(1, 0.22 * inch))


def _summary_cards(elements, cards: list):
    """
    Renderiza cards de resumo lado a lado.
    cards = [{'label': str, 'value': str, 'color': HexColor}, ...]
    """
    n = len(cards)
    col_w = 7.5 * inch / n
    data = [[c['label'] for c in cards], [c['value'] for c in cards]]
    t = Table(data, colWidths=[col_w] * n)
    style_cmds = [
        ('ALIGN',   (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 16),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.white),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('ROWSPAN', (0, 0), (0, 0), 1),
    ]
    for i, card in enumerate(cards):
        style_cmds.append(('BACKGROUND', (i, 0), (i, -1), card['color']))
        if i < n - 1:
            style_cmds.append(('LINEAFTER', (i, 0), (i, -1), 2, colors.white))
    t.setStyle(TableStyle(style_cmds))
    elements.append(t)
    elements.append(Spacer(1, 0.25 * inch))


def _data_table(elements, data: list, col_widths: list, accent_color=None):
    """Tabela de dados com zebra e cabeçalho colorido."""
    accent = accent_color or _PRIMARY
    n_rows = len(data)
    row_bgs = []
    for i in range(1, n_rows):
        bg = colors.white if i % 2 == 1 else _ROW_ALT
        row_bgs.append(('BACKGROUND', (0, i), (-1, i), bg))

    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ('BACKGROUND',    (0, 0), (-1, 0), accent),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 9),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('TEXTCOLOR',     (0, 1), (-1, -1), colors.black),
        ('GRID',          (0, 0), (-1, -1), 0.4, _BORDER),
        ('LINEBELOW',     (0, 0), (-1, 0), 1.5, accent),
    ] + row_bgs
    t.setStyle(TableStyle(style_cmds))
    elements.append(t)


def generate_stock_pdf(report_data: List[dict], store_name: str = "") -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=36, leftMargin=36,
                            topMargin=36, bottomMargin=50)
    elements = []
    now = datetime.now()

    _header_block(
        elements,
        title="Relatório de Estoque Atual",
        store_name=store_name,
        emission=f"Data de Emissão: {now.strftime('%d/%m/%Y')} às {now.strftime('%H:%M:%S')}",
    )

    total_value = sum(i['preco'] * i['quantidade_estoque'] for i in report_data)
    baixo = sum(1 for i in report_data if i['baixo_estoque'])

    _summary_cards(elements, [
        {'label': 'Total de Produtos',       'value': str(len(report_data)), 'color': _PRIMARY},
        {'label': 'Itens com Baixo Estoque', 'value': str(baixo),            'color': _RED},
        {'label': 'Valor Total em Estoque',  'value': format_currency(total_value), 'color': _GREEN},
    ])

    table_data = [['Código', 'Nome', 'Categoria', 'Qtd', 'Mín.', 'Preço Unit.', 'Valor Total', 'Status']]
    for item in report_data:
        status = "BAIXO" if item['baixo_estoque'] else "OK"
        valor = item['preco'] * item['quantidade_estoque']
        table_data.append([
            item['codigo'],
            item['nome'][:28] if item['nome'] else '-',
            item['categoria'] or '-',
            str(item['quantidade_estoque']),
            str(item['estoque_minimo']),
            format_currency(item['preco']),
            format_currency(valor),
            status,
        ])

    _data_table(elements, table_data,
                [0.85*inch, 2*inch, 1*inch, 0.6*inch, 0.55*inch, 0.95*inch, 0.95*inch, 0.6*inch])

    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    buffer.seek(0)
    return buffer


def generate_sales_pdf(report_data: List[dict], start_date: date, end_date: date, store_name: str = "") -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=36, leftMargin=36,
                            topMargin=36, bottomMargin=50)
    elements = []
    now = datetime.now()

    _header_block(
        elements,
        title="Relatório de Vendas por Período",
        store_name=store_name,
        subtitle=f"Período: {start_date.strftime('%d/%m/%Y')} a {end_date.strftime('%d/%m/%Y')}",
        emission=f"Data de Emissão: {now.strftime('%d/%m/%Y')} às {now.strftime('%H:%M:%S')}",
    )

    total_units = sum(item['total_vendido'] for item in report_data)
    total_value = sum(item['valor_total'] for item in report_data)

    _summary_cards(elements, [
        {'label': 'Total de Unidades Vendidas', 'value': str(total_units),           'color': _PRIMARY},
        {'label': 'Valor Total das Vendas',     'value': format_currency(total_value), 'color': _GREEN},
    ])

    table_data = [['Código', 'Produto', 'Qtd. Vendida', 'Valor Total']]
    for item in report_data:
        table_data.append([
            item['product_codigo'],
            item['product_nome'][:42] if item['product_nome'] else '-',
            str(item['total_vendido']),
            format_currency(item['valor_total']),
        ])

    _data_table(elements, table_data,
                [1*inch, 3.2*inch, 1.4*inch, 1.4*inch])

    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    buffer.seek(0)
    return buffer


def generate_top_pdf(suppliers_data: List[dict], products_data: List[dict], store_name: str = "") -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=36, leftMargin=36,
                            topMargin=36, bottomMargin=50)
    elements = []
    now = datetime.now()

    _header_block(
        elements,
        title="Top Fornecedores e Produtos",
        store_name=store_name,
        emission=f"Data de Emissão: {now.strftime('%d/%m/%Y')} às {now.strftime('%H:%M:%S')}",
    )

    _summary_cards(elements, [
        {'label': 'Fornecedores rankeados', 'value': str(len(suppliers_data)), 'color': _PURPLE},
        {'label': 'Produtos rankeados',     'value': str(len(products_data)),  'color': _GREEN},
    ])

    # Seção: Top Fornecedores
    elements.append(Paragraph("Top 10 Fornecedores", ParagraphStyle(
        'S1', fontName='Helvetica-Bold', fontSize=13, textColor=_PURPLE,
        spaceBefore=4, spaceAfter=6)))

    sup_data = [['#', 'Fornecedor', 'Total de Entradas']]
    for idx, s in enumerate(suppliers_data, 1):
        sup_data.append([str(idx), s['supplier_nome'][:52] or '-', str(s['total_entradas'])])

    _data_table(elements, sup_data, [0.45*inch, 5*inch, 1.55*inch], accent_color=_PURPLE)
    elements.append(Spacer(1, 0.35*inch))

    # Seção: Top Produtos
    elements.append(Paragraph("Top 10 Produtos Mais Vendidos", ParagraphStyle(
        'S2', fontName='Helvetica-Bold', fontSize=13, textColor=_GREEN,
        spaceBefore=4, spaceAfter=6)))

    prod_data = [['#', 'Código', 'Produto', 'Total Vendido']]
    for idx, p in enumerate(products_data, 1):
        prod_data.append([
            str(idx),
            p['product_codigo'],
            p['product_nome'][:38] or '-',
            str(p['total_saidas']),
        ])

    _data_table(elements, prod_data, [0.45*inch, 1.3*inch, 3.7*inch, 1.55*inch], accent_color=_GREEN)

    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    buffer.seek(0)
    return buffer


@router.get("/stock", response_model=List[schemas.StockReportItem])
def get_stock_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    products = db.query(models.Product).filter(models.Product.tenant_id == current_user.tenant_id).all()
    report = []
    for product in products:
        margem = None
        if product.preco_custo and product.preco_custo > 0:
            margem = ((product.preco - product.preco_custo) / product.preco_custo) * 100
        report.append({
            "id": product.id,
            "nome": product.nome,
            "codigo": product.codigo,
            "categoria": product.categoria,
            "quantidade_estoque": product.quantidade_estoque,
            "estoque_minimo": product.estoque_minimo,
            "baixo_estoque": product.quantidade_estoque <= product.estoque_minimo,
            "preco": product.preco,
            "preco_custo": product.preco_custo,
            "margem_lucro": margem,
        })
    report.sort(key=lambda x: (not x["baixo_estoque"], x["quantidade_estoque"]))
    return report


@router.get("/sales", response_model=List[schemas.SalesReportItem])
def get_sales_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get sales report by period"""
    # Convert dates to datetime for comparison
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # Query sales (SAIDA movements) grouped by product
    sales = db.query(
        models.StockMovement.product_id,
        models.Product.nome.label("product_nome"),
        models.Product.codigo.label("product_codigo"),
        func.sum(models.StockMovement.quantidade).label("total_vendido"),
        (func.sum(models.StockMovement.quantidade) * models.Product.preco).label("valor_total")
    ).join(
        models.Product, models.StockMovement.product_id == models.Product.id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.SAIDA,
        models.StockMovement.created_at >= start_datetime,
        models.StockMovement.created_at <= end_datetime
    ).group_by(
        models.StockMovement.product_id,
        models.Product.nome,
        models.Product.codigo,
        models.Product.preco
    ).order_by(
        desc("total_vendido")
    ).all()

    return [
        {
            "product_id": sale.product_id,
            "product_nome": sale.product_nome,
            "product_codigo": sale.product_codigo,
            "total_vendido": sale.total_vendido,
            "valor_total": float(sale.valor_total)
        }
        for sale in sales
    ]


@router.get("/top-suppliers", response_model=List[schemas.TopSupplierItem])
def get_top_suppliers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get top suppliers by number of entries"""
    suppliers = db.query(
        models.Supplier.id.label("supplier_id"),
        models.Supplier.nome.label("supplier_nome"),
        func.count(models.StockMovement.id).label("total_entradas")
    ).join(
        models.StockMovement, models.Supplier.id == models.StockMovement.supplier_id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.ENTRADA
    ).group_by(
        models.Supplier.id,
        models.Supplier.nome
    ).order_by(
        desc("total_entradas")
    ).limit(10).all()
    
    return [
        {
            "supplier_id": supplier.supplier_id,
            "supplier_nome": supplier.supplier_nome,
            "total_entradas": supplier.total_entradas
        }
        for supplier in suppliers
    ]


@router.get("/top-products", response_model=List[schemas.TopProductItem])
def get_top_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get top selling products"""
    products = db.query(
        models.Product.id.label("product_id"),
        models.Product.nome.label("product_nome"),
        models.Product.codigo.label("product_codigo"),
        func.sum(models.StockMovement.quantidade).label("total_saidas")
    ).join(
        models.StockMovement, models.Product.id == models.StockMovement.product_id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.SAIDA
    ).group_by(
        models.Product.id,
        models.Product.nome,
        models.Product.codigo
    ).order_by(
        desc("total_saidas")
    ).limit(10).all()
    
    return [
        {
            "product_id": product.product_id,
            "product_nome": product.product_nome,
            "product_codigo": product.product_codigo,
            "total_saidas": product.total_saidas
        }
        for product in products
    ]


@router.get("/stock/pdf")
def export_stock_pdf(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export stock report as PDF"""
    # Get stock report data
    products = db.query(models.Product).filter(models.Product.tenant_id == current_user.tenant_id).all()

    report = []
    for product in products:
        report.append({
            "id": product.id,
            "nome": product.nome,
            "codigo": product.codigo,
            "categoria": product.categoria,
            "quantidade_estoque": product.quantidade_estoque,
            "estoque_minimo": product.estoque_minimo,
            "baixo_estoque": product.quantidade_estoque <= product.estoque_minimo,
            "preco": product.preco
        })
    
    # Sort by baixo_estoque (True first) then by quantidade_estoque
    report.sort(key=lambda x: (not x["baixo_estoque"], x["quantidade_estoque"]))
    
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    store_name = tenant.nome_loja if tenant else ""
    pdf_buffer = generate_stock_pdf(report, store_name=store_name)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_estoque_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
    )


@router.get("/sales/pdf")
def export_sales_pdf(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export sales report as PDF"""
    # Get sales report data
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    sales = db.query(
        models.StockMovement.product_id,
        models.Product.nome.label("product_nome"),
        models.Product.codigo.label("product_codigo"),
        func.sum(models.StockMovement.quantidade).label("total_vendido"),
        (func.sum(models.StockMovement.quantidade) * models.Product.preco).label("valor_total")
    ).join(
        models.Product, models.StockMovement.product_id == models.Product.id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.SAIDA,
        models.StockMovement.created_at >= start_datetime,
        models.StockMovement.created_at <= end_datetime
    ).group_by(
        models.StockMovement.product_id,
        models.Product.nome,
        models.Product.codigo,
        models.Product.preco
    ).order_by(
        desc("total_vendido")
    ).all()

    report_data = [
        {
            "product_id": sale.product_id,
            "product_nome": sale.product_nome,
            "product_codigo": sale.product_codigo,
            "total_vendido": sale.total_vendido,
            "valor_total": float(sale.valor_total)
        }
        for sale in sales
    ]
    
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    store_name = tenant.nome_loja if tenant else ""
    pdf_buffer = generate_sales_pdf(report_data, start_date, end_date, store_name=store_name)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_vendas_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.pdf"
        }
    )


@router.get("/top/pdf")
def export_top_pdf(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export top suppliers and products report as PDF"""
    # Get top suppliers data
    suppliers = db.query(
        models.Supplier.id.label("supplier_id"),
        models.Supplier.nome.label("supplier_nome"),
        func.count(models.StockMovement.id).label("total_entradas")
    ).join(
        models.StockMovement, models.Supplier.id == models.StockMovement.supplier_id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.ENTRADA
    ).group_by(
        models.Supplier.id,
        models.Supplier.nome
    ).order_by(
        desc("total_entradas")
    ).limit(10).all()

    suppliers_data = [
        {
            "supplier_id": supplier.supplier_id,
            "supplier_nome": supplier.supplier_nome,
            "total_entradas": supplier.total_entradas
        }
        for supplier in suppliers
    ]
    
    # Get top products data
    products = db.query(
        models.Product.id.label("product_id"),
        models.Product.nome.label("product_nome"),
        models.Product.codigo.label("product_codigo"),
        func.sum(models.StockMovement.quantidade).label("total_saidas")
    ).join(
        models.StockMovement, models.Product.id == models.StockMovement.product_id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.SAIDA
    ).group_by(
        models.Product.id,
        models.Product.nome,
        models.Product.codigo
    ).order_by(
        desc("total_saidas")
    ).limit(10).all()

    products_data = [
        {
            "product_id": product.product_id,
            "product_nome": product.product_nome,
            "product_codigo": product.product_codigo,
            "total_saidas": product.total_saidas
        }
        for product in products
    ]
    
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    store_name = tenant.nome_loja if tenant else ""
    pdf_buffer = generate_top_pdf(suppliers_data, products_data, store_name=store_name)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_top_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
    )


# ─── NOVO: Relatório Financeiro / Lucratividade ───────────────────────────────

@router.get("/financial", response_model=List[schemas.FinancialReportItem])
def get_financial_report(
    year: int = Query(default=None, description="Ano (padrão: ano atual)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    """Relatório financeiro mensal: vendas, devoluções e lucro bruto."""
    if year is None:
        year = datetime.now().year

    sales_by_month = db.query(
        extract("month", models.Sale.created_at).label("month"),
        func.sum(models.Sale.total).label("total_vendas"),
        func.count(models.Sale.id).label("num_vendas"),
    ).filter(
        models.Sale.tenant_id == current_user.tenant_id,
        extract("year", models.Sale.created_at) == year
    ).group_by("month").all()

    devolucoes_by_month = db.query(
        extract("month", models.StockMovement.created_at).label("month"),
        func.sum(models.StockMovement.quantidade * models.Product.preco).label("total_devolucoes"),
        func.count(models.StockMovement.id).label("num_devolucoes"),
    ).join(
        models.Product, models.StockMovement.product_id == models.Product.id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.DEVOLUCAO,
        extract("year", models.StockMovement.created_at) == year,
    ).group_by("month").all()

    month_names = [
        "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]

    sales_map = {int(r.month): (float(r.total_vendas or 0), int(r.num_vendas)) for r in sales_by_month}
    dev_map = {int(r.month): (float(r.total_devolucoes or 0), int(r.num_devolucoes)) for r in devolucoes_by_month}

    result = []
    for m in range(1, 13):
        tv, nv = sales_map.get(m, (0.0, 0))
        td, nd = dev_map.get(m, (0.0, 0))
        result.append(schemas.FinancialReportItem(
            period=f"{month_names[m]}/{year}",
            total_vendas=tv,
            total_devolucoes=td,
            lucro_bruto=tv - td,
            num_vendas=nv,
            num_devolucoes=nd,
        ))
    return result


# ─── NOVO: Relatório de Devoluções ───────────────────────────────────────────

@router.get("/devolutions", response_model=List[schemas.DevolutionReportItem])
def get_devolution_report(
    start_date: date = Query(..., description="Data inicial (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    """Relatório de devoluções por produto no período."""
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    rows = db.query(
        models.Product.id.label("product_id"),
        models.Product.nome.label("product_nome"),
        models.Product.codigo.label("product_codigo"),
        func.sum(models.StockMovement.quantidade).label("total_devolvido"),
        models.Product.preco.label("preco"),
    ).join(
        models.StockMovement, models.Product.id == models.StockMovement.product_id
    ).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.DEVOLUCAO,
        models.StockMovement.created_at >= start_dt,
        models.StockMovement.created_at <= end_dt,
    ).group_by(
        models.Product.id, models.Product.nome, models.Product.codigo, models.Product.preco
    ).order_by(desc("total_devolvido")).all()

    return [
        schemas.DevolutionReportItem(
            product_id=r.product_id,
            product_nome=r.product_nome,
            product_codigo=r.product_codigo,
            total_devolvido=r.total_devolvido,
            valor_estimado=float(r.total_devolvido * r.preco),
        )
        for r in rows
    ]


@router.get("/financial/pdf")
def export_financial_pdf(
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    if year is None:
        year = datetime.now().year

    sales_by_month = db.query(
        extract("month", models.Sale.created_at).label("month"),
        func.sum(models.Sale.total).label("total_vendas"),
        func.count(models.Sale.id).label("num_vendas"),
    ).filter(
        models.Sale.tenant_id == current_user.tenant_id,
        extract("year", models.Sale.created_at) == year
    ).group_by("month").all()

    devolucoes_by_month = db.query(
        extract("month", models.StockMovement.created_at).label("month"),
        func.sum(models.StockMovement.quantidade * models.Product.preco).label("total_devolucoes"),
        func.count(models.StockMovement.id).label("num_devolucoes"),
    ).join(models.Product, models.StockMovement.product_id == models.Product.id).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.DEVOLUCAO,
        extract("year", models.StockMovement.created_at) == year,
    ).group_by("month").all()

    month_names = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    sales_map = {int(r.month): (float(r.total_vendas or 0), int(r.num_vendas)) for r in sales_by_month}
    dev_map = {int(r.month): (float(r.total_devolucoes or 0), int(r.num_devolucoes)) for r in devolucoes_by_month}

    rows = []
    for m in range(1, 13):
        tv, nv = sales_map.get(m, (0.0, 0))
        td, nd = dev_map.get(m, (0.0, 0))
        rows.append({"period": f"{month_names[m]}/{year}", "total_vendas": tv, "total_devolucoes": td,
                     "lucro_bruto": tv - td, "num_vendas": nv, "num_devolucoes": nd})

    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    store_name = tenant.nome_loja if tenant else ""

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=50)
    elements = []
    _header_block(
        elements,
        title=f"Relatório Financeiro Mensal — {year}",
        store_name=store_name,
        emission=f"Emitido em: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    )

    total_v = sum(r['total_vendas'] for r in rows)
    total_d = sum(r['total_devolucoes'] for r in rows)
    _summary_cards(elements, [
        {'label': 'Total de Vendas',    'value': format_currency(total_v),        'color': _GREEN},
        {'label': 'Total de Devoluções','value': format_currency(total_d),        'color': _RED},
        {'label': 'Lucro Bruto',        'value': format_currency(total_v - total_d), 'color': _PRIMARY},
    ])

    table_data = [['Período', 'Vendas (R$)', 'Devoluções (R$)', 'Lucro Bruto (R$)', 'Nº Vnd.', 'Nº Dev.']]
    for r in rows:
        table_data.append([r['period'], format_currency(r['total_vendas']),
                           format_currency(r['total_devolucoes']), format_currency(r['lucro_bruto']),
                           str(r['num_vendas']), str(r['num_devolucoes'])])
    table_data.append(['TOTAL', format_currency(total_v), format_currency(total_d),
                       format_currency(total_v - total_d),
                       str(sum(r['num_vendas'] for r in rows)),
                       str(sum(r['num_devolucoes'] for r in rows))])

    _data_table(elements, table_data[:-1], [1.4*inch, 1.35*inch, 1.5*inch, 1.5*inch, 0.75*inch, 0.75*inch])

    # Totals row separately (highlighted)
    totals_t = Table([table_data[-1]], colWidths=[1.4*inch, 1.35*inch, 1.5*inch, 1.5*inch, 0.75*inch, 0.75*inch])
    totals_t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), _DARK),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 9),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID',          (0, 0), (-1, 0), 0.4, _BORDER),
    ]))
    elements.append(totals_t)
    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=relatorio_financeiro_{year}.pdf"})


@router.get("/devolutions/pdf")
def export_devolution_pdf(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_gerente_or_admin),
):
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    rows = db.query(
        models.Product.nome.label("product_nome"),
        models.Product.codigo.label("product_codigo"),
        func.sum(models.StockMovement.quantidade).label("total_devolvido"),
        models.Product.preco.label("preco"),
    ).join(models.StockMovement, models.Product.id == models.StockMovement.product_id).filter(
        models.StockMovement.tenant_id == current_user.tenant_id,
        models.StockMovement.tipo == models.MovementType.DEVOLUCAO,
        models.StockMovement.created_at >= start_dt,
        models.StockMovement.created_at <= end_dt,
    ).group_by(models.Product.id, models.Product.nome, models.Product.codigo, models.Product.preco
    ).order_by(desc("total_devolvido")).all()

    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    store_name = tenant.nome_loja if tenant else ""

    total_dev = sum(float(r.total_devolvido * r.preco) for r in rows)
    total_units = sum(r.total_devolvido for r in rows)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=50)
    elements = []
    _header_block(
        elements,
        title="Relatório de Devoluções",
        store_name=store_name,
        subtitle=f"Período: {start_date.strftime('%d/%m/%Y')} a {end_date.strftime('%d/%m/%Y')}",
        emission=f"Emitido em: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    )
    _summary_cards(elements, [
        {'label': 'Itens Devolvidos',   'value': str(total_units),           'color': _AMBER},
        {'label': 'Valor Total',        'value': format_currency(total_dev),  'color': _RED},
    ])

    table_data = [['Código', 'Produto', 'Qtd Devolvida', 'Valor Estimado']]
    for r in rows:
        table_data.append([r.product_codigo, r.product_nome[:45],
                           str(r.total_devolvido), format_currency(float(r.total_devolvido * r.preco))])

    _data_table(elements, table_data, [1.2*inch, 3.5*inch, 1.3*inch, 1.5*inch], accent_color=_AMBER)
    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=relatorio_devolucoes_{start_date}_{end_date}.pdf"})


# ─── API Externa: Cotação de Moedas (AwesomeAPI) ─────────────────────────────

@router.get("/exchange-rates", response_model=List[schemas.ExchangeRate])
async def get_exchange_rates_endpoint(
    current_user: models.User = Depends(get_current_user),
):
    """Retorna cotações em tempo real (USD, EUR, GBP) via AwesomeAPI."""
    return await get_exchange_rates()
