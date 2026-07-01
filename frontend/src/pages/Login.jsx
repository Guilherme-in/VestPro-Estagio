import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Login.css';

const FEATURES = [
    { icon: '🖥️', text: 'PDV integrado para vendas rápidas' },
    { icon: '📦', text: 'Controle de estoque em tempo real' },
    { icon: '📈', text: 'Relatórios financeiros completos' },
    { icon: '👥', text: 'Gestão de clientes e fornecedores' },
];

const passStrength = (p) => {
    if (!p) return null;
    if (p.length < 6) return { label: 'Fraca', color: '#ef4444', width: '25%' };
    if (p.length < 8 || !/[0-9]/.test(p)) return { label: 'Média', color: '#f59e0b', width: '55%' };
    if (/[A-Z]/.test(p) && /[^a-zA-Z0-9]/.test(p)) return { label: 'Forte', color: '#10b981', width: '100%' };
    return { label: 'Boa', color: '#10b981', width: '80%' };
};

function Login() {
    const { login, setTokenAndUser } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState('login'); // 'login' | 'register'
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [regForm, setRegForm] = useState({
        nome_loja: '',
        nome: '',
        email: '',
        username: '',
        password: '',
    });

    const strength = passStrength(tab === 'register' ? regForm.password : '');

    // ── Login ──
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(loginForm.username, loginForm.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Usuário ou senha incorretos.');
        } finally {
            setLoading(false);
        }
    };

    // ── Cadastro ──
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const res = await api.post('/auth/register', regForm);
            // O endpoint devolve token + user → faz login automático
            const { access_token, user } = res.data;
            setTokenAndUser(access_token, user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

    return (
        <div className="login-page">
            {/* Painel esquerdo decorativo */}
            <div className="login-left">
                <div className="login-left-content">
                    <div className="login-brand">
                        <span className="login-brand-icon">👔</span>
                        <span className="login-brand-name">VestPro</span>
                    </div>
                    <h2 className="login-left-title">
                        {tab === 'register'
                            ? 'Crie sua loja\nem minutos'
                            : 'Gerencie sua loja\ncom inteligência'}
                    </h2>
                    <p className="login-left-sub">
                        {tab === 'register'
                            ? 'Cada conta admin cria um ambiente isolado — sua loja, seus dados, sua equipe.'
                            : 'Sistema completo de gestão de estoque para o seu negócio de moda.'}
                    </p>
                    <ul className="login-features">
                        {FEATURES.map(f => (
                            <li key={f.text}>
                                <span className="login-feature-icon">{f.icon}</span>
                                <span>{f.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="login-left-decoration" />
            </div>

            {/* Painel direito */}
            <div className="login-right">
                <div className="login-card">
                    {/* Tabs */}
                    <div className="login-tabs" role="tablist">
                        <button
                            className={`login-tab${tab === 'login' ? ' active' : ''}`}
                            onClick={() => switchTab('login')}
                            role="tab"
                            aria-selected={tab === 'login'}
                        >
                            Entrar
                        </button>
                        <button
                            className={`login-tab${tab === 'register' ? ' active' : ''}`}
                            onClick={() => switchTab('register')}
                            role="tab"
                            aria-selected={tab === 'register'}
                        >
                            Criar Conta
                        </button>
                    </div>

                    {/* Header */}
                    <div className="login-card-header">
                        {tab === 'login' ? (
                            <>
                                <h2 className="login-card-title">Bem-vindo de volta</h2>
                                <p className="login-card-sub">Entre com suas credenciais para acessar o sistema</p>
                            </>
                        ) : (
                            <>
                                <h2 className="login-card-title">Criar nova loja</h2>
                                <p className="login-card-sub">Você será o administrador do seu próprio ambiente</p>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="login-alert login-alert-error" role="alert">⚠️ {error}</div>
                    )}
                    {success && (
                        <div className="login-alert login-alert-success" role="alert">✅ {success}</div>
                    )}

                    {/* ── Formulário de LOGIN ── */}
                    {tab === 'login' && (
                        <form className="login-form" onSubmit={handleLogin} noValidate>
                            <div className="lf-group">
                                <label htmlFor="username">Usuário</label>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Digite seu usuário"
                                    value={loginForm.username}
                                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                                    required
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                            <div className="lf-group">
                                <label htmlFor="password">Senha</label>
                                <div className="lf-input-wrap">
                                    <input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Digite sua senha"
                                        value={loginForm.password}
                                        onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button type="button" className="lf-eye-btn" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                                        {showPass ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={loading || !loginForm.username || !loginForm.password}
                            >
                                {loading ? <span className="login-spinner" /> : null}
                                {loading ? 'Entrando...' : 'Entrar no Sistema'}
                            </button>
                        </form>
                    )}

                    {/* ── Formulário de CADASTRO ── */}
                    {tab === 'register' && (
                        <form className="login-form" onSubmit={handleRegister} noValidate>
                            {/* Nome da Loja — destaque */}
                            <div className="lf-group">
                                <label htmlFor="reg-loja">🏪 Nome da sua loja</label>
                                <input
                                    id="reg-loja"
                                    type="text"
                                    placeholder="Ex: Boutique da Maria"
                                    value={regForm.nome_loja}
                                    onChange={e => setRegForm(f => ({ ...f, nome_loja: e.target.value }))}
                                    required
                                    autoFocus
                                    style={{ borderColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(99,102,241,0.15)' }}
                                />
                            </div>

                            <div className="lf-divider">
                                <span>Dados do administrador</span>
                            </div>

                            <div className="lf-group">
                                <label htmlFor="reg-nome">Nome completo</label>
                                <input
                                    id="reg-nome"
                                    type="text"
                                    placeholder="Seu nome"
                                    value={regForm.nome}
                                    onChange={e => setRegForm(f => ({ ...f, nome: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="lf-row">
                                <div className="lf-group">
                                    <label htmlFor="reg-username">Usuário</label>
                                    <input
                                        id="reg-username"
                                        type="text"
                                        placeholder="Login de acesso"
                                        value={regForm.username}
                                        onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                                <div className="lf-group">
                                    <label htmlFor="reg-email">E-mail</label>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        value={regForm.email}
                                        onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="lf-group">
                                <label htmlFor="reg-password">Senha</label>
                                <div className="lf-input-wrap">
                                    <input
                                        id="reg-password"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Mínimo 6 caracteres"
                                        value={regForm.password}
                                        onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                    <button type="button" className="lf-eye-btn" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                                        {showPass ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {regForm.password && strength && (
                                    <div className="lf-strength">
                                        <div className="lf-strength-bar">
                                            <div style={{ width: strength.width, height: '100%', background: strength.color, borderRadius: '999px', transition: 'width 0.3s' }} />
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600, minWidth: 40 }}>{strength.label}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={loading || !regForm.nome_loja || !regForm.nome || !regForm.username || !regForm.email || !regForm.password}
                            >
                                {loading ? <span className="login-spinner" /> : null}
                                {loading ? 'Criando sua loja...' : '🏪 Criar Minha Loja'}
                            </button>

                            <p className="lf-hint" style={{ marginTop: '0.75rem' }}>
                                Ao criar, você vira <strong>administrador</strong> do ambiente da loja.
                            </p>
                        </form>
                    )}

                    {tab === 'login' && (
                        <p className="lf-hint" style={{ marginTop: '1.5rem' }}>
                            Não tem uma conta?{' '}
                            <button className="lf-link" onClick={() => switchTab('register')}>
                                Criar nova loja
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;
