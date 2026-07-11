import { useState, useEffect } from 'react';
import { suppliersAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import FormModal from '../components/FormModal';

const maskCNPJ = (v) => {
    v = v.replace(/\D/g, '').slice(0, 14);
    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0,2)}.${v.slice(2)}`;
    if (v.length <= 8) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
    if (v.length <= 12) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
    return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
};

const maskPhone = (v) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 2) return v.length ? `(${v}` : '';
    if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
};

const maskCPF = (v) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
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

const validateCNPJ = (cnpj) => {
    const n = cnpj.replace(/\D/g, '');
    if (n.length !== 14) return false;
    if (/^(\d)\1+$/.test(n)) return false;
    const calc = (x) => {
        let s = 0, p = x === 12 ? 5 : 6;
        for (let i = 0; i < x; i++) {
            s += parseInt(n[i]) * p--;
            if (p < 2) p = 9;
        }
        const r = s % 11;
        return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === parseInt(n[12]) && calc(13) === parseInt(n[13]);
};

function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [search, setSearch] = useState('');
    const [cnpjError, setCnpjError] = useState('');
    const [cpfError, setCpfError] = useState('');
    const [formData, setFormData] = useState({
        tipo: 'formal',
        nome: '',
        cnpj: '',
        cpf: '',
        telefone: '',
        email: '',
        endereco: '',
    });
    const [message, setMessage] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => { loadSuppliers(); }, []);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const response = await suppliersAPI.getAll();
            setSuppliers(response.data);
        } catch {
            showMessage('Erro ao carregar fornecedores', 'danger');
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
        if (name === 'cnpj') {
            setCnpjError('');
            setFormData(prev => ({ ...prev, cnpj: maskCNPJ(value) }));
        } else if (name === 'cpf') {
            setCpfError('');
            setFormData(prev => ({ ...prev, cpf: maskCPF(value) }));
        } else if (name === 'telefone') {
            setFormData(prev => ({ ...prev, telefone: maskPhone(value) }));
        } else if (name === 'tipo') {
            setFormData(prev => ({ ...prev, tipo: value, cnpj: '', cpf: '' }));
            setCnpjError('');
            setCpfError('');
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.tipo === 'formal') {
            if (!formData.cnpj) {
                setCnpjError('CNPJ é obrigatório para fornecedor formal.');
                return;
            }
            if (!validateCNPJ(formData.cnpj)) {
                setCnpjError('CNPJ inválido. Verifique os dígitos.');
                return;
            }
        }
        if (formData.tipo === 'pessoa_fisica' && formData.cpf) {
            if (!validateCPF(formData.cpf)) {
                setCpfError('CPF inválido. Verifique os dígitos.');
                return;
            }
        }
        setCnpjError('');
        setCpfError('');
        try {
            const data = {
                ...formData,
                cnpj: formData.tipo === 'formal' ? (formData.cnpj || null) : null,
                cpf: formData.tipo === 'pessoa_fisica' ? (formData.cpf || null) : null,
            };
            if (editingSupplier) {
                await suppliersAPI.update(editingSupplier.id, data);
                showMessage('Fornecedor atualizado com sucesso!');
            } else {
                await suppliersAPI.create(data);
                showMessage('Fornecedor criado com sucesso!');
            }
            resetForm();
            loadSuppliers();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Erro ao salvar fornecedor', 'danger');
        }
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            tipo: supplier.tipo || 'formal',
            nome: supplier.nome,
            cnpj: supplier.cnpj || '',
            cpf: supplier.cpf || '',
            telefone: supplier.telefone || '',
            email: supplier.email || '',
            endereco: supplier.endereco || '',
        });
        setCnpjError('');
        setCpfError('');
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        setConfirmDelete(null);
        try {
            await suppliersAPI.delete(id);
            showMessage('Fornecedor excluído com sucesso!');
            loadSuppliers();
        } catch {
            showMessage('Erro ao excluir fornecedor', 'danger');
        }
    };

    const resetForm = () => {
        setFormData({ tipo: 'formal', nome: '', cnpj: '', cpf: '', telefone: '', email: '', endereco: '' });
        setEditingSupplier(null);
        setCnpjError('');
        setCpfError('');
        setShowForm(false);
    };

    const filtered = suppliers.filter(s => {
        const q = search.toLowerCase();
        return (
            s.nome.toLowerCase().includes(q) ||
            (s.cnpj || '').includes(q) ||
            (s.tipo || '').includes(q)
        );
    });

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="fade-in">
            {confirmDelete && (
                <ConfirmModal
                    title="Excluir fornecedor?"
                    message={`"${confirmDelete.nome}" será removido permanentemente.`}
                    onConfirm={() => handleDelete(confirmDelete.id)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Fornecedores</h1>
                    <p className="text-muted">Gerenciar fornecedores</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                    + Novo Fornecedor
                </button>
            </div>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {showForm && (
                <FormModal
                    title={editingSupplier ? `Editar Fornecedor — ${editingSupplier?.nome}` : 'Novo Fornecedor'}
                    onClose={resetForm}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Tipo *</label>
                                <select name="tipo" className="form-input" value={formData.tipo} onChange={handleInputChange}>
                                    <option value="formal">Pessoa Jurídica (com CNPJ)</option>
                                    <option value="pessoa_fisica">Pessoa Física (com CPF)</option>
                                    <option value="autonomo">Autônomo / MEI</option>
                                    <option value="informal">Informal (sacoleiro, feira, etc.)</option>
                                </select>
                            </div>
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

                            {formData.tipo === 'formal' && (
                                <div className="form-group">
                                    <label className="form-label">CNPJ *</label>
                                    <input
                                        type="text"
                                        name="cnpj"
                                        className={`form-input ${cnpjError ? 'input-error' : ''}`}
                                        value={formData.cnpj}
                                        onChange={handleInputChange}
                                        placeholder="00.000.000/0000-00"
                                        style={{ textTransform: 'none' }}
                                    />
                                    {cnpjError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{cnpjError}</span>}
                                </div>
                            )}
                            {formData.tipo === 'pessoa_fisica' && (
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
                                    {cpfError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{cpfError}</span>}
                                </div>
                            )}

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
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Endereço</label>
                                <input
                                    type="text"
                                    name="endereco"
                                    className="form-input"
                                    value={formData.endereco}
                                    onChange={handleInputChange}
                                    placeholder="Rua, número, cidade..."
                                />
                            </div>
                        </div>

                        {formData.tipo === 'informal' && (
                            <div style={{
                                margin: '0.5rem 0 1rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid #f59e0b',
                                color: '#f59e0b',
                                fontSize: '0.875rem',
                            }}>
                                ⚠️ Fornecedor informal — sem CNPJ. Usado para compras em feiras, sacoleiros e similares.
                            </div>
                        )}

                        <div className="flex gap-md mt-lg">
                            <button type="submit" className="btn btn-success">
                                {editingSupplier ? 'Atualizar' : 'Criar'} Fornecedor
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
                    <h3 className="card-title">Lista de Fornecedores ({filtered.length})</h3>
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="🔍 Buscar por nome ou CNPJ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ textTransform: 'none' }}
                    />
                </div>
                {filtered.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>CNPJ</th>
                                    <th>Telefone</th>
                                    <th>Email</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td>{supplier.nome}</td>
                                        <td>
                                            <span className={`badge ${supplier.tipo === 'formal' ? 'badge-primary' : supplier.tipo === 'pessoa_fisica' ? 'badge-success' : 'badge-secondary'}`}>
                                                {{ formal: 'Pessoa Jurídica', pessoa_fisica: 'Pessoa Física', autonomo: 'Autônomo/MEI', informal: 'Informal' }[supplier.tipo] || supplier.tipo}
                                            </span>
                                        </td>
                                        <td>{supplier.cnpj || '-'}</td>
                                        <td>{supplier.telefone || '-'}</td>
                                        <td>{supplier.email || '-'}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button className="btn btn-sm btn-primary" onClick={() => handleEdit(supplier)}>Editar</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(supplier)}>Excluir</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p className="text-muted">{search ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Suppliers;
