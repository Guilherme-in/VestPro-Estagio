import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import FormModal from '../components/FormModal';

const ROLES = [
    { value: 'ADMIN', label: 'Administrador', badge: 'badge-danger', icon: '🔐' },
    { value: 'GERENTE', label: 'Gerente', badge: 'badge-warning', icon: '📋' },
    { value: 'VENDEDOR', label: 'Vendedor', badge: 'badge-success', icon: '🛍️' },
];

// Permissões extras que podem ser concedidas individualmente
const EXTRA_PERMISSIONS = [
    {
        key: 'cancelar_vendas',
        label: 'Cancelar vendas registradas',
        descricao: 'Permite cancelar vendas já salvas no histórico e restaurar o estoque',
        icon: '🔁',
        disponivelPara: ['VENDEDOR'],
    },
    {
        key: 'cadastrar_produtos',
        label: 'Cadastrar e editar produtos',
        descricao: 'Permite criar, editar produtos, categorias e fornecedores',
        icon: '📦',
        disponivelPara: ['VENDEDOR'],
    },
    {
        key: 'movimentacao_estoque',
        label: 'Movimentação manual de estoque',
        descricao: 'Permite registrar entradas, saídas e devoluções de estoque',
        icon: '📊',
        disponivelPara: ['VENDEDOR'],
    },
    {
        key: 'gerenciar_clientes',
        label: 'Gerenciar clientes e fornecedores',
        descricao: 'Permite criar, editar e excluir clientes e fornecedores',
        icon: '👥',
        disponivelPara: ['VENDEDOR'],
    },
    {
        key: 'ver_relatorios',
        label: 'Acessar relatórios financeiros',
        descricao: 'Permite visualizar e exportar relatórios de lucratividade e devoluções',
        icon: '📈',
        disponivelPara: ['VENDEDOR', 'GERENTE'],
    },
    {
        key: 'ver_auditoria',
        label: 'Visualizar log de auditoria',
        descricao: 'Permite acessar o histórico completo de ações do sistema',
        icon: '🔍',
        disponivelPara: ['GERENTE'],
    },
];

const ROLE_PERMISSIONS = {
    ADMIN: {
        label: 'Acesso Total',
        color: '#ef4444',
        descricao: 'Controle completo do sistema. Indicado para o dono ou responsável geral da loja.',
        grupos: [
            {
                titulo: 'Funcionários',
                items: [
                    { ok: true,  texto: 'Criar, editar e desativar funcionários' },
                    { ok: true,  texto: 'Redefinir senhas de qualquer usuário' },
                    { ok: true,  texto: 'Alterar perfis de acesso (Admin/Gerente/Vendedor)' },
                ],
            },
            {
                titulo: 'Vendas e Caixa',
                items: [
                    { ok: true,  texto: 'Realizar vendas no PDV' },
                    { ok: true,  texto: 'Cancelar vendas já registradas' },
                    { ok: true,  texto: 'Abrir, fechar, sangria e reforço de caixa' },
                ],
            },
            {
                titulo: 'Estoque e Cadastros',
                items: [
                    { ok: true,  texto: 'Cadastrar e editar produtos, categorias, fornecedores e clientes' },
                    { ok: true,  texto: 'Registrar entradas, saídas e devoluções de estoque' },
                    { ok: true,  texto: 'Excluir registros do sistema' },
                ],
            },
            {
                titulo: 'Relatórios e Auditoria',
                items: [
                    { ok: true,  texto: 'Relatórios financeiros, de lucratividade e devoluções' },
                    { ok: true,  texto: 'Exportar todos os relatórios em PDF' },
                    { ok: true,  texto: 'Visualizar log completo de auditoria do sistema' },
                    { ok: true,  texto: 'Configurações gerais da loja' },
                ],
            },
        ],
    },
    GERENTE: {
        label: 'Acesso Intermediário',
        color: '#f59e0b',
        descricao: 'Gestão operacional completa. Indicado para supervisores e gerentes de loja.',
        grupos: [
            {
                titulo: 'Vendas e Caixa',
                items: [
                    { ok: true,  texto: 'Realizar vendas no PDV' },
                    { ok: true,  texto: 'Cancelar vendas já registradas' },
                    { ok: true,  texto: 'Abrir, fechar, sangria e reforço de caixa' },
                ],
            },
            {
                titulo: 'Estoque e Cadastros',
                items: [
                    { ok: true,  texto: 'Cadastrar e editar produtos, categorias, fornecedores e clientes' },
                    { ok: true,  texto: 'Registrar entradas, saídas e devoluções de estoque' },
                    { ok: false, texto: 'Excluir produtos com histórico de vendas' },
                ],
            },
            {
                titulo: 'Relatórios',
                items: [
                    { ok: true,  texto: 'Relatórios financeiros e de lucratividade' },
                    { ok: true,  texto: 'Exportar relatórios em PDF' },
                    { ok: false, texto: 'Log de auditoria e configurações da loja' },
                ],
            },
            {
                titulo: 'Funcionários',
                items: [
                    { ok: false, texto: 'Criar ou excluir funcionários' },
                    { ok: false, texto: 'Alterar perfis de acesso' },
                ],
            },
        ],
    },
    VENDEDOR: {
        label: 'Acesso Básico',
        color: '#10b981',
        descricao: 'Operações do dia a dia no ponto de venda. Indicado para atendentes e caixas.',
        grupos: [
            {
                titulo: 'Vendas e Caixa',
                items: [
                    { ok: true,  texto: 'Realizar vendas no PDV com desconto' },
                    { ok: true,  texto: 'Abrir, fechar, sangria e reforço de caixa' },
                    { ok: false, texto: 'Cancelar vendas já registradas no histórico' },
                ],
            },
            {
                titulo: 'Produtos e Clientes',
                items: [
                    { ok: true,  texto: 'Consultar produtos, preços e estoque disponível' },
                    { ok: true,  texto: 'Cadastrar e editar clientes' },
                    { ok: false, texto: 'Criar ou editar produtos, categorias e fornecedores' },
                ],
            },
            {
                titulo: 'Estoque e Relatórios',
                items: [
                    { ok: false, texto: 'Registrar movimentações manuais de estoque' },
                    { ok: false, texto: 'Acessar relatórios financeiros ou de lucratividade' },
                    { ok: false, texto: 'Exportar PDFs ou visualizar auditoria' },
                ],
            },
        ],
    },
};

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ nome }) {
    const initial = nome ? nome.charAt(0).toUpperCase() : '?';
    const color = getAvatarColor(nome || '');
    return (
        <div style={{
            width: '36px', height: '36px', borderRadius: '50%', background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
        }}>{initial}</div>
    );
}

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ nome: '', email: '', username: '', password: '', role: 'VENDEDOR', permissoes_extras: [] });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resetModal, setResetModal] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetError, setResetError] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const r = await usersAPI.getAll();
            setUsers(r.data);
        } catch {
            setError('Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ nome: '', email: '', username: '', password: '', role: 'VENDEDOR', permissoes_extras: [] });
        setError('');
        setShowForm(true);
        setTimeout(() => document.getElementById('field-nome')?.focus(), 50);
    };

    const openEdit = (user) => {
        setEditing(user);
        setForm({ nome: user.nome, email: user.email, username: user.username, password: '', role: user.role, permissoes_extras: user.permissoes_extras || [] });
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = { ...form };
            if (!data.password) delete data.password;
            if (editing) {
                await usersAPI.update(editing.id, data);
                showSuccess('Funcionário atualizado com sucesso!');
            } else {
                await usersAPI.create(data);
                showSuccess('Funcionário criado com sucesso!');
            }
            resetForm();
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao salvar usuário.');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await usersAPI.update(user.id, { ativo: !user.ativo });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao atualizar usuário.');
        }
    };

    const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) { setResetError('A senha deve ter pelo menos 6 caracteres.'); return; }
        try {
            await usersAPI.update(resetModal.id, { password: newPassword });
            showSuccess(`Senha de ${resetModal.nome} redefinida com sucesso!`);
            setResetModal(null);
            setNewPassword('');
            setResetError('');
        } catch (err) {
            setResetError(err.response?.data?.detail || 'Erro ao redefinir senha.');
        }
    };

    const resetForm = () => {
        setForm({ nome: '', email: '', username: '', password: '', role: 'VENDEDOR', permissoes_extras: [] });
        setEditing(null);
        setError('');
        setShowForm(false);
    };

    const roleInfo = (role) => ROLES.find(r => r.value === role) || { label: role, badge: 'badge-secondary', icon: '👤' };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return (
            u.nome.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            roleInfo(u.role).label.toLowerCase().includes(q)
        );
    });

    const activeCount = users.filter(u => u.ativo).length;
    const inactiveCount = users.length - activeCount;

    const selectedRolePermissions = ROLE_PERMISSIONS[form.role];

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <>
        <div className="fade-in">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Funcionários</h1>
                    <p className="text-muted">
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{activeCount} ativo{activeCount !== 1 ? 's' : ''}</span>
                        {inactiveCount > 0 && <span style={{ color: 'var(--text-muted)' }}> · {inactiveCount} inativo{inactiveCount !== 1 ? 's' : ''}</span>}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    + Novo Funcionário
                </button>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && !showForm && <div className="alert alert-danger">{error}</div>}

            {showForm && (
                <FormModal
                    title={editing ? `Editar Funcionário — ${editing?.nome}` : 'Novo Funcionário'}
                    onClose={resetForm}
                    maxWidth={800}
                >
                    <form onSubmit={handleSubmit}>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Nome completo *</label>
                                <input
                                    id="field-nome"
                                    type="text"
                                    className="form-input"
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    placeholder="Ex: Maria Silva"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Usuário (login) *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.username}
                                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                    placeholder="Ex: maria.silva"
                                    required
                                    disabled={!!editing}
                                    style={{ textTransform: 'none' }}
                                />
                                {editing && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                        💡 O nome de usuário não pode ser alterado
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">E-mail *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="Ex: maria@loja.com"
                                    required
                                    style={{ textTransform: 'none' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    {editing ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder={editing ? '••••••' : 'Mínimo 6 caracteres'}
                                    required={!editing}
                                    minLength={6}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Perfil de acesso *</label>
                                <select
                                    className="form-select"
                                    value={form.role}
                                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                >
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Painel de permissões */}
                            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '100%', padding: '0.85rem 1rem',
                                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${selectedRolePermissions?.color || 'var(--border)'}`,
                                }}>
                                    {/* Cabeçalho */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                        <span style={{ fontSize: '1rem' }}>{roleInfo(form.role).icon}</span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: selectedRolePermissions?.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            {selectedRolePermissions?.label}
                                        </span>
                                    </div>
                                    {/* Descrição */}
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                                        {selectedRolePermissions?.descricao}
                                    </p>
                                    {/* Grupos */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {selectedRolePermissions?.grupos.map(grupo => (
                                            <div key={grupo.titulo}>
                                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                                                    {grupo.titulo}
                                                </div>
                                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                    {grupo.items.map(item => (
                                                        <li key={item.texto} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.78rem', color: item.ok ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: item.ok ? 1 : 0.6 }}>
                                                            <span style={{ flexShrink: 0, fontSize: '0.7rem', marginTop: '0.1rem' }}>{item.ok ? '✅' : '🚫'}</span>
                                                            <span>{item.texto}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Permissões extras */}
                        {(() => {
                            const available = EXTRA_PERMISSIONS.filter(p => p.disponivelPara.includes(form.role));
                            if (available.length === 0) return null;
                            const toggle = (key) => setForm(f => ({
                                ...f,
                                permissoes_extras: f.permissoes_extras.includes(key)
                                    ? f.permissoes_extras.filter(k => k !== key)
                                    : [...f.permissoes_extras, key],
                            }));
                            return (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '1rem' }}>🔓</span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                                            Permissões extras
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                            — concedidas individualmente além do perfil {ROLE_PERMISSIONS[form.role]?.label}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {available.map(p => {
                                            const checked = form.permissoes_extras.includes(p.key);
                                            return (
                                                <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: checked ? 'rgba(99,102,241,0.08)' : 'transparent', border: checked ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', transition: 'all 0.15s' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggle(p.key)}
                                                        style={{ marginTop: '0.15rem', accentColor: '#6366f1', width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span>{p.icon}</span> {p.label}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{p.descricao}</div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex gap-md mt-lg">
                            <button type="submit" className="btn btn-success">
                                {editing ? 'Atualizar Funcionário' : 'Criar Funcionário'}
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
                    <h3 className="card-title">Lista de Funcionários ({filtered.length})</h3>
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="🔍 Buscar por nome, usuário ou perfil..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ textTransform: 'none' }}
                    />
                </div>
                {filtered.length > 0 ? (
                    <div className="table-container">
                        <table className="table" aria-label="Lista de funcionários">
                            <thead>
                                <tr>
                                    <th>Funcionário</th>
                                    <th>Usuário</th>
                                    <th>E-mail</th>
                                    <th>Perfil</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const role = roleInfo(u.role);
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Avatar nome={u.nome} />
                                                    <strong>{u.nome}</strong>
                                                </div>
                                            </td>
                                            <td><code style={{ fontSize: '0.85rem', background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{u.username}</code></td>
                                            <td style={{ fontSize: '0.875rem' }}>{u.email}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                                    <span className={`badge ${role.badge}`}>
                                                        {role.icon} {role.label}
                                                    </span>
                                                    {u.permissoes_extras && u.permissoes_extras.length > 0 && (
                                                        <span title={u.permissoes_extras.map(k => EXTRA_PERMISSIONS.find(p => p.key === k)?.label || k).join(', ')} style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600, cursor: 'default' }}>
                                                            🔓 +{u.permissoes_extras.length} extra{u.permissoes_extras.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.ativo ? 'badge-success' : 'badge-danger'}`}>
                                                    {u.ativo ? '● Ativo' : '○ Inativo'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-sm">
                                                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>Editar</button>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => { setResetModal(u); setNewPassword(''); setResetError(''); }}>🔑 Senha</button>
                                                    <button
                                                        className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-success'}`}
                                                        onClick={() => handleToggleActive(u)}
                                                    >
                                                        {u.ativo ? 'Desativar' : 'Ativar'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p className="text-muted">
                            {search ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado ainda.'}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Modal Redefinir Senha */}
        {resetModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Redefinir Senha</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{resetModal.nome} · @{resetModal.username}</p>
                        </div>
                        <button onClick={() => setResetModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem 0.5rem' }}>✕</button>
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem' }}>
                        {resetError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{resetError}</div>}
                        <div className="form-group">
                            <label className="form-label">Nova Senha *</label>
                            <input
                                type="password"
                                className="form-input"
                                value={newPassword}
                                onChange={e => { setNewPassword(e.target.value); setResetError(''); }}
                                placeholder="Mínimo 6 caracteres"
                                autoFocus
                                minLength={6}
                                onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setResetModal(null)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleResetPassword}>Salvar Senha</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

export default Users;
