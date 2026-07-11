import { useState, useEffect, useRef } from 'react';
import { productsAPI, customersAPI, salesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PDV.css';

const PAYMENT_METHODS = [
    { key: 'dinheiro', label: 'Dinheiro', icon: '💵' },
    { key: 'pix', label: 'Pix', icon: '📱' },
    { key: 'debito', label: 'Débito', icon: '💳' },
    { key: 'credito', label: 'Crédito', icon: '💳' },
];

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const precoEfetivo = (item) => {
    const val = parseFloat(item.desconto_item_valor) || 0;
    if (val <= 0) return item.preco_unitario;
    if (item.desconto_item_tipo === '%') return Math.max(0, item.preco_unitario * (1 - val / 100));
    return Math.max(0, item.preco_unitario - val);
};

function ItemDiscountRow({ item, setItemDiscount }) {
    const val = parseFloat(item.desconto_item_valor) || 0;
    const efetivo = precoEfetivo(item);
    const temDesconto = val > 0;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px',
            padding: '3px 8px 3px 8px', borderRadius: '6px',
            background: temDesconto ? 'rgba(16,185,129,0.08)' : 'var(--bg-tertiary)',
            border: `1px solid ${temDesconto ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
            transition: 'background 0.2s, border-color 0.2s',
        }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {item.desconto_item_tipo}
            </span>
            <input
                type="number" min="0" step="0.01" placeholder="0"
                value={item.desconto_item_valor}
                onChange={e => setItemDiscount(item.product_id, 'desconto_item_valor', e.target.value)}
                className="pdv-no-spinner"
                style={{
                    flex: 1, minWidth: 0, padding: '2px 0', fontSize: '0.82rem', fontWeight: 600,
                    background: 'transparent', border: 'none', outline: 'none',
                    color: temDesconto ? '#10b981' : 'var(--text-primary)',
                }}
            />
            {temDesconto
                ? <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>→ {fmt(efetivo)}/un.</span>
                : <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.5 }}>sem desconto</span>
            }
        </div>
    );
}

function PDV() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [cart, setCart] = useState([]);

    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerList, setShowCustomerList] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState('dinheiro');
    const [parcelas, setParcelas] = useState(1);
    const [discountType, setDiscountType] = useState('R$');
    const [discountValue, setDiscountValue] = useState('');
    const [cashReceived, setCashReceived] = useState('');

    const [successData, setSuccessData] = useState(null);
    const [showCartModal, setShowCartModal] = useState(false);

    const searchRef = useRef(null);

    useEffect(() => {
        loadData();
        setTimeout(() => searchRef.current?.focus(), 100);
    }, []);

    const loadData = async () => {
        try {
            const [prodRes, custRes] = await Promise.all([
                productsAPI.getAll(),
                customersAPI.getAll(),
            ]);
            setProducts(prodRes.data);
            setCustomers(custRes.data);
        } finally {
            setLoading(false);
        }
    };

    // ─── Categorias ─────────────────────────────────────────────────────────
    const categories = ['Todos', ...Array.from(new Set(products.map(p => p.categoria).filter(Boolean)))];

    // ─── Filtro de Produtos ──────────────────────────────────────────────────
    const filteredProducts = products.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = !q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
        const matchCat = activeCategory === 'Todos' || p.categoria === activeCategory;
        return matchSearch && matchCat;
    });

    // ─── Carrinho ────────────────────────────────────────────────────────────
    const addToCart = (product) => {
        if (product.quantidade_estoque <= 0) return;
        setCart(prev => {
            const existing = prev.find(i => i.product_id === product.id);
            if (existing) {
                if (existing.quantidade >= product.quantidade_estoque) return prev;
                return prev.map(i => i.product_id === product.id
                    ? { ...i, quantidade: i.quantidade + 1 }
                    : i
                );
            }
            return [...prev, {
                product_id: product.id,
                nome: product.nome,
                codigo: product.codigo,
                preco_unitario: product.preco,
                quantidade: 1,
                estoque_max: product.quantidade_estoque,
                desconto_item_tipo: 'R$',
                desconto_item_valor: '',
            }];
        });
    };

    const changeQty = (productId, delta) => {
        setCart(prev => prev
            .map(i => {
                if (i.product_id !== productId) return i;
                const newQty = i.quantidade + delta;
                if (newQty <= 0) return null;
                if (newQty > i.estoque_max) return i;
                return { ...i, quantidade: newQty };
            })
            .filter(Boolean)
        );
    };

    const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

    const setItemDiscount = (productId, field, value) => {
        setCart(prev => prev.map(i => i.product_id === productId ? { ...i, [field]: value } : i));
    };

    const clearCart = () => { setCart([]); setDiscountValue(''); setCashReceived(''); setParcelas(1); setSelectedCustomer(null); setCustomerSearch(''); };

    // ─── Totais ──────────────────────────────────────────────────────────────
    const subtotal = cart.reduce((s, i) => s + i.quantidade * precoEfetivo(i), 0);
    const discountAmount = discountType === '%'
        ? subtotal * (parseFloat(discountValue) || 0) / 100
        : parseFloat(discountValue) || 0;
    const total = Math.max(0, subtotal - discountAmount);
    const troco = paymentMethod === 'dinheiro' ? Math.max(0, (parseFloat(cashReceived) || 0) - total) : 0;

    // ─── Cliente ─────────────────────────────────────────────────────────────
    const filteredCustomers = customers.filter(c =>
        c.nome.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.cpf || '').includes(customerSearch)
    );

    const selectCustomer = (c) => {
        setSelectedCustomer(c);
        setCustomerSearch(c.nome);
        setShowCustomerList(false);
    };

    // ─── Finalizar ───────────────────────────────────────────────────────────
    const handleFinalize = async () => {
        if (cart.length === 0) return;
        if (paymentMethod === 'dinheiro' && (parseFloat(cashReceived) || 0) < total) return;

        try {
            const saleRes = await salesAPI.create({
                customer_id: selectedCustomer?.id || null,
                items: cart.map(i => ({
                    product_id: i.product_id,
                    quantidade: i.quantidade,
                    preco_unitario: precoEfetivo(i),
                })),
                desconto: discountAmount,
                forma_pagamento: paymentMethod,
                observacao: paymentMethod === 'credito' && parcelas > 1
                    ? `${parcelas}x no crédito`
                    : null,
            });

            setSuccessData({
                saleId: saleRes.data.id,
                storeName: user?.nome_loja || 'VestPro',
                total,
                subtotal,
                desconto: discountAmount,
                troco,
                paymentMethod,
                parcelas: paymentMethod === 'credito' ? parcelas : null,
                itemCount: cart.reduce((s, i) => s + i.quantidade, 0),
                customer: selectedCustomer?.nome || null,
                items: cart.map(i => ({ ...i, preco_efetivo: precoEfetivo(i) })),
            });

            await loadData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao finalizar venda.');
        }
    };

    const printReceipt = () => {
        const win = window.open('', '_blank', 'width=420,height=700');
        const payLabel = PAYMENT_METHODS.find(m => m.key === successData.paymentMethod)?.label;
        const parcelaInfo = successData.paymentMethod === 'credito' && successData.parcelas > 1
            ? ` — ${successData.parcelas}x de ${fmt(successData.total / successData.parcelas)}`
            : '';
        const descontoItensRecibo = successData.items.reduce((s, i) => s + (i.preco_unitario - i.preco_efetivo) * i.quantidade, 0);
        const subtotalBrutoRecibo = successData.items.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0);
        win.document.write(`<!DOCTYPE html><html><head><title>Comprovante #${successData.saleId}</title>
        <style>
          @media print { @page { size: 80mm auto; margin: 4mm; } body { -webkit-print-color-adjust: exact; } }
          * { box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; margin: 0 auto; padding: 10px 6px; color: #111; }
          .logo { text-align: center; margin-bottom: 6px; }
          .logo h2 { font-size: 16px; font-weight: 900; margin: 0; letter-spacing: 2px; }
          .logo p { font-size: 10px; color: #555; margin: 1px 0; }
          .sale-meta { text-align: center; font-size: 9.5px; color: #777; margin: 4px 0; }
          .cliente { text-align: center; font-size: 10px; font-weight: bold; margin: 3px 0; }
          .line-solid { border: none; border-top: 1px solid #000; margin: 6px 0; }
          .line-dash { border: none; border-top: 1px dashed #aaa; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; align-items: baseline; margin: 2px 0; }
          .item-nome { font-weight: bold; font-size: 11px; margin: 4px 0 1px; }
          .item-desc { font-size: 9.5px; color: #16a34a; }
          .item-orig { font-size: 9.5px; color: #999; text-decoration: line-through; }
          .total-row { font-size: 13px; font-weight: 900; margin: 3px 0; }
          .desc-row { color: #16a34a; font-size: 10px; }
          .eco-row { background: #f0fdf4; padding: 2px 4px; border-radius: 3px; font-size: 9.5px; color: #16a34a; font-weight: bold; margin: 2px 0; }
          .pay { text-align: center; font-size: 11px; font-weight: bold; margin: 4px 0; }
          .troco { text-align: center; font-size: 11px; color: #16a34a; font-weight: bold; }
          .footer { text-align: center; font-size: 9px; color: #999; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 6px; }
        </style></head><body>
        <div class="logo">
          <h2>VestPro</h2>
          <p>${successData.storeName}</p>
        </div>
        <div class="sale-meta">Venda #${successData.saleId} &nbsp;·&nbsp; ${new Date().toLocaleString('pt-BR')}</div>
        ${successData.customer ? `<div class="cliente">👤 ${successData.customer}</div>` : ''}
        <hr class="line-solid"/>
        ${successData.items.map(i => `
          <div class="item-nome">${i.nome}</div>
          ${i.preco_efetivo < i.preco_unitario ? `
            <div class="row">
              <span class="item-orig">${fmt(i.preco_unitario)}/un.</span>
              <span class="item-desc">desc. ${fmt(i.preco_unitario - i.preco_efetivo)}/un.</span>
            </div>` : ''}
          <div class="row">
            <span>${i.quantidade}x ${fmt(i.preco_efetivo)}</span>
            <span><b>${fmt(i.quantidade * i.preco_efetivo)}</b></span>
          </div>
          <hr class="line-dash"/>
        `).join('')}
        <div class="row"><span>Subtotal</span><span>${fmt(subtotalBrutoRecibo)}</span></div>
        ${descontoItensRecibo > 0 ? `<div class="row desc-row"><span>🏷️ Desc. por produto</span><span>− ${fmt(descontoItensRecibo)}</span></div>` : ''}
        ${successData.desconto > 0 ? `<div class="row desc-row"><span>Desc. na venda</span><span>− ${fmt(successData.desconto)}</span></div>` : ''}
        ${descontoItensRecibo + successData.desconto > 0 ? `<div class="row eco-row"><span>✅ Você economizou</span><span>${fmt(descontoItensRecibo + successData.desconto)}</span></div>` : ''}
        <hr class="line-solid"/>
        <div class="row total-row"><span>TOTAL</span><span>${fmt(successData.total)}</span></div>
        ${successData.troco > 0 ? `<div class="troco">Troco: ${fmt(successData.troco)}</div>` : ''}
        <hr class="line-solid"/>
        <div class="pay">${payLabel}${parcelaInfo}</div>
        <div class="footer">Obrigado pela preferência!<br/>VestPro • Sistema de Gestão</div>
        </body></html>`);
        win.document.close();
        win.focus();
        win.print();
    };

    const handleNewSale = () => {
        clearCart();
        setSuccessData(null);
        setTimeout(() => searchRef.current?.focus(), 100);
    };

    const cartProductIds = new Set(cart.map(i => i.product_id));
    const totalQty = cart.reduce((s, i) => s + i.quantidade, 0);

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="pdv-wrapper">
            {/* ── Painel Esquerdo ── */}
            <div className="pdv-left">
                <div className="pdv-topbar">
                    <h2>📦 PDV</h2>
                    <div className="pdv-search-box">
                        <span className="pdv-search-icon">🔍</span>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Buscar produto por nome ou código..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="pdv-categories">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`pdv-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="pdv-products-grid">
                    {filteredProducts.length === 0 ? (
                        <div className="pdv-no-products">Nenhum produto encontrado.</div>
                    ) : filteredProducts.map(p => (
                        <div
                            key={p.id}
                            className={`pdv-product-card ${p.quantidade_estoque <= 0 ? 'out-of-stock' : ''} ${cartProductIds.has(p.id) ? 'in-cart' : ''}`}
                            onClick={() => addToCart(p)}
                            title={p.quantidade_estoque <= 0 ? 'Sem estoque' : `Adicionar ${p.nome}`}
                        >
                            <div className="pdv-product-emoji">👕</div>
                            <div className="pdv-product-nome">{p.nome}</div>
                            <div className="pdv-product-code">{p.codigo}</div>
                            {p.categoria && <div className="pdv-product-cat">{p.categoria}</div>}
                            <div className="pdv-product-price">{fmt(p.preco)}</div>
                            <div className="pdv-product-stock">
                                {p.quantidade_estoque <= 0 ? '❌ Sem estoque' : `✅ ${p.quantidade_estoque} un.`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Painel Direito ── */}
            <div className="pdv-right">
                <div className="pdv-cart-header">
                    <h3>🛒 Carrinho {cart.length > 0 && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                            {cart.length} produto{cart.length !== 1 ? 's' : ''} · {cart.reduce((s,i)=>s+i.quantidade,0)} un.
                        </span>
                    )}</h3>
                    {cart.length > 0 && (
                        <button className="pdv-cart-clear" onClick={clearCart}>🗑 Limpar</button>
                    )}
                </div>

                <div className="pdv-cart-items">
                    {cart.length === 0 ? (
                        <div className="pdv-empty-cart">
                            <div className="pdv-empty-cart-icon">🛒</div>
                            <p>Clique nos produtos para adicionar</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.product_id} className="pdv-cart-item">
                            <div className="pdv-cart-item-info">
                                <div className="pdv-cart-item-nome">{item.nome}</div>
                                <div className="pdv-cart-item-price" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {precoEfetivo(item) < item.preco_unitario
                                        ? <>
                                            <s style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>{fmt(item.preco_unitario)}</s>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>{fmt(precoEfetivo(item))}</span>
                                          </>
                                        : fmt(item.preco_unitario)
                                    } / un.
                                </div>
                            </div>
                            <div className="pdv-qty-control">
                                <button className="pdv-qty-btn" onClick={() => changeQty(item.product_id, -1)}>−</button>
                                <span className="pdv-qty-val" title={`Estoque: ${item.estoque_max} un.`}>{item.quantidade}</span>
                                <button
                                    className="pdv-qty-btn"
                                    onClick={() => changeQty(item.product_id, +1)}
                                    disabled={item.quantidade >= item.estoque_max}
                                    title={item.quantidade >= item.estoque_max ? `Limite de estoque: ${item.estoque_max} un.` : ''}
                                    style={item.quantidade >= item.estoque_max ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                                >+</button>
                            </div>
                            {item.quantidade >= item.estoque_max && (
                                <div style={{ fontSize: '0.7rem', color: '#f59e0b', gridColumn: '1 / -1', marginTop: '-6px' }}>
                                    ⚠️ Estoque máximo atingido ({item.estoque_max} un.)
                                </div>
                            )}
                            <div className="pdv-cart-item-sub" style={{ color: precoEfetivo(item) < item.preco_unitario ? '#10b981' : undefined }}>
                                {fmt(item.quantidade * precoEfetivo(item))}
                            </div>
                            <button className="pdv-cart-item-remove" onClick={() => removeFromCart(item.product_id)}>✕</button>
                        </div>
                    ))}
                </div>

                <div className="pdv-payment-panel">
                    {/* Cliente */}
                    <div className="pdv-field-row" style={{ position: 'relative' }}>
                        <label className="pdv-field-label">Cliente (opcional)</label>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); setSelectedCustomer(null); }}
                            onFocus={() => setShowCustomerList(true)}
                            onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                            autoComplete="off"
                        />
                        {showCustomerList && customerSearch && filteredCustomers.length > 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)', maxHeight: '150px', overflowY: 'auto',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                            }}>
                                {filteredCustomers.slice(0, 8).map(c => (
                                    <div
                                        key={c.id}
                                        onMouseDown={() => selectCustomer(c)}
                                        style={{
                                            padding: '0.5rem 0.75rem', cursor: 'pointer',
                                            fontSize: '0.85rem', borderBottom: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {c.nome} {c.telefone ? `• ${c.telefone}` : ''}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desconto por produto */}
                    {cart.length > 0 && (
                        <div className="pdv-field-row">
                            <button
                                onClick={() => setShowCartModal(true)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
                                    background: cart.some(i => precoEfetivo(i) < i.preco_unitario) ? 'rgba(16,185,129,0.1)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${cart.some(i => precoEfetivo(i) < i.preco_unitario) ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    🏷️ Desconto por produto
                                </span>
                                <span style={{ fontSize: '0.75rem', color: cart.some(i => precoEfetivo(i) < i.preco_unitario) ? '#10b981' : 'var(--text-muted)' }}>
                                    {cart.some(i => precoEfetivo(i) < i.preco_unitario)
                                        ? `${cart.filter(i => precoEfetivo(i) < i.preco_unitario).length} aplicado${cart.filter(i => precoEfetivo(i) < i.preco_unitario).length > 1 ? 's' : ''} →`
                                        : 'Abrir carrinho →'
                                    }
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Desconto */}
                    <div className="pdv-field-row">
                        <label className="pdv-field-label">Desconto no total</label>
                        <div className="pdv-discount-row">
                            <div className="pdv-discount-type">
                                <button className={discountType === 'R$' ? 'active' : ''} onClick={() => setDiscountType('R$')}>R$</button>
                                <button className={discountType === '%' ? 'active' : ''} onClick={() => setDiscountType('%')}>%</button>
                            </div>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={discountType === '%' ? '0' : '0,00'}
                                value={discountValue}
                                onChange={e => setDiscountValue(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Forma de pagamento */}
                    <div className="pdv-field-row">
                        <label className="pdv-field-label">Forma de Pagamento</label>
                        <div className="pdv-payment-methods">
                            {PAYMENT_METHODS.map(m => (
                                <button
                                    key={m.key}
                                    className={`pdv-pay-btn ${paymentMethod === m.key ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod(m.key)}
                                >
                                    <span className="pay-icon">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Parcelamento (crédito) */}
                    {paymentMethod === 'credito' && (
                        <div className="pdv-field-row">
                            <label className="pdv-field-label">Parcelas</label>
                            <select value={parcelas} onChange={e => setParcelas(parseInt(e.target.value))}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                    <option key={n} value={n}>
                                        {n === 1 ? '1x à vista' : `${n}x de ${fmt(total / n)}`}
                                    </option>
                                ))}
                            </select>
                            {parcelas > 1 && (
                                <span style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px' }}>
                                    Total: {fmt(total)} em {parcelas}x de {fmt(total / parcelas)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Valor recebido (dinheiro) */}
                    {paymentMethod === 'dinheiro' && (
                        <div className="pdv-field-row">
                            <label className="pdv-field-label">Valor Recebido (R$)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={cashReceived}
                                onChange={e => setCashReceived(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Totais */}
                    {(() => {
                        const descontoItens = cart.reduce((s, i) => s + (i.preco_unitario - precoEfetivo(i)) * i.quantidade, 0);
                        const subtotalBruto = cart.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
                        const temDescontoItens = descontoItens > 0;
                        return (
                            <div className="pdv-totals">
                                <div className="pdv-total-row">
                                    <span>Subtotal</span>
                                    <span>{fmt(subtotalBruto)}</span>
                                </div>
                                {temDescontoItens && (
                                    <div className="pdv-total-row" style={{ color: '#10b981' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            🏷️ Desc. por produto
                                        </span>
                                        <span>− {fmt(descontoItens)}</span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="pdv-total-row" style={{ color: '#f59e0b' }}>
                                        <span>Desc. na venda {discountType === '%' ? `(${discountValue}%)` : ''}</span>
                                        <span>− {fmt(discountAmount)}</span>
                                    </div>
                                )}
                                {(temDescontoItens || discountAmount > 0) && (
                                    <div className="pdv-total-row" style={{ fontSize: '0.72rem', color: '#10b981', opacity: 0.85, paddingTop: 0 }}>
                                        <span>Economia total</span>
                                        <span>{fmt(descontoItens + discountAmount)}</span>
                                    </div>
                                )}
                                <div className="pdv-total-row main">
                                    <span>Total</span>
                                    <span>{fmt(total)}</span>
                                </div>
                                {paymentMethod === 'dinheiro' && cashReceived && (
                                    <div className="pdv-total-row troco" style={{ color: troco >= 0 ? '#10b981' : '#ef4444' }}>
                                        <span>{troco >= 0 ? 'Troco' : 'Falta'}</span>
                                        <span>{fmt(Math.abs(troco))}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Botão Finalizar */}
                    <button
                        className="pdv-finalize-btn"
                        onClick={handleFinalize}
                        disabled={
                            cart.length === 0 ||
                            (paymentMethod === 'dinheiro' && (parseFloat(cashReceived) || 0) < total)
                        }
                    >
                        ✅ Finalizar Venda • {fmt(total)}
                    </button>
                </div>
            </div>

            {/* ── Botão Flutuante Carrinho ── */}
            {cart.length > 0 && !successData && (
                <button className="pdv-cart-fab" onClick={() => setShowCartModal(true)} title="Ver carrinho">
                    🛒
                    <span className="pdv-cart-fab-badge">{totalQty}</span>
                </button>
            )}

            {/* ── Modal Resumo do Carrinho ── */}
            {showCartModal && (
                <div className="pdv-cart-modal-overlay" onClick={() => setShowCartModal(false)}>
                    <div className="pdv-cart-modal" onClick={e => e.stopPropagation()}>
                        <div className="pdv-cart-modal-header">
                            <h3>🛒 Carrinho · {cart.length} produto{cart.length !== 1 ? 's' : ''} · {totalQty} un.</h3>
                            <button className="pdv-cart-modal-close" onClick={() => setShowCartModal(false)}>✕</button>
                        </div>
                        <div className="pdv-cart-modal-body">
                            {cart.map(item => (
                                <div key={item.product_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    {/* Linha superior: nome + subtotal + remover */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.nome}</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: precoEfetivo(item) < item.preco_unitario ? '#10b981' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                            {fmt(item.quantidade * precoEfetivo(item))}
                                        </span>
                                        <button onClick={() => removeFromCart(item.product_id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 2px', lineHeight: 1 }}>✕</button>
                                    </div>

                                    {/* Linha: preço + toggle R$/% + controle qty */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {precoEfetivo(item) < item.preco_unitario
                                                ? <><s style={{ opacity: 0.6 }}>{fmt(item.preco_unitario)}</s> <span style={{ color: '#10b981', fontWeight: 600 }}>{fmt(precoEfetivo(item))}</span></>
                                                : fmt(item.preco_unitario)
                                            } / un.
                                        </span>
                                        {/* Toggle R$/% inline */}
                                        <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            {['R$', '%'].map(t => (
                                                <button key={t} onClick={() => setItemDiscount(item.product_id, 'desconto_item_tipo', t)}
                                                    style={{
                                                        padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.6,
                                                        background: item.desconto_item_tipo === t ? '#6366f1' : 'transparent',
                                                        color: item.desconto_item_tipo === t ? '#fff' : 'var(--text-muted)',
                                                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}
                                                >{t}</button>
                                            ))}
                                        </div>
                                        <div style={{ flex: 1 }} />
                                        <div className="pdv-qty-control" style={{ gap: '4px' }}>
                                            <button className="pdv-qty-btn" style={{ width: '24px', height: '24px', fontSize: '0.85rem' }} onClick={() => changeQty(item.product_id, -1)}>−</button>
                                            <span className="pdv-qty-val" style={{ minWidth: '20px', fontSize: '0.85rem' }}>{item.quantidade}</span>
                                            <button className="pdv-qty-btn" style={{ width: '24px', height: '24px', fontSize: '0.85rem' }} onClick={() => changeQty(item.product_id, +1)}>+</button>
                                        </div>
                                    </div>

                                    {/* Campo de desconto */}
                                    <ItemDiscountRow item={item} setItemDiscount={setItemDiscount} />
                                </div>
                            ))}
                        </div>
                        <div className="pdv-cart-modal-footer">
                            <div className="pdv-cart-modal-total">
                                <span>Subtotal c/ descontos</span>
                                <span>{fmt(subtotal)}</span>
                            </div>
                            <button className="pdv-cart-modal-close-btn" onClick={() => setShowCartModal(false)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de Sucesso ── */}
            {successData && (
                <div className="pdv-success-overlay">
                    <div className="pdv-success-modal">
                        <div className="pdv-success-icon">🎉</div>
                        <h2>Venda Realizada!</h2>
                        {successData.customer && <p>Cliente: <strong>{successData.customer}</strong></p>}
                        <p>{successData.itemCount} item(s) vendido(s)</p>
                        <p>Pagamento: <strong>
                            {PAYMENT_METHODS.find(m => m.key === successData.paymentMethod)?.label}
                            {successData.paymentMethod === 'credito' && successData.parcelas > 1
                                ? ` — ${successData.parcelas}x de ${fmt(successData.total / successData.parcelas)}`
                                : ''}
                        </strong></p>
                        <div className="pdv-success-total">{fmt(successData.total)}</div>
                        {successData.troco > 0 && (
                            <div className="pdv-success-troco">💵 Troco: {fmt(successData.troco)}</div>
                        )}
                        <div className="pdv-success-actions">
                            <button className="pdv-success-print" onClick={printReceipt}>
                                🖨️ Imprimir
                            </button>
                            <button className="pdv-success-new" onClick={handleNewSale}>
                                + Nova Venda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PDV;
