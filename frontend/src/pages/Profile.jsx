import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ROLE_LABEL = { ADMIN: 'Administrador', GERENTE: 'Gerente', VENDEDOR: 'Vendedor' };

function Profile() {
    const { user, setTokenAndUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);

    const [form, setForm] = useState({
        nome: user?.nome || '',
        email: user?.email || '',
        password_atual: '',
        password_nova: '',
    });

    const initial = user?.nome?.charAt(0).toUpperCase() || '?';

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            const payload = { nome: form.nome, email: form.email };
            if (form.password_nova) {
                payload.password_atual = form.password_atual;
                payload.password_nova = form.password_nova;
            }
            const res = await api.put('/tenant/profile', payload);
            // Atualizar usuário no contexto/localStorage
            const token = localStorage.getItem('token');
            setTokenAndUser(token, res.data);
            setSuccess('Perfil atualizado com sucesso!');
            setForm(f => ({ ...f, password_atual: '', password_nova: '' }));
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao salvar alterações.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Meu Perfil</h1>
                    <p className="page-subtitle">Gerencie suas informações pessoais</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', maxWidth: 860 }}>
                {/* Card de identidade */}
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: '2rem',
                        margin: '0 auto 1rem'
                    }}>
                        {initial}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{user?.nome}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>@{user?.username}</p>
                    <span style={{
                        display: 'inline-block', padding: '0.25rem 0.75rem',
                        borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                        background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)'
                    }}>
                        {ROLE_LABEL[user?.role] || user?.role}
                    </span>
                    {user?.nome_loja && (
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            🏪 {user.nome_loja}
                        </p>
                    )}
                </div>

                {/* Formulário */}
                <div className="card">
                    <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Editar Informações</h3>

                    {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
                    {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {success}</div>}

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Nome completo</label>
                            <input
                                className="form-input"
                                value={form.nome}
                                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">E-mail</label>
                            <input
                                className="form-input"
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Deixe em branco para manter a senha atual
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Senha atual</label>
                                    <input
                                        className="form-input"
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password_atual}
                                        onChange={e => setForm(f => ({ ...f, password_atual: e.target.value }))}
                                        placeholder="••••••"
                                        autoComplete="current-password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nova senha</label>
                                    <input
                                        className="form-input"
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password_nova}
                                        onChange={e => setForm(f => ({ ...f, password_nova: e.target.value }))}
                                        placeholder="Mín. 6 caracteres"
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '0.5rem' }}>
                                <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} />
                                Mostrar senhas
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                        >
                            {loading ? 'Salvando...' : '💾 Salvar Alterações'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Profile;
