import { useState, useEffect, useMemo } from 'react';
import { movementsAPI, productsAPI, customersAPI, suppliersAPI } from '../services/api';
import FormModal from '../components/FormModal';

const MOTIVOS = {
    ENTRADA: ['Compra de fornecedor', 'Ajuste de inventário', 'Devolução de cliente', 'Transferência', 'Outro'],
    SAIDA: ['Venda manual', 'Perda / Avaria', 'Ajuste de inventário', 'Transferência', 'Outro'],
    DEVOLUCAO: ['Defeito no produto', 'Troca de tamanho', 'Desistência', 'Outro'],
};

const PERIOD_OPTIONS = [
    { label: 'Hoje', value: 'today' },
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: 'Tudo', value: 'all' },
];

function isWithinPeriod(dateString, period) {
    if (period === 'all') return true;
    const date = new Date(dateString);
    const now = new Date();
    if (period === 'today') return date.toDateString() === now.toDateString();
    const days = period === '7d' ? 7 : 30;
    return date >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function Movements() {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterTipo, setFilterTipo] = useState('ALL');
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [formData, setFormData] = useState({
        product_id: '',
        tipo: 'ENTRADA',
        quantidade: '',
        motivo: '',
        observacao: '',
        customer_id: '',
        supplier_id: '',
    });
    const [message, setMessage] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [movementsRes, productsRes, customersRes, suppliersRes] = await Promise.all([
                movementsAPI.getAll({ limit: 1000 }),
                productsAPI.getAll(),
                customersAPI.getAll(),
                suppliersAPI.getAll(),
            ]);
            setMovements(movementsRes.data);
            setProducts(productsRes.data);
            setCustomers(customersRes.data);
            setSuppliers(suppliersRes.data);
        } catch {
            showMessage('Erro ao carregar dados', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'tipo') {
            setFormData((prev) => ({ ...prev, tipo: value, motivo: '' }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));
        if (formData.tipo === 'SAIDA' && selectedProduct) {
            if (parseInt(formData.quantidade) > selectedProduct.quantidade_estoque) {
                showMessage(`Estoque insuficiente. Disponível: ${selectedProduct.quantidade_estoque} unidades.`, 'danger');
                return;
            }
        }
        try {
            const data = {
                product_id: parseInt(formData.product_id),
                tipo: formData.tipo,
                quantidade: parseInt(formData.quantidade),
                motivo: formData.motivo,
                observacao: formData.observacao,
                customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
                supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
            };
            await movementsAPI.create(data);
            showMessage('Movimentação registrada com sucesso!');
            resetForm();
            loadData();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Erro ao registrar movimentação', 'danger');
        }
    };

    const resetForm = () => {
        setFormData({ product_id: '', tipo: 'ENTRADA', quantidade: '', motivo: '', observacao: '', customer_id: '', supplier_id: '' });
        setShowForm(false);
    };

    const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

    const filtered = useMemo(() => {
        setPage(1);
        return movements.filter(m => {
            if (filterTipo !== 'ALL' && m.tipo !== filterTipo) return false;
            return isWithinPeriod(m.created_at, filterPeriod);
        });
    }, [movements, filterTipo, filterPeriod]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const summary = useMemo(() => {
        const base = movements.filter(m => isWithinPeriod(m.created_at, filterPeriod));
        return {
            entradas: base.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.quantidade, 0),
            saidas: base.filter(m => m.tipo === 'SAIDA').reduce((s, m) => s + m.quantidade, 0),
            devolucoes: base.filter(m => m.tipo === 'DEVOLUCAO').reduce((s, m) => s + m.quantidade, 0),
        };
    }, [movements, filterPeriod]);

    const getProductName = (id) => { const p = products.find(p => p.id === id); return p ? `${p.codigo} - ${p.nome}` : 'N/A'; };
    const getCustomerName = (id) => { if (!id) return '-'; const c = customers.find(c => c.id === id); return c ? c.nome : 'N/A'; };
    const getSupplierName = (id) => { if (!id) return '-'; const s = suppliers.find(s => s.id === id); return s ? s.nome : 'N/A'; };
    const formatDate = (d) => new Date(d).toLocaleString('pt-BR');

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    const pillBase = { padding: '0.3rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: 'transparent' };

    return (
        <div className="fade-in">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Movimentação de Estoque</h1>
                    <p className="text-muted">Registrar entradas e saídas de produtos</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                    + Nova Movimentação
                </button>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-3 mb-xl">
                <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '2rem' }}>📥</div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Entradas</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>+{summary.entradas}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '2rem' }}>📤</div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Saídas</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>-{summary.saidas}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '2rem' }}>🔄</div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Devoluções</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>{summary.devolucoes}</div>
                    </div>
                </div>
            </div>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {showForm && (
                <FormModal
                    title="Nova Movimentação"
                    onClose={resetForm}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Tipo *</label>
                                <select name="tipo" className="form-select" value={formData.tipo} onChange={handleInputChange} required>
                                    <option value="ENTRADA">📥 Entrada</option>
                                    <option value="SAIDA">📤 Saída</option>
                                    <option value="DEVOLUCAO">🔄 Devolução</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Produto *</label>
                                <select name="product_id" className="form-select" value={formData.product_id} onChange={handleInputChange} required>
                                    <option value="">Selecione um produto</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.codigo} - {p.nome} (Estoque: {p.quantidade_estoque})
                                        </option>
                                    ))}
                                </select>
                                {selectedProduct && (
                                    <div style={{
                                        marginTop: '6px', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                                        background: selectedProduct.quantidade_estoque <= selectedProduct.estoque_minimo ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                        color: selectedProduct.quantidade_estoque <= selectedProduct.estoque_minimo ? '#ef4444' : '#10b981',
                                        fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                    }}>
                                        {selectedProduct.quantidade_estoque <= selectedProduct.estoque_minimo ? '⚠️' : '✅'}
                                        Estoque atual: <strong>{selectedProduct.quantidade_estoque}</strong> unidades
                                        {selectedProduct.quantidade_estoque <= selectedProduct.estoque_minimo && ' — Estoque baixo!'}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantidade *</label>
                                <input
                                    type="number"
                                    name="quantidade"
                                    className="form-input"
                                    value={formData.quantidade}
                                    onChange={handleInputChange}
                                    min="1"
                                    max={formData.tipo === 'SAIDA' && selectedProduct ? selectedProduct.quantidade_estoque : undefined}
                                    required
                                />
                                {formData.tipo === 'SAIDA' && selectedProduct && formData.quantidade && parseInt(formData.quantidade) > selectedProduct.quantidade_estoque && (
                                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                                        ⚠️ Quantidade superior ao estoque disponível ({selectedProduct.quantidade_estoque})
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Motivo</label>
                                <select name="motivo" className="form-select" value={formData.motivo} onChange={handleInputChange}>
                                    <option value="">Selecione um motivo</option>
                                    {MOTIVOS[formData.tipo].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            {formData.tipo === 'SAIDA' && (
                                <div className="form-group">
                                    <label className="form-label">Cliente</label>
                                    <select name="customer_id" className="form-select" value={formData.customer_id} onChange={handleInputChange}>
                                        <option value="">Selecione um cliente (opcional)</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                            )}
                            {formData.tipo === 'ENTRADA' && (
                                <div className="form-group">
                                    <label className="form-label">Fornecedor</label>
                                    <select name="supplier_id" className="form-select" value={formData.supplier_id} onChange={handleInputChange}>
                                        <option value="">Selecione um fornecedor (opcional)</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Observação</label>
                                <textarea name="observacao" className="form-textarea" value={formData.observacao} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="flex gap-md mt-lg">
                            <button type="submit" className="btn btn-success">Registrar Movimentação</button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
                        </div>
                    </form>
                </FormModal>
            )}

            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <h3 className="card-title">Histórico ({filtered.length})</h3>
                    <div className="flex gap-sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Filtro período */}
                        <div className="flex gap-sm">
                            {PERIOD_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => setFilterPeriod(opt.value)} style={{
                                    ...pillBase,
                                    background: filterPeriod === opt.value ? 'var(--primary)' : 'transparent',
                                    color: filterPeriod === opt.value ? '#fff' : 'var(--text-secondary)',
                                }}>{opt.label}</button>
                            ))}
                        </div>
                        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
                        {/* Filtro tipo */}
                        <div className="flex gap-sm">
                            {[
                                { value: 'ALL', label: 'Todos' },
                                { value: 'ENTRADA', label: '📥 Entradas' },
                                { value: 'SAIDA', label: '📤 Saídas' },
                                { value: 'DEVOLUCAO', label: '🔄 Dev.' },
                            ].map(opt => (
                                <button key={opt.value} onClick={() => setFilterTipo(opt.value)} style={{
                                    ...pillBase,
                                    background: filterTipo === opt.value ? 'var(--bg-tertiary)' : 'transparent',
                                    color: filterTipo === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: filterTipo === opt.value ? 700 : 400,
                                    whiteSpace: 'nowrap',
                                }}>{opt.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
                {filtered.length > 0 ? (
                    <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Tipo</th>
                                    <th>Produto</th>
                                    <th>Qtd</th>
                                    <th>Motivo</th>
                                    <th>Cliente/Fornecedor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((m) => (
                                    <tr key={m.id}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(m.created_at)}</td>
                                        <td>
                                            {m.tipo === 'ENTRADA'
                                                ? <span className="badge badge-success">📥 Entrada</span>
                                                : m.tipo === 'DEVOLUCAO'
                                                    ? <span className="badge badge-warning">🔄 Devolução</span>
                                                    : <span className="badge badge-danger">📤 Saída</span>}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{getProductName(m.product_id)}</td>
                                        <td>
                                            <span style={{
                                                fontWeight: 700, fontSize: '0.95rem',
                                                color: m.tipo === 'ENTRADA' ? '#10b981' : m.tipo === 'DEVOLUCAO' ? '#f59e0b' : '#ef4444',
                                            }}>
                                                {m.tipo === 'ENTRADA' ? '▲' : m.tipo === 'DEVOLUCAO' ? '↩' : '▼'} {m.quantidade}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{m.motivo || '-'}</td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {m.tipo === 'ENTRADA' ? getSupplierName(m.supplier_id) : getCustomerName(m.customer_id)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Anterior</button>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Página {page} de {totalPages}</span>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próximo ›</button>
                        </div>
                    )}
                    </>
                ) : (
                    <div className="empty-state">
                        <p className="text-muted">Nenhuma movimentação encontrada para o filtro selecionado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Movements;
