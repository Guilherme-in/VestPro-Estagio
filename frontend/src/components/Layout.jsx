import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsAPI } from '../services/api';
import GlobalSearch from './GlobalSearch';
import './Layout.css';

const NAV_GROUPS = [
    {
        label: 'Operações',
        items: [
            { path: '/',      label: 'Dashboard',   icon: '📊', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/pdv',   label: 'PDV',         icon: '🖥️', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/sales', label: 'Vendas',      icon: '💳', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/caixa', label: 'Caixa',       icon: '💰', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
        ],
    },
    {
        label: 'Cadastros',
        items: [
            { path: '/products',   label: 'Produtos',     icon: '👕', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/categories', label: 'Categorias',   icon: '🏷️', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/suppliers',  label: 'Fornecedores', icon: '🏭', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/customers',  label: 'Clientes',     icon: '👥', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
            { path: '/movements',  label: 'Movimentação', icon: '📦', roles: ['ADMIN', 'GERENTE', 'VENDEDOR'], alert: true },
        ],
    },
    {
        label: 'Gestão',
        items: [
            { path: '/reports',  label: 'Relatórios',   icon: '📈', roles: ['ADMIN', 'GERENTE'] },
            { path: '/users',    label: 'Funcionários', icon: '👤', roles: ['ADMIN'] },
            { path: '/audit',    label: 'Auditoria',    icon: '🔐', roles: ['ADMIN'] },
            { path: '/settings', label: 'Configurações',icon: '⚙️', roles: ['ADMIN'] },
        ],
    },
];

const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 68;

function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    useEffect(() => {
        reportsAPI.getStockReport()
            .then(r => setLowStockCount(r.data.filter(p => p.baixo_estoque).length))
            .catch(() => {});
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    const roleLabel = { ADMIN: 'Administrador', GERENTE: 'Gerente', VENDEDOR: 'Vendedor' };
    const firstName = user?.nome?.split(' ')[0] || user?.nome || '';
    const initial = user?.nome?.charAt(0).toUpperCase() || '?';
    const nomeLoja = user?.nome_loja || 'VestPro';
    const sidebarW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

    return (
        <div className="layout">
            <aside
                className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}
                style={{ width: sidebarW }}
                role="navigation"
                aria-label="Menu principal"
            >
                {/* Logo + botão recolher */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <span className="logo-icon">👔</span>
                        {!collapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span className="sidebar-brand">VestPro</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{nomeLoja}</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="collapse-btn"
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                {/* Busca global no sidebar */}
                <GlobalSearch collapsed={collapsed} />

                {/* Grupos de navegação */}
                <nav className="sidebar-nav">
                    {NAV_GROUPS.map(group => {
                        const visible = group.items.filter(i => i.roles.includes(user?.role));
                        if (!visible.length) return null;
                        return (
                            <div key={group.label} className="nav-group">
                                {!collapsed && (
                                    <span className="nav-group-label">{group.label}</span>
                                )}
                                {visible.map(item => {
                                    const isActive = location.pathname === item.path;
                                    const badgeCount = item.alert ? lowStockCount : 0;
                                    return (
                                        <div
                                            key={item.path}
                                            className="nav-item-wrapper"
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Link
                                                to={item.path}
                                                className={`nav-item${isActive ? ' active' : ''}`}
                                                aria-current={isActive ? 'page' : undefined}
                                            >
                                                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                                                {!collapsed && <span className="nav-label">{item.label}</span>}
                                                {!collapsed && badgeCount > 0 && (
                                                    <span className="nav-badge">
                                                        {badgeCount > 9 ? '9+' : badgeCount}
                                                    </span>
                                                )}
                                            </Link>
                                            {collapsed && badgeCount > 0 && (
                                                <span className="nav-badge-dot" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                {/* Rodapé com usuário */}
                <div className="sidebar-footer">
                    <Link to="/profile" className="user-avatar-circle" title="Meu Perfil" style={{ textDecoration: 'none' }}>
                        {initial}
                    </Link>
                    {!collapsed && (
                        <Link to="/profile" className="user-details" style={{ textDecoration: 'none' }}>
                            <span className="user-name">{firstName}</span>
                            <span className="user-role">{roleLabel[user?.role] || user?.role}</span>
                        </Link>
                    )}
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                        aria-label="Alternar tema"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', opacity: 0.7 }}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                        aria-label="Sair do sistema"
                        title="Sair"
                    >
                        🚪
                    </button>
                </div>
            </aside>

            <main
                className="main-content"
                role="main"
                style={{ marginLeft: sidebarW, transition: 'margin-left 0.25s ease' }}
            >
                <div className="container">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;
