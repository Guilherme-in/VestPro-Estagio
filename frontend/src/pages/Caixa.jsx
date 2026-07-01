import { useState, useEffect, useCallback } from 'react';
import { caixaAPI, salesAPI } from '../services/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtTime = (dt) => new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const toInputDate = (d) => d.toISOString().split('T')[0];

const TIPO_LABELS = {
    abertura:   { label: 'Abertura',   icon: '🔓', color: '#10b981' },
    fechamento: { label: 'Fechamento', icon: '🔒', color: '#6366f1' },
    sangria:    { label: 'Sangria',    icon: '📤', color: '#ef4444' },
    suprimento: { label: 'Reforço',    icon: '📥', color: '#f59e0b' },
};

const PAGAMENTO_META = {
    dinheiro:       { label: 'Dinheiro',      icon: '💵', color: '#10b981' },
    cartao_credito: { label: 'Crédito',       icon: '💳', color: '#6366f1' },
    cartao_debito:  { label: 'Débito',        icon: '💳', color: '#3b82f6' },
    pix:            { label: 'PIX',           icon: '⚡', color: '#f59e0b' },
    boleto:         { label: 'Boleto',        icon: '📄', color: '#8b5cf6' },
    transferencia:  { label: 'Transferência', icon: '🏦', color: '#06b6d4' },
};
const pmeta = (fp) => PAGAMENTO_META[fp] || { label: fp, icon: '💰', color: '#64748b' };

function ActionModal({ tipo, saldoEsperado, onConfirm, onCancel }) {
    const [valor, setValor] = useState('');
    const [obs, setObs] = useState('');
    const t = TIPO_LABELS[tipo];
    const isFechamento = tipo === 'fechamento';
    const diff = isFechamento && valor ? parseFloat(valor) - saldoEsperado : null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                <div className="confirm-modal-icon">{t.icon}</div>
                <h3 className="confirm-modal-title">{t.label}</h3>

                {(tipo === 'abertura' || tipo === 'suprimento') && (
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        {[50, 100, 200, 500].map(v => (
                            <button key={v} onClick={() => setValor(String(v))} style={{
                                padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${valor === String(v) ? t.color : 'var(--border)'}`,
                                background: valor === String(v) ? t.color : 'transparent',
                                color: valor === String(v) ? '#fff' : 'var(--text-secondary)',
                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            }}>R$ {v}</button>
                        ))}
                    </div>
                )}

                <div style={{ marginBottom: '0.75rem', textAlign: 'left' }}>
                    <label className="form-label">Valor (R$) *</label>
                    <input
                        type="number" min="0" step="0.01" className="form-input"
                        value={valor} onChange={e => setValor(e.target.value)}
                        placeholder="0,00" autoFocus
                        onKeyDown={e => e.key === 'Enter' && valor && onConfirm(parseFloat(valor), obs)}
                    />
                </div>

                {isFechamento && (
                    <div style={{
                        marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-primary)', fontSize: '0.85rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Saldo esperado</span>
                            <span style={{ fontWeight: 700 }}>{fmt(saldoEsperado)}</span>
                        </div>
                        {diff !== null && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{diff >= 0 ? 'Sobra' : 'Falta'}</span>
                                <span style={{ fontWeight: 800, color: diff >= 0 ? '#10b981' : '#ef4444' }}>
                                    {diff >= 0 ? '+' : ''}{fmt(diff)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                    <label className="form-label">Observação</label>
                    <input type="text" className="form-input" value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
                </div>

                <div className="confirm-modal-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => valor && onConfirm(parseFloat(valor), obs)} disabled={!valor}>
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

function Caixa() {
    const todayStr = toInputDate(new Date());

    const [status, setStatus] = useState(null);
    const [registros, setRegistros] = useState([]);
    const [vendasHoje, setVendasHoje] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [resumoPag, setResumoPag] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingPag, setLoadingPag] = useState(false);
    const [modal, setModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('hoje');
    const [filtroStart, setFiltroStart] = useState(todayStr);
    const [filtroEnd, setFiltroEnd] = useState(todayStr);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [statusRes, regRes, vendasRes, histRes] = await Promise.all([
                caixaAPI.getStatus(),
                caixaAPI.getHoje(),
                salesAPI.getAll({ start_date: todayStr, end_date: todayStr }).catch(() => ({ data: [] })),
                caixaAPI.getHistorico(7).catch(() => ({ data: [] })),
            ]);
            setStatus(statusRes.data);
            setRegistros(regRes.data);
            setVendasHoje(vendasRes.data || []);
            setHistorico(histRes.data || []);
        } finally {
            setLoading(false);
        }
    }, [todayStr]);

    const loadResumoPagamentos = useCallback(async (start, end) => {
        try {
            setLoadingPag(true);
            const res = await caixaAPI.getResumoPagamentos(start, end);
            setResumoPag(res.data);
        } catch {
            setResumoPag(null);
        } finally {
            setLoadingPag(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadResumoPagamentos(filtroStart, filtroEnd); }, [filtroStart, filtroEnd, loadResumoPagamentos]);

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3500);
    };

    const handleSubmit = async (valor, obs) => {
        try {
            setSaving(true);
            await caixaAPI.create({ tipo: modal, valor, observacao: obs || null });
            showMsg(`${TIPO_LABELS[modal].label} registrada com sucesso!`);
            setModal(null);
            loadData();
            loadResumoPagamentos(filtroStart, filtroEnd);
        } catch (err) {
            showMsg(err.response?.data?.detail || 'Erro ao registrar', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const setPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        setFiltroStart(toInputDate(start));
        setFiltroEnd(toInputDate(end));
    };

    const totalVendas = vendasHoje.reduce((s, v) => s + (v.total || 0), 0);
    const totalSangrias = registros.filter(r => r.tipo === 'sangria').reduce((s, r) => s + r.valor, 0);
    const totalSuprimentos = registros.filter(r => r.tipo === 'suprimento').reduce((s, r) => s + r.valor, 0);
    const abertura = registros.find(r => r.tipo === 'abertura');
    const fechamento = registros.find(r => r.tipo === 'fechamento');
    const saldoEsperado = (abertura?.valor || 0) + totalVendas + totalSuprimentos - totalSangrias;
    const aberto = status?.aberto;
    const diferenca = fechamento ? fechamento.valor - saldoEsperado : null;

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div className="fade-in">
            {modal && (
                <ActionModal
                    tipo={modal}
                    saldoEsperado={saldoEsperado}
                    onConfirm={handleSubmit}
                    onCancel={() => !saving && setModal(null)}
                />
            )}

            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>💰 Caixa</h1>
                    <p className="text-muted">Controle de abertura e fechamento do caixa</p>
                </div>
                <button className="btn btn-secondary" onClick={loadData}>🔄 Atualizar</button>
            </div>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {/* Status + ações */}
            <div className="card mb-xl" style={{ borderLeft: `4px solid ${aberto ? '#10b981' : '#6366f1'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '2.5rem' }}>{aberto ? '🔓' : '🔒'}</span>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: aberto ? '#10b981' : '#6366f1' }}>
                                Caixa {aberto ? 'ABERTO' : status?.ultimo_tipo === 'fechamento' ? 'FECHADO' : 'NÃO ABERTO'}
                            </div>
                            {abertura && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Aberto às {fmtTime(abertura.created_at)} · Valor inicial: {fmt(abertura.valor)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {!aberto && status?.ultimo_tipo !== 'fechamento' && (
                            <button className="btn btn-success" onClick={() => setModal('abertura')}>🔓 Abrir Caixa</button>
                        )}
                        {aberto && (
                            <>
                                <button className="btn btn-secondary" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                                    onClick={() => setModal('suprimento')}>📥 Reforço</button>
                                <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={() => setModal('sangria')}>📤 Sangria</button>
                                <button className="btn btn-primary" onClick={() => setModal('fechamento')}>🔒 Fechar Caixa</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Cards resumo do dia */}
            <div className="grid grid-4 mb-xl">
                {[
                    { label: 'Abertura',       value: fmt(abertura?.valor || 0), icon: '🔓', color: '#6366f1', sub: 'Valor inicial' },
                    { label: 'Vendas Hoje',    value: fmt(totalVendas),          icon: '💳', color: '#10b981', sub: `${vendasHoje.length} transações` },
                    { label: 'Sangrias',       value: fmt(totalSangrias),        icon: '📤', color: '#ef4444', sub: `${registros.filter(r=>r.tipo==='sangria').length} retirada(s)` },
                    { label: 'Saldo Esperado', value: fmt(saldoEsperado),        icon: '💰', color: '#f59e0b', sub: aberto ? 'Em caixa agora' : 'No fechamento' },
                ].map(c => (
                    <div key={c.label} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{c.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{c.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* Diferença do fechamento */}
            {fechamento && diferenca !== null && (
                <div className="card mb-xl" style={{ borderLeft: `4px solid ${diferenca >= 0 ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                                Conferência do Fechamento
                            </div>
                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.9rem' }}>Saldo esperado: <strong>{fmt(saldoEsperado)}</strong></span>
                                <span style={{ fontSize: '0.9rem' }}>Valor informado: <strong>{fmt(fechamento.valor)}</strong></span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                {diferenca >= 0 ? 'Sobra' : 'Falta'}
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: diferenca >= 0 ? '#10b981' : '#ef4444' }}>
                                {diferenca >= 0 ? '+' : ''}{fmt(diferenca)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Painel de Formas de Pagamento ── */}
            <div className="card mb-xl">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>💳 Vendas por Forma de Pagamento</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                            onClick={() => { setFiltroStart(todayStr); setFiltroEnd(todayStr); }}>Hoje</button>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                            onClick={() => setPreset(6)}>7 dias</button>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                            onClick={() => setPreset(29)}>30 dias</button>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                            onClick={() => setPreset(89)}>90 dias</button>
                        <input type="date" className="form-input" style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={filtroStart} max={filtroEnd}
                            onChange={e => setFiltroStart(e.target.value)} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>até</span>
                        <input type="date" className="form-input" style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={filtroEnd} min={filtroStart}
                            onChange={e => setFiltroEnd(e.target.value)} />
                    </div>
                </div>

                {loadingPag ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando...</div>
                ) : !resumoPag || resumoPag.items.length === 0 ? (
                    <div className="empty-state"><p className="text-muted">Nenhuma venda no período selecionado.</p></div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            {resumoPag.items.map(item => {
                                const m = pmeta(item.forma_pagamento);
                                return (
                                    <div key={item.forma_pagamento} style={{
                                        padding: '0.9rem', borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)', background: 'var(--bg-primary)',
                                        borderLeft: `4px solid ${m.color}`,
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{m.icon}</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: m.color }}>{fmt(item.total)}</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {item.quantidade} venda{item.quantidade !== 1 ? 's' : ''} · {item.percentual}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Barra de proporção */}
                        <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: '0.6rem', gap: 1 }}>
                            {resumoPag.items.map(item => {
                                const m = pmeta(item.forma_pagamento);
                                return (
                                    <div key={item.forma_pagamento} title={`${m.label}: ${item.percentual}%`}
                                        style={{ flex: item.percentual, background: m.color, minWidth: item.percentual > 0 ? 4 : 0 }} />
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{resumoPag.num_vendas} vendas no período</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total: {fmt(resumoPag.total)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Tabs hoje / histórico */}
            <div className="tabs" style={{ marginBottom: '1rem' }}>
                <button className={`tab ${activeTab === 'hoje' ? 'active' : ''}`} onClick={() => setActiveTab('hoje')}>
                    📋 Movimentos de Hoje
                </button>
                <button className={`tab ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}>
                    📅 Histórico (7 dias)
                </button>
            </div>

            {activeTab === 'hoje' && (
                <div className="card">
                    {registros.length === 0 ? (
                        <div className="empty-state"><p className="text-muted">Nenhum movimento registrado hoje.</p></div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Hora</th>
                                        <th>Tipo</th>
                                        <th>Valor</th>
                                        <th>Observação</th>
                                        <th>Usuário</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registros.map(r => {
                                        const t = TIPO_LABELS[r.tipo];
                                        const sinal = r.tipo === 'sangria' ? '−' : '+';
                                        const cor = r.tipo === 'sangria' ? '#ef4444' : r.tipo === 'suprimento' ? '#f59e0b' : 'var(--text-primary)';
                                        return (
                                            <tr key={r.id}>
                                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fmtTime(r.created_at)}</td>
                                                <td>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: t.color }}>
                                                        {t.icon} {t.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 700, color: cor }}>{sinal} {fmt(r.valor)}</td>
                                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.observacao || '—'}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{r.user_nome || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'historico' && (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Abertura</th>
                                    <th>Vendas</th>
                                    <th>Sangrias</th>
                                    <th>Saldo Esperado</th>
                                    <th>Fechamento</th>
                                    <th>Diferença</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historico.map((dia) => {
                                    const isHoje = dia.data === todayStr;
                                    return (
                                        <tr key={dia.data} style={{ background: isHoje ? 'rgba(99,102,241,0.05)' : undefined }}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{fmtDate(dia.data)}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isHoje ? 'Hoje' : dia.dia_semana}</div>
                                            </td>
                                            <td>
                                                {!dia.aberto ? (
                                                    <span className="badge badge-secondary">Sem movimento</span>
                                                ) : dia.fechado ? (
                                                    <span className="badge badge-success">Fechado</span>
                                                ) : (
                                                    <span className="badge badge-warning">Aberto</span>
                                                )}
                                            </td>
                                            <td>{dia.abertura_valor != null ? fmt(dia.abertura_valor) : '—'}</td>
                                            <td style={{ color: '#10b981', fontWeight: 600 }}>
                                                {fmt(dia.total_vendas)}
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dia.num_vendas} venda(s)</div>
                                            </td>
                                            <td style={{ color: dia.total_sangrias > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                                {dia.total_sangrias > 0 ? `− ${fmt(dia.total_sangrias)}` : '—'}
                                            </td>
                                            <td style={{ fontWeight: 700 }}>
                                                {dia.saldo_esperado != null ? fmt(dia.saldo_esperado) : '—'}
                                            </td>
                                            <td>
                                                {dia.fechamento_valor != null ? fmt(dia.fechamento_valor) : '—'}
                                            </td>
                                            <td>
                                                {dia.diferenca != null ? (
                                                    <span style={{ fontWeight: 700, color: dia.diferenca >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {dia.diferenca >= 0 ? '+' : ''}{fmt(dia.diferenca)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Caixa;
