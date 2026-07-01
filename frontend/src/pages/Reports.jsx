import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import './Reports.css';

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

const QUICK_PERIODS = [
    { label: 'Hoje', start: () => today(), end: () => today() },
    { label: 'Esta semana', start: () => daysAgo(6), end: () => today() },
    { label: 'Este mês', start: () => new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().split('T')[0], end: () => today() },
    { label: 'Este ano', start: () => `${new Date().getFullYear()}-01-01`, end: () => today() },
];

function BarChart({ value, max }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden', minWidth: '60px' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '999px', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '24px' }}>{value}</span>
        </div>
    );
}

function Reports() {
    const [activeTab, setActiveTab] = useState('stock');
    const [stockReport, setStockReport] = useState([]);
    const [salesReport, setSalesReport] = useState([]);
    const [topSuppliers, setTopSuppliers] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [financialReport, setFinancialReport] = useState([]);
    const [devolutionReport, setDevolutionReport] = useState([]);
    const [exchangeRates, setExchangeRates] = useState([]);
    const [financialYear, setFinancialYear] = useState(new Date().getFullYear());
    const [devDateRange, setDevDateRange] = useState({ startDate: daysAgo(30), endDate: today() });
    const [loading, setLoading] = useState(false);
    const [priceSort, setPriceSort] = useState('nome');
    const [priceCategoryFilter, setPriceCategoryFilter] = useState('');
    const [dateRange, setDateRange] = useState({ startDate: daysAgo(30), endDate: today() });
    const [quickPeriod, setQuickPeriod] = useState(null);

    useEffect(() => {
        loadStockReport();
        loadTopSuppliers();
        loadTopProducts();
        loadExchangeRates();
    }, []);

    const loadStockReport = async () => {
        try {
            setLoading(true);
            const response = await reportsAPI.getStockReport();
            setStockReport(response.data);
        } catch (error) {
            console.error('Error loading stock report:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSalesReport = async (range) => {
        try {
            setLoading(true);
            const r = range || dateRange;
            const response = await reportsAPI.getSalesReport(r.startDate, r.endDate);
            setSalesReport(response.data);
        } catch (error) {
            console.error('Error loading sales report:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTopSuppliers = async () => {
        try { const r = await reportsAPI.getTopSuppliers(); setTopSuppliers(r.data); } catch {}
    };

    const loadTopProducts = async () => {
        try { const r = await reportsAPI.getTopProducts(); setTopProducts(r.data); } catch {}
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange((prev) => ({ ...prev, [name]: value }));
        setQuickPeriod(null);
    };

    const handleQuickPeriod = (opt, idx) => {
        const range = { startDate: opt.start(), endDate: opt.end() };
        setDateRange(range);
        setQuickPeriod(idx);
        setActiveTab('sales');
        loadSalesReport(range);
    };

    const handleLoadSalesReport = () => {
        loadSalesReport();
        setActiveTab('sales');
    };

    const handleExportStockPDF = async () => {
        try {
            const response = await reportsAPI.exportStockPDF();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_estoque_${today()}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
        } catch { alert('Erro ao exportar PDF. Tente novamente.'); }
    };

    const handleExportSalesPDF = async () => {
        try {
            const response = await reportsAPI.exportSalesPDF(dateRange.startDate, dateRange.endDate);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_vendas_${dateRange.startDate}_${dateRange.endDate}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
        } catch { alert('Erro ao exportar PDF. Verifique se há vendas no período selecionado.'); }
    };

    const handleExportTopPDF = async () => {
        try {
            const response = await reportsAPI.exportTopPDF();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_top_${today()}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
        } catch { alert('Erro ao exportar PDF. Tente novamente.'); }
    };

    const handleExportFinancialPDF = async () => {
        try {
            const response = await reportsAPI.exportFinancialPDF(financialYear);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_financeiro_${financialYear}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
        } catch { alert('Erro ao exportar PDF. Tente novamente.'); }
    };

    const handleExportDevolutionPDF = async () => {
        try {
            const response = await reportsAPI.exportDevolutionPDF(devDateRange.startDate, devDateRange.endDate);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_devolucoes_${devDateRange.startDate}_${devDateRange.endDate}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
        } catch { alert('Erro ao exportar PDF. Tente novamente.'); }
    };

    const loadFinancialReport = async () => {
        try {
            setLoading(true);
            const r = await reportsAPI.getFinancialReport(financialYear);
            setFinancialReport(r.data);
        } catch {} finally { setLoading(false); }
    };

    const loadDevolutionReport = async () => {
        try {
            setLoading(true);
            const r = await reportsAPI.getDevolutionReport(devDateRange.startDate, devDateRange.endDate);
            setDevolutionReport(r.data);
        } catch {} finally { setLoading(false); }
    };

    const loadExchangeRates = async () => {
        try { const r = await reportsAPI.getExchangeRates(); setExchangeRates(r.data); } catch {}
    };

    // ── Exportar CSV ─────────────────────────────────────────────────────────
    const exportCSV = (rows, headers, filename) => {
        const sep = ';';
        const headerLine = headers.map(h => h.label).join(sep);
        const lines = rows.map(r => headers.map(h => {
            const v = h.fn ? h.fn(r) : (r[h.key] ?? '');
            return String(v).replace(/;/g, ',');
        }).join(sep));
        const csv = '﻿' + [headerLine, ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = filename; a.click(); URL.revokeObjectURL(url);
    };

    const exportStockCSV = () => exportCSV(stockReport, [
        { label: 'Código', key: 'codigo' },
        { label: 'Produto', key: 'nome' },
        { label: 'Categoria', key: 'categoria' },
        { label: 'Qtd Estoque', key: 'quantidade_estoque' },
        { label: 'Est. Mínimo', key: 'estoque_minimo' },
        { label: 'Preço Venda', fn: r => r.preco?.toFixed(2).replace('.', ',') },
        { label: 'Preço Custo', fn: r => r.preco_custo?.toFixed(2).replace('.', ',') ?? '' },
        { label: 'Margem %', fn: r => r.margem_lucro?.toFixed(1).replace('.', ',') ?? '' },
        { label: 'Status', fn: r => r.baixo_estoque ? 'Baixo' : 'OK' },
    ], `estoque_${today()}.csv`);

    const exportSalesCSV = () => exportCSV(salesReport, [
        { label: 'Código', key: 'product_codigo' },
        { label: 'Produto', key: 'product_nome' },
        { label: 'Qtd Vendida', key: 'total_vendido' },
        { label: 'Valor Total', fn: r => r.valor_total?.toFixed(2).replace('.', ',') },
    ], `vendas_${dateRange.startDate}_${dateRange.endDate}.csv`);

    // Lucratividade por produto (estoque com margem)
    const rentabilityData = stockReport
        .filter(p => p.preco_custo && p.preco_custo > 0)
        .sort((a, b) => (b.margem_lucro || 0) - (a.margem_lucro || 0));

    // Cálculos estoque
    const stockTotalValue = stockReport.reduce((s, i) => s + i.preco * i.quantidade_estoque, 0);
    const stockLowCount = stockReport.filter(i => i.baixo_estoque).length;

    // Variação mensal financeiro
    const financialWithVariation = financialReport.map((row, i) => {
        if (i === 0) return { ...row, variacao: null };
        const prev = financialReport[i - 1].lucro_bruto;
        if (prev === 0) return { ...row, variacao: null };
        return { ...row, variacao: ((row.lucro_bruto - prev) / Math.abs(prev)) * 100 };
    });

    const maxSupplier = topSuppliers.length > 0 ? Math.max(...topSuppliers.map(s => s.total_entradas)) : 1;
    const maxProduct = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.total_saidas)) : 1;

    return (
        <div className="reports-page fade-in">
            <div className="page-header">
                <h1>Relatórios</h1>
                <p className="text-muted">Análises e estatísticas do sistema</p>
            </div>

            {/* Atalhos de período rápido */}
            <div className="card mb-xl">
                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        ⚡ Acesso rápido:
                    </span>
                    {QUICK_PERIODS.map((opt, idx) => (
                        <button key={idx} onClick={() => handleQuickPeriod(opt, idx)} style={{
                            padding: '0.4rem 1rem', borderRadius: '999px',
                            border: '1px solid var(--border)',
                            background: quickPeriod === idx ? 'var(--primary)' : 'transparent',
                            color: quickPeriod === idx ? '#fff' : 'var(--text-secondary)',
                            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        }}>{opt.label}</button>
                    ))}
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>📦 Estoque</button>
                <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>💰 Vendas</button>
                <button className={`tab ${activeTab === 'top' ? 'active' : ''}`} onClick={() => setActiveTab('top')}>🏆 Top</button>
                <button className={`tab ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => { setActiveTab('financial'); loadFinancialReport(); }}>💹 Financeiro</button>
                <button className={`tab ${activeTab === 'rentability' ? 'active' : ''}`} onClick={() => setActiveTab('rentability')}>📊 Lucratividade</button>
                <button className={`tab ${activeTab === 'devolutions' ? 'active' : ''}`} onClick={() => { setActiveTab('devolutions'); loadDevolutionReport(); }}>🔄 Devoluções</button>
                <button className={`tab ${activeTab === 'exchange' ? 'active' : ''}`} onClick={() => { setActiveTab('exchange'); loadExchangeRates(); }}>💱 Cotações</button>
                <button className={`tab ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => setActiveTab('prices')}>🏷️ Preços</button>
            </div>

            {loading && <div className="loading-container"><div className="spinner"></div></div>}

            {/* ── ESTOQUE ── */}
            {!loading && activeTab === 'stock' && (
                <div>
                    {/* Cards de totais */}
                    <div className="grid grid-3 mb-xl">
                        <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div style={{ fontSize: '2rem' }}>👕</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total de Produtos</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stockReport.length}</div>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div style={{ fontSize: '2rem' }}>💰</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Valor em Estoque</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(stockTotalValue)}</div>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div style={{ fontSize: '2rem' }}>⚠️</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Estoque Baixo</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stockLowCount > 0 ? '#f59e0b' : '#10b981' }}>{stockLowCount} {stockLowCount === 1 ? 'produto' : 'produtos'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title">Relatório de Estoque Atual</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={exportStockCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📊 CSV
                                </button>
                                <button className="btn btn-primary" onClick={handleExportStockPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📄 PDF
                                </button>
                            </div>
                        </div>
                        {stockReport.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Nome</th>
                                            <th>Categoria</th>
                                            <th>Quantidade</th>
                                            <th>Estoque Mínimo</th>
                                            <th>Preço Unit.</th>
                                            <th>Valor Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockReport.map((item) => (
                                            <tr key={item.id} className={item.baixo_estoque ? 'low-stock-row' : ''}>
                                                <td>{item.codigo}</td>
                                                <td>{item.nome}</td>
                                                <td>{item.categoria || '-'}</td>
                                                <td><strong>{item.quantidade_estoque}</strong></td>
                                                <td>{item.estoque_minimo}</td>
                                                <td>{formatCurrency(item.preco)}</td>
                                                <td>{formatCurrency(item.preco * item.quantidade_estoque)}</td>
                                                <td>
                                                    {item.baixo_estoque
                                                        ? <span className="badge badge-warning">⚠️ Baixo Estoque</span>
                                                        : <span className="badge badge-success">✓ OK</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state"><p className="text-muted">Nenhum produto cadastrado.</p></div>
                        )}
                    </div>
                </div>
            )}

            {/* ── VENDAS ── */}
            {!loading && activeTab === 'sales' && (
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="card-title">Relatório de Vendas por Período</h3>
                            {salesReport.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={exportSalesCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📊 CSV
                                </button>
                                <button className="btn btn-primary" onClick={handleExportSalesPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📄 Exportar PDF
                                </button>
                                </div>
                            )}
                        </div>
                        <div className="date-filter flex gap-md items-center">
                            <div>
                                <label className="form-label">Data Inicial</label>
                                <input type="date" name="startDate" className="form-input" value={dateRange.startDate} onChange={handleDateChange} />
                            </div>
                            <div>
                                <label className="form-label">Data Final</label>
                                <input type="date" name="endDate" className="form-input" value={dateRange.endDate} onChange={handleDateChange} />
                            </div>
                            <button className="btn btn-primary" onClick={handleLoadSalesReport} style={{ marginTop: '1.5rem' }}>Filtrar</button>
                        </div>
                    </div>
                    {salesReport.length > 0 ? (
                        <>
                            <div className="sales-summary">
                                <div className="summary-card">
                                    <h4>Total de Vendas</h4>
                                    <p className="summary-value">{salesReport.reduce((sum, item) => sum + item.total_vendido, 0)} unidades</p>
                                </div>
                                <div className="summary-card">
                                    <h4>Valor Total</h4>
                                    <p className="summary-value">{formatCurrency(salesReport.reduce((sum, item) => sum + item.valor_total, 0))}</p>
                                </div>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Produto</th>
                                            <th>Quantidade Vendida</th>
                                            <th>Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesReport.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.product_codigo}</td>
                                                <td>{item.product_nome}</td>
                                                <td>{item.total_vendido}</td>
                                                <td>{formatCurrency(item.valor_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state"><p className="text-muted">Nenhuma venda registrada no período selecionado.</p></div>
                    )}
                </div>
            )}

            {/* ── TOP ── */}
            {!loading && activeTab === 'top' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleExportTopPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📄 Exportar PDF
                        </button>
                    </div>
                    <div className="grid grid-2">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🏭 Top Fornecedores</h3>
                            </div>
                            {topSuppliers.length > 0 ? (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Fornecedor</th>
                                                <th>Entradas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topSuppliers.map((supplier, index) => (
                                                <tr key={supplier.supplier_id}>
                                                    <td><span className="rank-badge">{index + 1}</span></td>
                                                    <td>{supplier.supplier_nome}</td>
                                                    <td style={{ minWidth: '140px' }}>
                                                        <BarChart value={supplier.total_entradas} max={maxSupplier} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state"><p className="text-muted">Nenhuma entrada registrada.</p></div>
                            )}
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">👕 Produtos Mais Vendidos</h3>
                            </div>
                            {topProducts.length > 0 ? (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Produto</th>
                                                <th>Vendas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topProducts.map((product, index) => (
                                                <tr key={product.product_id}>
                                                    <td><span className="rank-badge">{index + 1}</span></td>
                                                    <td>{product.product_codigo} - {product.product_nome}</td>
                                                    <td style={{ minWidth: '140px' }}>
                                                        <BarChart value={product.total_saidas} max={maxProduct} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state"><p className="text-muted">Nenhuma venda registrada.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── FINANCEIRO ── */}
            {!loading && activeTab === 'financial' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title">💹 Relatório Financeiro Mensal</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="number" value={financialYear}
                                onChange={e => setFinancialYear(Number(e.target.value))}
                                min={2020} max={2099} style={{ width: '80px' }} className="form-input"
                            />
                            <button className="btn btn-primary" onClick={loadFinancialReport}>Filtrar</button>
                            {financialReport.length > 0 && (
                                <button className="btn btn-secondary" onClick={handleExportFinancialPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📄 PDF
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Período</th>
                                    <th>Vendas (R$)</th>
                                    <th>Devoluções (R$)</th>
                                    <th>Lucro Bruto (R$)</th>
                                    <th>Variação</th>
                                    <th>Nº Vendas</th>
                                    <th>Nº Dev.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialWithVariation.map((row, i) => (
                                    <tr key={i}>
                                        <td>{row.period}</td>
                                        <td>{formatCurrency(row.total_vendas)}</td>
                                        <td style={{ color: '#ef4444' }}>{formatCurrency(row.total_devolucoes)}</td>
                                        <td style={{ color: row.lucro_bruto >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                            {formatCurrency(row.lucro_bruto)}
                                        </td>
                                        <td>
                                            {row.variacao === null ? (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                            ) : (
                                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: row.variacao >= 0 ? '#10b981' : '#ef4444' }}>
                                                    {row.variacao >= 0 ? '▲' : '▼'} {Math.abs(row.variacao).toFixed(1)}%
                                                </span>
                                            )}
                                        </td>
                                        <td>{row.num_vendas}</td>
                                        <td>{row.num_devolucoes}</td>
                                    </tr>
                                ))}
                                {financialReport.length > 0 && (
                                    <tr style={{ fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                        <td>TOTAL</td>
                                        <td>{formatCurrency(financialReport.reduce((s, r) => s + r.total_vendas, 0))}</td>
                                        <td style={{ color: '#ef4444' }}>{formatCurrency(financialReport.reduce((s, r) => s + r.total_devolucoes, 0))}</td>
                                        <td style={{ color: '#10b981' }}>{formatCurrency(financialReport.reduce((s, r) => s + r.lucro_bruto, 0))}</td>
                                        <td>—</td>
                                        <td>{financialReport.reduce((s, r) => s + r.num_vendas, 0)}</td>
                                        <td>{financialReport.reduce((s, r) => s + r.num_devolucoes, 0)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── DEVOLUÇÕES ── */}
            {!loading && activeTab === 'devolutions' && (
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="card-title">🔄 Devoluções por Período</h3>
                            {devolutionReport.length > 0 && (
                                <button className="btn btn-secondary" onClick={handleExportDevolutionPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📄 Exportar PDF
                                </button>
                            )}
                        </div>
                        <div className="date-filter flex gap-md items-center">
                            <div>
                                <label className="form-label">Data Inicial</label>
                                <input type="date" className="form-input" value={devDateRange.startDate}
                                    onChange={e => setDevDateRange(d => ({ ...d, startDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Data Final</label>
                                <input type="date" className="form-input" value={devDateRange.endDate}
                                    onChange={e => setDevDateRange(d => ({ ...d, endDate: e.target.value }))} />
                            </div>
                            <button className="btn btn-primary" onClick={loadDevolutionReport} style={{ marginTop: '1.5rem' }}>Filtrar</button>
                        </div>
                    </div>
                    {devolutionReport.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Produto</th>
                                        <th>Qtd Devolvida</th>
                                        <th>Valor Estimado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devolutionReport.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.product_codigo}</td>
                                            <td>{item.product_nome}</td>
                                            <td><strong>{item.total_devolvido}</strong></td>
                                            <td>{formatCurrency(item.valor_estimado)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state"><p className="text-muted">Nenhuma devolução no período.</p></div>
                    )}
                </div>
            )}

            {/* ── LUCRATIVIDADE ── */}
            {activeTab === 'rentability' && (
                <div>
                    {rentabilityData.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <p>Nenhum produto com preço de custo cadastrado.</p>
                            <p style={{ fontSize: '0.85rem' }}>Cadastre o preço de custo nos produtos para ver a análise de lucratividade.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Cards de resumo */}
                            <div className="grid grid-3 mb-xl">
                                {[
                                    {
                                        label: 'Maior Margem', icon: '🏆',
                                        value: `${rentabilityData[0]?.margem_lucro?.toFixed(1)}%`,
                                        sub: rentabilityData[0]?.nome,
                                        color: '#10b981'
                                    },
                                    {
                                        label: 'Margem Média', icon: '📈',
                                        value: `${(rentabilityData.reduce((s, p) => s + (p.margem_lucro || 0), 0) / rentabilityData.length).toFixed(1)}%`,
                                        sub: `${rentabilityData.length} produtos analisados`,
                                        color: 'var(--primary-light)'
                                    },
                                    {
                                        label: 'Lucro Potencial', icon: '💰',
                                        value: formatCurrency(rentabilityData.reduce((s, p) => s + (p.preco - (p.preco_custo || 0)) * p.quantidade_estoque, 0)),
                                        sub: 'Se vender todo o estoque',
                                        color: '#f59e0b'
                                    },
                                ].map(c => (
                                    <div key={c.label} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{c.icon}</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
                                        {c.sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{c.sub}</div>}
                                    </div>
                                ))}
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">📊 Análise de Lucratividade por Produto</h3>
                                </div>
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Produto</th>
                                                <th>Preço Custo</th>
                                                <th>Preço Venda</th>
                                                <th>Lucro Unit.</th>
                                                <th>Margem %</th>
                                                <th>Estoque</th>
                                                <th>Lucro Potencial</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rentabilityData.map((p, idx) => {
                                                const lucroUnit = p.preco - (p.preco_custo || 0);
                                                const lucroPotencial = lucroUnit * p.quantidade_estoque;
                                                const margem = p.margem_lucro || 0;
                                                const margemColor = margem >= 50 ? '#10b981' : margem >= 20 ? '#f59e0b' : '#ef4444';
                                                return (
                                                    <tr key={p.id}>
                                                        <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{idx + 1}º</td>
                                                        <td>
                                                            <div style={{ fontWeight: 600 }}>{p.nome}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.codigo}</div>
                                                        </td>
                                                        <td>{formatCurrency(p.preco_custo)}</td>
                                                        <td>{formatCurrency(p.preco)}</td>
                                                        <td style={{ color: lucroUnit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                            {formatCurrency(lucroUnit)}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <div style={{ width: 60, height: 6, background: 'var(--bg-tertiary)', borderRadius: 999, overflow: 'hidden' }}>
                                                                    <div style={{ width: `${Math.min(margem, 100)}%`, height: '100%', background: margemColor, borderRadius: 999 }} />
                                                                </div>
                                                                <span style={{ fontWeight: 700, color: margemColor, fontSize: '0.85rem' }}>{margem.toFixed(1)}%</span>
                                                            </div>
                                                        </td>
                                                        <td>{p.quantidade_estoque}</td>
                                                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(lucroPotencial)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── COTAÇÕES ── */}
            {activeTab === 'exchange' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 className="card-title">💱 Cotações em Tempo Real</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                Dados via <strong>AwesomeAPI</strong> (API externa em tempo real)
                            </p>
                        </div>
                        <button className="btn btn-secondary" onClick={loadExchangeRates}>🔄 Atualizar</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem 0' }}>
                        {exchangeRates.map(rate => (
                            <div key={rate.codigo} style={{
                                background: 'var(--bg-secondary)', borderRadius: '1rem',
                                padding: '1.25rem', textAlign: 'center', border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                    {rate.codigo === 'USD' ? '🇺🇸' : rate.codigo === 'EUR' ? '🇪🇺' : '🇬🇧'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{rate.moeda}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: '0.5rem 0' }}>
                                    {formatCurrency(rate.bid)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Compra: {formatCurrency(rate.bid)} | Venda: {formatCurrency(rate.ask)}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Atualizado: {rate.updated_at}
                                </div>
                            </div>
                        ))}
                        {exchangeRates.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center' }}>Carregando cotações...</p>
                        )}
                    </div>
                </div>
            )}
            {/* ── RELAÇÃO DE PREÇOS ── */}
            {activeTab === 'prices' && (() => {
                const categories = [...new Set(stockReport.map(p => p.categoria).filter(Boolean))].sort();
                const priceData = stockReport
                    .filter(p => !priceCategoryFilter || p.categoria === priceCategoryFilter)
                    .sort((a, b) => {
                        if (priceSort === 'preco') return b.preco - a.preco;
                        if (priceSort === 'codigo') return (a.codigo || '').localeCompare(b.codigo || '');
                        if (priceSort === 'categoria') return (a.categoria || '').localeCompare(b.categoria || '');
                        return a.nome.localeCompare(b.nome);
                    });
                const exportPricesCSV = () => {
                    const sep = ';';
                    const header = ['Código', 'Nome', 'Categoria', 'Cor', 'Tamanho', 'Preço Venda', 'Preço Custo', 'Margem %'].join(sep);
                    const lines = priceData.map(p => [
                        p.codigo, p.nome, p.categoria || '', p.cor || '', p.tamanho || '',
                        (p.preco || 0).toFixed(2).replace('.', ','),
                        p.preco_custo ? p.preco_custo.toFixed(2).replace('.', ',') : '',
                        p.margem_lucro ? p.margem_lucro.toFixed(1).replace('.', ',') : '',
                    ].join(sep));
                    const csv = '﻿' + [header, ...lines].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = `relacao_precos_${today()}.csv`; a.click(); URL.revokeObjectURL(url);
                };
                return (
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <h3 className="card-title">🏷️ Relação de Preços</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <select className="form-select" value={priceCategoryFilter} onChange={e => setPriceCategoryFilter(e.target.value)} style={{ minWidth: '150px' }}>
                                    <option value="">Todas as categorias</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select className="form-select" value={priceSort} onChange={e => setPriceSort(e.target.value)} style={{ minWidth: '140px' }}>
                                    <option value="nome">Ordenar: Nome</option>
                                    <option value="codigo">Ordenar: Código</option>
                                    <option value="categoria">Ordenar: Categoria</option>
                                    <option value="preco">Ordenar: Preço ↓</option>
                                </select>
                                <button className="btn btn-secondary" onClick={exportPricesCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📊 CSV</button>
                            </div>
                        </div>
                        {priceData.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Nome</th>
                                            <th>Categoria</th>
                                            <th>Cor</th>
                                            <th>Tamanho</th>
                                            <th>Preço Venda</th>
                                            <th>Preço Custo</th>
                                            <th>Margem %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceData.map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.codigo}</td>
                                                <td style={{ fontWeight: 600 }}>{p.nome}</td>
                                                <td>{p.categoria || '-'}</td>
                                                <td>{p.cor || '-'}</td>
                                                <td>{p.tamanho || '-'}</td>
                                                <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(p.preco)}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{p.preco_custo ? formatCurrency(p.preco_custo) : '-'}</td>
                                                <td>
                                                    {p.margem_lucro != null ? (
                                                        <span style={{ fontWeight: 700, color: p.margem_lucro >= 50 ? '#10b981' : p.margem_lucro >= 20 ? '#f59e0b' : '#ef4444' }}>
                                                            {p.margem_lucro.toFixed(1)}%
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state"><p className="text-muted">Nenhum produto encontrado.</p></div>
                        )}
                        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {priceData.length} produto(s) exibido(s)
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

export default Reports;
