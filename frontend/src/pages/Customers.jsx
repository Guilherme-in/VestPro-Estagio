import { useState, useEffect } from 'react';
import { customersAPI, salesAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import FormModal from '../components/FormModal';

const PAGE_SIZE = 20;
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const maskCEP = (v) => {
    v = v.replace(/\D/g, '').slice(0, 8);
    if (v.length <= 5) return v;
    return `${v.slice(0,5)}-${v.slice(5)}`;
};

const maskCPF = (v) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
};

const maskPhone = (v) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 2) return v.length ? `(${v}` : '';
    if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
};

const validateCPF = (cpf) => {
    const n = cpf.replace(/\D/g, '');
    if (n.length !== 11) return false;
    if (/^(\d)\1+$/.test(n)) return false;
    const calc = (x) => {
        let s = 0;
        for (let i = 0; i < x; i++) s += parseInt(n[i]) * (x + 1 - i);
        const r = (s * 10) % 11;
        return r === 10 || r === 11 ? 0 : r;
    };
    return calc(9) === parseInt(n[9]) && calc(10) === parseInt(n[10]);
};

// Exibe como ***.000.000-** para proteção
const maskCPFDisplay = (cpf) => {
    if (!cpf) return '-';
    const n = cpf.replace(/\D/g, '');
    if (n.length !== 11) return cpf;
    return `***.${n.slice(3,6)}.${n.slice(6,9)}-**`;
};

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [search, setSearch] = useState('');
    const [cpfError, setCpfError] = useState('');
    const [cep, setCep] = useState('');
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState('');
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        endereco: '',
    });
    const [message, setMessage] = useState(null);
    const [historyModal, setHistoryModal] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [page, setPage] = useState(1);

    useEffect(() => { loadCustomers(); }, []);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const response = await customersAPI.getAll();
            setCustomers(response.data);
        } catch {
            showMessage('Erro ao carregar clientes', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleCepChange = async (e) => {
        const masked = maskCEP(e.target.value);
        setCep(masked);
        setCepError('');
        const digits = masked.replace(/\D/g, '');
        if (digits.length === 8) {
            setCepLoading(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
                const data = await res.json();
                if (data.erro) {
                    setCepError('CEP não encontrado.');
                } else {
                    const endereco = [data.logradouro, data.bairro, data.localidade, data.uf]
                        .filter(Boolean).join(', ');
                    setFormData(prev => ({ ...prev, endereco }));
                    setCepError('');
                }
            } catch {
                setCepError('Erro ao buscar CEP. Verifique sua conexão.');
            } finally {
                setCepLoading(false);
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'cpf') {
            setCpfError('');
            setFormData(prev => ({ ...prev, cpf: maskCPF(value) }));
        } else if (name === 'telefone') {
            setFormData(prev => ({ ...prev, telefone: maskPhone(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.cpf) {
            if (!validateCPF(formData.cpf)) {
                setCpfError('CPF inválido. Verifique os dígitos.');
                return;
            }
        }
        setCpfError('');
        try {
            const data = { ...formData, cpf: formData.cpf || null };
            if (editingCustomer) {
                await customersAPI.update(editingCustomer.id, data);
                showMessage('Cliente atualizado com sucesso!');
            } else {
                await customersAPI.create(data);
                showMessage('Cliente criado com sucesso!');
            }
            resetForm();
            loadCustomers();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Erro ao salvar cliente', 'danger');
        }
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            nome: customer.nome,
            cpf: customer.cpf || '',
            telefone: customer.telefone || '',
            email: customer.email || '',
            endereco: customer.endereco || '',
        });
        setCpfError('');
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        setConfirmDelete(null);
        try {
            await customersAPI.delete(id);
            showMessage('Cliente excluído com sucesso!');
            loadCustomers();
        } catch {
            showMessage('Erro ao excluir cliente', 'danger');
        }
    };

    const openHistory = async (customer) => {
        setHistoryModal({ customer, sales: [], loading: true });
        try {
            const r = await salesAPI.getAll({ customer_id: customer.id });
            setHistoryModal({ customer, sales: r.data, loading: false });
        } catch {
            setHistoryModal({ customer, sales: [], loading: false });
        }
    };

    const resetForm = () => {
        setFormData({ nome: '', cpf: '', telefone: '', email: '', endereco: '' });
        setEditingCustomer(null);
        setCpfError('');
        setCep('');
        setCepError('');
        setShowForm(false);
    };

    const handleSearch = (val) => { setSearch(val); setPage(1); };

    const filtered = customers.filter(c => {
        const q = search.replace(/\D/g, '');
        const qText = search.toLowerCase();
        const cpfDigits = (c.cpf || '').replace(/\D/g, '');
        return (
            c.nome.toLowerCase().includes(qText) ||
            (c.telefone || '').includes(qText) ||
            (q.length > 0 && cpfDigits.includes(q))
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="fade-in">
            {confirmDelete && (
                <ConfirmModal
                    title="Excluir cliente?"
                    message={`"${confirmDelete.nome}" será removido permanentemente.`}
                    onConfirm={() => handleDelete(confirmDelete.id)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Clientes</h1>
                    <p className="text-muted">Gerenciar clientes</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                    + Novo Cliente
                </button>
            </div>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {showForm && (
                <FormModal
                    title={editingCustomer ? `Editar Cliente — ${editingCustomer?.nome}` : 'Novo Cliente'}
                    onClose={resetForm}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Nome *</label>
                                <input
                                    type="text"
                                    name="nome"
                                    className="form-input"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CPF <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                                <input
                                    type="text"
                                    name="cpf"
                                    className={`form-input ${cpfError ? 'input-error' : ''}`}
                                    value={formData.cpf}
                                    onChange={handleInputChange}
                                    placeholder="000.000.000-00"
                                    style={{ textTransform: 'none' }}
                                />
                                {cpfError && (
                                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                                        {cpfError}
                                    </span>
                                )}
                                {!cpfError && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                        💡 Deixe em branco para clientes sem cadastro de CPF
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Telefone</label>
                                <input
                                    type="text"
                                    name="telefone"
                                    className="form-input"
                                    value={formData.telefone}
                                    onChange={handleInputChange}
                                    placeholder="(00) 00000-0000"
                                    style={{ textTransform: 'none' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CEP</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={cep}
                                        onChange={handleCepChange}
                                        placeholder="00000-000"
                                        style={{ textTransform: 'none', paddingRight: cepLoading ? '2.5rem' : undefined }}
                                    />
                                    {cepLoading && (
                                        <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>
                                            ⏳
                                        </span>
                                    )}
                                </div>
                                {cepError && (
                                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{cepError}</span>
                                )}
                                {!cepError && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                        💡 Digite o CEP para preencher o endereço automaticamente
                                    </span>
                                )}
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Endereço</label>
                                <input
                                    type="text"
                                    name="endereco"
                                    className="form-input"
                                    value={formData.endereco}
                                    onChange={handleInputChange}
                                    placeholder="Rua, número, bairro, cidade..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-md mt-lg">
                            <button type="submit" className="btn btn-success">
                                {editingCustomer ? 'Atualizar' : 'Criar'} Cliente
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </FormModal>
            )}

            <div className="card">
                <div className="card-header flex justify-between items-center">
                    <h3 className="card-title">Lista de Clientes ({filtered.length})</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => {
                        const sep = ';';
                        const header = ['Nome','CPF','Telefone','Email','Endereço'].join(sep);
                        const lines = filtered.map(c => [c.nome, c.cpf||'', c.telefone||'', c.email||'', c.endereco||''].join(sep));
                        const csv = '﻿' + [header, ...lines].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                        a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                    }}>📊 CSV</button>
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="🔍 Buscar por nome, CPF ou telefone..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ textTransform: 'none' }}
                    />
                    </div>
                </div>
                {filtered.length > 0 ? (
                    <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>Telefone</th>
                                    <th>Email</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((customer) => (
                                    <tr key={customer.id}>
                                        <td>{customer.nome}</td>
                                        <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                            {maskCPFDisplay(customer.cpf)}
                                        </td>
                                        <td>{customer.telefone || '-'}</td>
                                        <td>{customer.email || '-'}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button className="btn btn-sm btn-secondary" onClick={() => openHistory(customer)}>Histórico</button>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleEdit(customer)}>Editar</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(customer)}>Excluir</button>
                                            </div>
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
                        <p className="text-muted">
                            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
                        </p>
                    </div>
                )}
            </div>

        {/* Modal Historico de Compras */}
        {historyModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Histórico de Compras</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{historyModal.customer.nome}</p>
                        </div>
                        <button onClick={() => setHistoryModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem 0.5rem' }}>✕</button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem' }}>
                        {historyModal.loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando...</div>
                        ) : historyModal.sales.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma compra registrada para este cliente.</div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Data</th>
                                        <th>Itens</th>
                                        <th>Pagamento</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyModal.sales.map(sale => (
                                        <tr key={sale.id}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{sale.id}</td>
                                            <td style={{ fontSize: '0.875rem' }}>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                                            <td style={{ fontSize: '0.875rem' }}>{sale.items?.length || 0} produto(s)</td>
                                            <td style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>{sale.forma_pagamento}</td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{fmt(sale.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {!historyModal.loading && historyModal.sales.length > 0 && (
                        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{historyModal.sales.length} venda(s) no total</span>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>
                                Total gasto: {fmt(historyModal.sales.reduce((s, v) => s + v.total, 0))}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
    );
}

export default Customers;

