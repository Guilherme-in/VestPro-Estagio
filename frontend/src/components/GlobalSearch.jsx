import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, customersAPI, suppliersAPI } from '../services/api';

function GlobalSearch({ collapsed = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ products: [], customers: [], suppliers: [] });
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
        else setQuery('');
    }, [open]);

    useEffect(() => {
        if (!query.trim()) { setResults({ products: [], customers: [], suppliers: [] }); return; }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const [prods, custs, supps] = await Promise.all([
                    productsAPI.getAll().then(r => r.data),
                    customersAPI.getAll().then(r => r.data),
                    suppliersAPI.getAll().then(r => r.data),
                ]);
                const q = query.toLowerCase();
                setResults({
                    products: prods.filter(p => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 5),
                    customers: custs.filter(c => c.nome.toLowerCase().includes(q) || (c.cpf || '').includes(q)).slice(0, 5),
                    suppliers: supps.filter(s => s.nome.toLowerCase().includes(q)).slice(0, 3),
                });
            } finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const goTo = (path) => { navigate(path); setOpen(false); };
    const hasResults = results.products.length || results.customers.length || results.suppliers.length;

    return (
        <>
            {/* Botão dentro do sidebar */}
            <button
                className="sidebar-search-btn"
                onClick={() => setOpen(true)}
                title="Buscar (Ctrl K)"
            >
                <span className="sidebar-search-icon">🔍</span>
                {!collapsed && (
                    <>
                        <span className="sidebar-search-label">Buscar...</span>
                        <span className="sidebar-search-kbd">Ctrl K</span>
                    </>
                )}
            </button>

            {/* Overlay da busca */}
            {open && (
                <div className="global-search-overlay" onClick={() => setOpen(false)}>
                    <div className="global-search-box" onClick={e => e.stopPropagation()}>
                        <div className="global-search-input-row">
                            <span>🔍</span>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Buscar produtos, clientes, fornecedores..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                autoComplete="off"
                            />
                            {loading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>...</span>}
                        </div>

                        <div className="global-search-results">
                            {!query && (
                                <div className="global-search-empty">
                                    Digite para buscar produtos, clientes ou fornecedores
                                </div>
                            )}
                            {query && !hasResults && !loading && (
                                <div className="global-search-empty">Nenhum resultado para "{query}"</div>
                            )}

                            {results.products.length > 0 && (
                                <>
                                    <div className="global-search-section-label">👕 Produtos</div>
                                    {results.products.map(p => (
                                        <div key={p.id} className="global-search-item" onClick={() => goTo('/products')}>
                                            <span className="global-search-item-icon">👕</span>
                                            <div>
                                                <div className="global-search-item-main">{p.nome}</div>
                                                <div className="global-search-item-sub">{p.codigo} · {p.categoria || 'Sem categoria'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {results.customers.length > 0 && (
                                <>
                                    <div className="global-search-section-label">👥 Clientes</div>
                                    {results.customers.map(c => (
                                        <div key={c.id} className="global-search-item" onClick={() => goTo('/customers')}>
                                            <span className="global-search-item-icon">👥</span>
                                            <div>
                                                <div className="global-search-item-main">{c.nome}</div>
                                                <div className="global-search-item-sub">{c.telefone || c.cpf || 'Sem contato'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {results.suppliers.length > 0 && (
                                <>
                                    <div className="global-search-section-label">🏭 Fornecedores</div>
                                    {results.suppliers.map(s => (
                                        <div key={s.id} className="global-search-item" onClick={() => goTo('/suppliers')}>
                                            <span className="global-search-item-icon">🏭</span>
                                            <div>
                                                <div className="global-search-item-main">{s.nome}</div>
                                                <div className="global-search-item-sub">{s.cnpj || s.telefone || ''}</div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="global-search-footer">
                            <span>↵ Navegar</span>
                            <span>Esc Fechar</span>
                            <span>Ctrl K Abrir</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default GlobalSearch;
