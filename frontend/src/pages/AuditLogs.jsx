import { useState, useEffect, useRef, useCallback } from 'react';
import { auditAPI } from '../services/api';

const ACTIONS = [
    { value: 'LOGIN',  label: 'Login',    icon: '🔑', badge: 'badge-success' },
    { value: 'LOGOUT', label: 'Logout',   icon: '🚪', badge: 'badge-secondary' },
    { value: 'CREATE', label: 'Criação',  icon: '➕', badge: 'badge-primary' },
    { value: 'UPDATE', label: 'Edição',   icon: '✏️', badge: 'badge-warning' },
    { value: 'DELETE', label: 'Exclusão', icon: '🗑️', badge: 'badge-danger' },
];

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

const PERIOD_OPTIONS = [
    { label: 'Hoje',    start: today,          end: today },
    { label: '7 dias',  start: () => daysAgo(6), end: today },
    { label: '30 dias', start: () => daysAgo(29), end: today },
    { label: 'Tudo',    start: () => '',         end: () => '' },
];

const AUTO_REFRESH_SECS = 30;

function actionInfo(action) {
    return ACTIONS.find(a => a.value === action) || { label: action, icon: '📝', badge: 'badge-secondary' };
}

function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterResource, setFilterResource] = useState('');
    const [periodIdx, setPeriodIdx] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS);
    const countdownRef = useRef(null);
    const fetchRef = useRef(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterAction) params.action = filterAction;
            if (filterResource) params.resource = filterResource;
            const r = await auditAPI.getAll(params);
            setLogs(r.data);
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, [filterAction, filterResource]);

    fetchRef.current = fetchLogs;

    // Auto-refresh com countdown
    useEffect(() => {
        fetchRef.current();
    }, [filterAction, filterResource]);

    useEffect(() => {
        setCountdown(AUTO_REFRESH_SECS);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    fetchRef.current();
                    return AUTO_REFRESH_SECS;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [filterAction, filterResource]);

    const handleManualRefresh = () => {
        setCountdown(AUTO_REFRESH_SECS);
        fetchRef.current();
    };

    const formatDate = (d) => new Date(d).toLocaleString('pt-BR');

    // Filtros client-side (usuário e período)
    const filtered = logs.filter(log => {
        if (filterUser) {
            const name = (log.user_nome || 'sistema').toLowerCase();
            if (!name.includes(filterUser.toLowerCase())) return false;
        }
        const opt = PERIOD_OPTIONS[periodIdx];
        const start = opt.start();
        const end = opt.end();
        if (start && end) {
            const logDate = new Date(log.created_at).toISOString().split('T')[0];
            if (logDate < start || logDate > end) return false;
        }
        return true;
    });

    // Cards de resumo (baseado no período filtrado)
    const summary = {
        total: filtered.length,
        logins: filtered.filter(l => l.action === 'LOGIN').length,
        creates: filtered.filter(l => l.action === 'CREATE').length,
        updates: filtered.filter(l => l.action === 'UPDATE').length,
        deletes: filtered.filter(l => l.action === 'DELETE').length,
    };

    const pillBase = {
        padding: '0.3rem 0.85rem', borderRadius: '999px', border: '1px solid var(--border)',
        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: 'transparent',
    };

    return (
        <div className="fade-in">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Auditoria do Sistema</h1>
                    <p className="text-muted">Registro de todas as ações realizadas</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        🔄 Atualiza em <strong style={{ color: 'var(--primary-light)' }}>{countdown}s</strong>
                    </span>
                    <button className="btn btn-secondary" onClick={handleManualRefresh}>🔄 Atualizar</button>
                </div>
            </div>

            {/* Cards de resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                {[
                    { label: 'Total', value: summary.total, icon: '📋', color: 'var(--primary-light)' },
                    { label: 'Logins', value: summary.logins, icon: '🔑', color: '#10b981' },
                    { label: 'Criações', value: summary.creates, icon: '➕', color: '#6366f1' },
                    { label: 'Edições', value: summary.updates, icon: '✏️', color: '#f59e0b' },
                    { label: 'Exclusões', value: summary.deletes, icon: '🗑️', color: '#ef4444' },
                ].map(card => (
                    <div key={card.label} className="card" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{ fontSize: '1.5rem' }}>{card.icon}</div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{card.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="card mb-xl">
                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
                    {/* Período */}
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Período</div>
                        <div className="flex gap-sm">
                            {PERIOD_OPTIONS.map((opt, idx) => (
                                <button key={idx} onClick={() => setPeriodIdx(idx)} style={{
                                    ...pillBase,
                                    background: periodIdx === idx ? 'var(--primary)' : 'transparent',
                                    color: periodIdx === idx ? '#fff' : 'var(--text-secondary)',
                                }}>{opt.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Ação */}
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Ação</div>
                        <div className="flex gap-sm">
                            <button onClick={() => setFilterAction('')} style={{
                                ...pillBase,
                                background: !filterAction ? 'var(--bg-tertiary)' : 'transparent',
                                color: !filterAction ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: !filterAction ? 700 : 400,
                            }}>Todas</button>
                            {ACTIONS.map(a => (
                                <button key={a.value} onClick={() => setFilterAction(filterAction === a.value ? '' : a.value)} style={{
                                    ...pillBase,
                                    background: filterAction === a.value ? 'var(--bg-tertiary)' : 'transparent',
                                    color: filterAction === a.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: filterAction === a.value ? 700 : 400,
                                    whiteSpace: 'nowrap',
                                }}>{a.icon} {a.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Busca usuário e recurso */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginLeft: 'auto' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Usuário..."
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                            style={{ width: '160px', textTransform: 'none' }}
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Recurso..."
                            value={filterResource}
                            onChange={e => setFilterResource(e.target.value)}
                            style={{ width: '160px', textTransform: 'none' }}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Registros ({filtered.length})</h3>
                    </div>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <p className="text-muted">Nenhum registro encontrado para os filtros selecionados.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table" aria-label="Logs de auditoria">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Usuário</th>
                                        <th>Ação</th>
                                        <th>Recurso</th>
                                        <th>Detalhes</th>
                                        <th>IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(log => {
                                        const info = actionInfo(log.action);
                                        const isExpanded = expandedId === log.id;
                                        const hasDetails = log.details && log.details.length > 60;
                                        return (
                                            <tr key={log.id}>
                                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(log.created_at)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <div style={{
                                                            width: '26px', height: '26px', borderRadius: '50%',
                                                            background: 'var(--primary)', display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                                        }}>
                                                            {(log.user_nome || 'S').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem' }}>{log.user_nome || 'Sistema'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${info.badge}`} style={{ whiteSpace: 'nowrap' }}>
                                                        {info.icon} {info.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    <code style={{ fontSize: '0.78rem', background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                        {log.resource}
                                                    </code>
                                                </td>
                                                <td style={{ maxWidth: '280px', fontSize: '0.82rem' }}>
                                                    {log.details ? (
                                                        <div>
                                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                                {isExpanded ? log.details : log.details.slice(0, 60) + (hasDetails ? '…' : '')}
                                                            </span>
                                                            {hasDetails && (
                                                                <button onClick={() => setExpandedId(isExpanded ? null : log.id)} style={{
                                                                    background: 'none', border: 'none', color: 'var(--primary-light)',
                                                                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: '0 0.25rem',
                                                                }}>
                                                                    {isExpanded ? 'ver menos' : 'ver mais'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {log.ip_address || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AuditLogs;
