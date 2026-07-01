import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

function StatCard({ icon, label, value, color }) {
    return (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: color || 'var(--primary-light)' }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
        </div>
    );
}

function Settings() {
    const { user, setTokenAndUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ nome_loja: '', cnpj: '', telefone: '', endereco: '' });
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/tenant/stats'),
            api.get('/tenant/me'),
        ]).then(([statsRes, tenantRes]) => {
            setStats(statsRes.data);
            const t = tenantRes.data;
            setForm({ nome_loja: t.nome_loja || '', cnpj: t.cnpj || '', telefone: t.telefone || '', endereco: t.endereco || '' });
        }).finally(() => setLoading(false));
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setSaving(true);
        try {
            await api.put('/tenant/me', form);
            const token = localStorage.getItem('token');
            const updatedUser = { ...user, nome_loja: form.nome_loja };
            setTokenAndUser(token, updatedUser);
            setSuccess('Informações da loja atualizadas com sucesso!');
            setStats(s => ({ ...s, nome_loja: form.nome_loja }));
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-screen">Carregando...</div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Configurações da Loja</h1>
                    <p className="page-subtitle">Gerencie as informações do seu estabelecimento</p>
                </div>
            </div>

            {/* Stats da loja */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard icon="👥" label="Funcionários" value={fmt(stats?.total_users)} color="var(--primary-light)" />
                <StatCard icon="👕" label="Produtos" value={fmt(stats?.total_products)} color="#10b981" />
                <StatCard icon="💳" label="Vendas" value={fmt(stats?.total_sales)} color="#f59e0b" />
                <StatCard icon="🧑‍🤝‍🧑" label="Clientes" value={fmt(stats?.total_customers)} color="#8b5cf6" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: 860 }}>
                {/* Informações da loja */}
                <div className="card">
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>🏪 Informações da Loja</h3>

                    {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
                    {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {success}</div>}

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Nome da Loja *</label>
                            <input className="form-input" value={form.nome_loja} onChange={e => setForm(f => ({ ...f, nome_loja: e.target.value }))} required minLength={1} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">CNPJ</label>
                            <input className="form-input" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" maxLength={20} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefone</label>
                            <input className="form-input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" maxLength={20} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Endereço</label>
                            <input className="form-input" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade – UF" maxLength={300} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Data de Criação</label>
                            <input className="form-input" value={fmtDate(stats?.created_at)} disabled style={{ opacity: 0.6 }} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
                            {saving ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </form>
                </div>

                {/* Informações do sistema */}
                <div className="card">
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>ℹ️ Sobre o Sistema</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                            { label: 'Sistema', value: 'VestPro v2.0' },
                            { label: 'Tecnologia', value: 'FastAPI + React' },
                            { label: 'Banco de Dados', value: 'MySQL' },
                            { label: 'Seu cargo', value: { ADMIN: 'Administrador', GERENTE: 'Gerente', VENDEDOR: 'Vendedor' }[user?.role] },
                            { label: 'Usuário', value: `@${user?.username}` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
