import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, reportsAPI, salesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
}

function getFormattedDate() {
    return new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function SalesBarChart({ data }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);
    const W = 700, H = 160, pad = { top: 16, right: 12, bottom: 36, left: 8 };
    const barW = (W - pad.left - pad.right) / data.length;
    const barGap = barW * 0.25;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 180, display: 'block' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = pad.top + (H - pad.top - pad.bottom) * (1 - pct);
                return (
                    <line key={pct} x1={pad.left} x2={W - pad.right} y1={y} y2={y}
                        stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 3" />
                );
            })}
            {data.map((d, i) => {
                const chartH = H - pad.top - pad.bottom;
                const barH = max > 0 ? (d.value / max) * chartH : 0;
                const x = pad.left + i * barW + barGap / 2;
                const y = pad.top + chartH - barH;
                const hasValue = d.value > 0;
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={barW - barGap} height={barH}
                            rx="4" fill={hasValue ? 'url(#barGrad)' : 'var(--bg-tertiary)'} />
                        {hasValue && (
                            <text x={x + (barW - barGap) / 2} y={y - 4}
                                textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontWeight="600">
                                {fmt(d.value)}
                            </text>
                        )}
                        <text x={x + (barW - barGap) / 2} y={H - pad.bottom + 14}
                            textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontWeight="600">
                            {d.label}
                        </text>
                    </g>
                );
            })}
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.7" />
                </linearGradient>
            </defs>
        </svg>
    );
}

function StockBar({ current, minimum }) {
    const pct = minimum > 0 ? Math.min((current / minimum) * 100, 100) : 100;
    const color = pct <= 30 ? '#ef4444' : pct <= 70 ? '#f59e0b' : '#10b981';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: '28px' }}>{current}</span>
        </div>
    );
}

function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockCount: 0,
        totalValue: 0,
        totalCost: 0,
        totalMargin: 0,
        salesToday: 0,
        salesTodayCount: 0,
    });
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [chartYear, setChartYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [dateStr] = useState(getFormattedDate);

    useEffect(() => { loadDashboardData(); }, []);

    const loadChartData = async (year) => {
        try {
            const financial = (await reportsAPI.getFinancialReport(year).catch(() => ({ data: [] }))).data || [];
            const SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            setMonthlyData(SHORT.map((label, mi) => ({ label, value: financial[mi]?.total_vendas || 0 })));
        } catch {}
    };

    const handleChartYearChange = (year) => {
        setChartYear(year);
        loadChartData(year);
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const todayStr = new Date().toISOString().split('T')[0];

            const currentYear = new Date().getFullYear();
            const [productsRes, stockReportRes, salesRes, financialRes, topProductsRes] = await Promise.all([
                productsAPI.getAll(),
                reportsAPI.getStockReport(),
                salesAPI.getAll({ start_date: todayStr, end_date: todayStr }).catch(() => ({ data: [] })),
                reportsAPI.getFinancialReport(chartYear).catch(() => ({ data: [] })),
                reportsAPI.getTopProducts().catch(() => ({ data: [] })),
            ]);

            const products = productsRes.data;
            const stockReport = stockReportRes.data;
            const salesToday = salesRes.data || [];

            const totalValue = products.reduce((sum, p) => sum + p.preco * p.quantidade_estoque, 0);
            const totalCost = products.reduce((sum, p) => sum + (p.preco_custo || 0) * p.quantidade_estoque, 0);
            const totalMargin = totalValue - totalCost;
            const lowStock = stockReport.filter(p => p.baixo_estoque);

            setStats({
                totalProducts: products.length,
                lowStockCount: lowStock.length,
                totalValue,
                totalCost,
                totalMargin,
                salesToday: salesToday.reduce((s, sale) => s + (sale.total || 0), 0),
                salesTodayCount: salesToday.length,
            });

            setLowStockProducts(lowStock.slice(0, 5));
            setTopProducts((topProductsRes.data || []).slice(0, 5));

            const SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            const financial = financialRes.data || [];
            setMonthlyData(SHORT.map((label, mi) => ({ label, value: financial[mi]?.total_vendas || 0 })));
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    if (loading) {
        return (
            <div className="dashboard fade-in">
                <div className="page-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div className="skeleton skeleton-title" style={{ width: '220px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '160px' }} />
                </div>
                <div className="stats-grid grid grid-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    {[1,2,3].map(i => <div key={i} className="card skeleton skeleton-card" />)}
                </div>
                <div className="card mb-xl">
                    <div style={{ padding: '1.25rem 1.5rem' }}>
                        <div className="skeleton skeleton-title" style={{ width: '200px', marginBottom: '1.5rem' }} />
                        {[1,2,3,4,5].map(i => <div key={i} className="skeleton skeleton-row" />)}
                    </div>
                </div>
            </div>
        );
    }

    const firstName = user?.nome?.split(' ')[0] || 'usuário';

    return (
        <div className="dashboard fade-in">
            {/* Cabeçalho com saudação e data */}
            <div className="page-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <h1 style={{ marginBottom: '0.25rem' }}>
                            {getGreeting()}, {firstName}! 👋
                        </h1>
                        <p className="text-muted" style={{ textTransform: 'capitalize' }}>{dateStr}</p>
                    </div>
                    <button className="btn btn-secondary" onClick={loadDashboardData} style={{ alignSelf: 'flex-start' }}>
                        🔄 Atualizar
                    </button>
                </div>
            </div>

            {/* Cards de estatísticas */}
            <div className="stats-grid grid grid-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
                {/* Vendas do dia */}
                <div className="stat-card card" style={{ gridColumn: 'span 1' }}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        💳
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Vendas Hoje</p>
                        <h2 className="stat-value" style={{ fontSize: '1.6rem' }}>{formatCurrency(stats.salesToday)}</h2>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {stats.salesTodayCount} transaç{stats.salesTodayCount === 1 ? 'ão' : 'ões'}
                        </p>
                    </div>
                </div>

                {/* Total de produtos */}
                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                        👕
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total de Produtos</p>
                        <h2 className="stat-value">{stats.totalProducts}</h2>
                    </div>
                </div>

                {/* Estoque baixo */}
                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        ⚠️
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Estoque Baixo</p>
                        <h2 className="stat-value">{stats.lowStockCount}</h2>
                    </div>
                </div>

                {/* Custo / Margem (só quando há preço de custo) */}
                {stats.totalCost > 0 ? (
                    <>
                        <div className="stat-card card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                                🏷️
                            </div>
                            <div className="stat-content">
                                <p className="stat-label">Custo Total em Estoque</p>
                                <h2 className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(stats.totalCost)}</h2>
                            </div>
                        </div>
                        <div className="stat-card card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                                📈
                            </div>
                            <div className="stat-content">
                                <p className="stat-label">Margem Bruta Potencial</p>
                                <h2 className="stat-value" style={{ fontSize: '1.4rem', color: stats.totalMargin >= 0 ? '#10b981' : '#ef4444' }}>
                                    {formatCurrency(stats.totalMargin)}
                                    <span style={{ fontSize: '0.85rem', marginLeft: '6px', opacity: 0.8 }}>
                                        ({stats.totalValue > 0 ? ((stats.totalMargin / stats.totalValue) * 100).toFixed(1) : 0}%)
                                    </span>
                                </h2>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                            💰
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Valor em Estoque</p>
                            <h2 className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(stats.totalValue)}</h2>
                        </div>
                    </div>
                )}
            </div>

            {/* Grafico de vendas mensais */}
            <div className="card mb-xl">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">📊 Vendas Mensais</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button onClick={() => handleChartYearChange(chartYear - 1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>‹</button>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', minWidth: '3rem', textAlign: 'center' }}>{chartYear}</span>
                        <button onClick={() => handleChartYearChange(chartYear + 1)} disabled={chartYear >= new Date().getFullYear()} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', opacity: chartYear >= new Date().getFullYear() ? 0.4 : 1 }}>›</button>
                    </div>
                </div>
                {monthlyData.some(d => d.value > 0) ? (
                    <>
                        <div style={{ padding: '0.5rem 1rem 0.25rem' }}>
                            <SalesBarChart data={monthlyData} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1.25rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span>Total no ano: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(monthlyData.reduce((s, d) => s + d.value, 0))}</strong></span>
                            <span>Melhor mês: <strong style={{ color: '#6366f1' }}>{monthlyData.reduce((best, d) => d.value > best.value ? d : best, monthlyData[0])?.label}</strong></span>
                        </div>
                    </>
                ) : (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p className="text-muted">Nenhuma venda registrada em {chartYear}.</p>
                    </div>
                )}
            </div>

            <div className="dashboard-content">
                {/* PDV em destaque */}
                <Link to="/pdv" style={{ textDecoration: 'none', display: 'block', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.5rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                                Ação principal
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>🖥️ Abrir PDV</div>
                            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.25rem' }}>
                                Ponto de Venda — registrar nova venda
                            </div>
                        </div>
                        <div style={{ fontSize: '3rem', opacity: 0.6 }}>→</div>
                    </div>
                </Link>

                {/* Produtos com estoque baixo */}
                <div className="card mb-xl">
                    <div className="card-header flex justify-between items-center">
                        <h3 className="card-title">⚠️ Produtos com Estoque Baixo</h3>
                        <Link to="/reports" className="btn btn-sm btn-primary">Ver Relatórios</Link>
                    </div>
                    {lowStockProducts.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Nome</th>
                                        <th>Categoria</th>
                                        <th>Mínimo</th>
                                        <th>Nível de Estoque</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockProducts.map(product => (
                                        <tr key={product.id}>
                                            <td style={{ fontSize: '0.85rem' }}>{product.codigo}</td>
                                            <td><strong>{product.nome}</strong></td>
                                            <td style={{ fontSize: '0.85rem' }}>{product.categoria || '-'}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{product.estoque_minimo}</td>
                                            <td style={{ minWidth: '160px' }}>
                                                <StockBar current={product.quantidade_estoque} minimum={product.estoque_minimo} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p className="text-muted">✅ Todos os produtos estão com estoque adequado!</p>
                        </div>
                    )}
                </div>

                {/* Top produtos mais vendidos */}
                {topProducts.length > 0 && (
                    <div className="card mb-xl">
                        <div className="card-header flex justify-between items-center">
                            <h3 className="card-title">🏆 Top 5 Produtos Mais Vendidos</h3>
                            <Link to="/reports" className="btn btn-sm btn-primary">Ver Todos</Link>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Produto</th>
                                        <th>Código</th>
                                        <th>Unidades Vendidas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, i) => (
                                        <tr key={p.product_id}>
                                            <td style={{ fontWeight: 800, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#a16207' : 'var(--text-muted)' }}>
                                                {i + 1}º
                                            </td>
                                            <td><strong>{p.product_nome}</strong></td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.product_codigo}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 999, overflow: 'hidden', maxWidth: 120 }}>
                                                        <div style={{ width: `${(p.total_saidas / topProducts[0].total_saidas) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 999 }} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.total_saidas} un.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Ações rápidas */}
                <div className="quick-actions">
                    <h3 className="mb-lg">Ações Rápidas</h3>
                    <div className="grid grid-2">
                        <Link to="/products" className="action-card card">
                            <div className="action-icon">👕</div>
                            <h4>Gerenciar Produtos</h4>
                            <p className="text-muted">Adicionar, editar ou remover produtos</p>
                        </Link>
                        <Link to="/movements" className="action-card card">
                            <div className="action-icon">📦</div>
                            <h4>Movimentar Estoque</h4>
                            <p className="text-muted">Registrar entradas e saídas</p>
                        </Link>
                        <Link to="/suppliers" className="action-card card">
                            <div className="action-icon">🏭</div>
                            <h4>Fornecedores</h4>
                            <p className="text-muted">Gerenciar fornecedores</p>
                        </Link>
                        <Link to="/customers" className="action-card card">
                            <div className="action-icon">👥</div>
                            <h4>Clientes</h4>
                            <p className="text-muted">Gerenciar clientes</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
