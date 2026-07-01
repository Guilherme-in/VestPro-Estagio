import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesAPI, productsAPI, customersAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Sales.css';

function Sales() {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [desconto, setDesconto] = useState(0);
    const [observacao, setObservacao] = useState('');
    const [message, setMessage] = useState(null);
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [confirmDeleteSale, setConfirmDeleteSale] = useState(null);
    const PAGE_SIZE = 20;

    const today = () => new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (range) => {
        try {
            setLoading(true);
            const r = range || dateRange;
            const params = {};
            if (r.startDate) params.start_date = r.startDate;
            if (r.endDate) params.end_date = r.endDate;
            const [salesRes, productsRes, customersRes] = await Promise.all([
                salesAPI.getAll(params),
                productsAPI.getAll(),
                customersAPI.getAll(),
            ]);
            setSales(salesRes.data);
            setProducts(productsRes.data);
            setCustomers(customersRes.data);
        } catch (error) {
            showMessage('Erro ao carregar dados', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const addToCart = (product) => {
        if (product.quantidade_estoque <= 0) {
            showMessage('Produto sem estoque disponível', 'danger');
            return;
        }

        const existingItem = cartItems.find(item => item.product_id === product.id);
        if (existingItem) {
            if (existingItem.quantidade >= product.quantidade_estoque) {
                showMessage('Quantidade máxima em estoque atingida', 'danger');
                return;
            }
            setCartItems(cartItems.map(item =>
                item.product_id === product.id
                    ? { ...item, quantidade: item.quantidade + 1 }
                    : item
            ));
        } else {
            setCartItems([...cartItems, {
                product_id: product.id,
                quantidade: 1,
                preco_unitario: product.preco,
                product_nome: product.nome,
                product_codigo: product.codigo,
                estoque_disponivel: product.quantidade_estoque
            }]);
        }
    };

    const removeFromCart = (productId) => {
        setCartItems(cartItems.filter(item => item.product_id !== productId));
    };

    const updateCartItem = (productId, field, value) => {
        setCartItems(cartItems.map(item => {
            if (item.product_id === productId) {
                const updated = { ...item, [field]: value };
                if (field === 'quantidade') {
                    const qty = parseInt(value) || 1;
                    if (qty > item.estoque_disponivel) {
                        showMessage(`Quantidade máxima: ${item.estoque_disponivel}`, 'danger');
                        return item;
                    }
                    updated.quantidade = qty;
                } else if (field === 'preco_unitario') {
                    updated.preco_unitario = parseFloat(value) || 0;
                }
                return updated;
            }
            return item;
        }));
    };

    const calculateSubtotal = (item) => {
        return item.quantidade * item.preco_unitario;
    };

    const calculateTotal = () => {
        const subtotal = cartItems.reduce((sum, item) => sum + calculateSubtotal(item), 0);
        return subtotal - (desconto || 0);
    };

    const handleFinalizeSale = async () => {
        if (cartItems.length === 0) {
            showMessage('Adicione pelo menos um produto à venda', 'danger');
            return;
        }


        try {
            const saleData = {
                customer_id: selectedCustomer || null,
                items: cartItems.map(item => ({
                    product_id: item.product_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario
                })),
                desconto: parseFloat(desconto) || 0,
                observacao: observacao || null
            };

            await salesAPI.create(saleData);
            showMessage('Venda realizada com sucesso!');
            resetForm();
            loadData();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Erro ao realizar venda', 'danger');
        }
    };

    const resetForm = () => {
        setCartItems([]);
        setSelectedCustomer(null);
        setDesconto(0);
        setObservacao('');
        setShowForm(false);
    };

    const handleDeleteSale = async (id) => {
        setConfirmDeleteSale(null);

        try {
            await salesAPI.delete(id);
            showMessage('Venda cancelada com sucesso!');
            loadData();
        } catch (error) {
            showMessage('Erro ao cancelar venda', 'danger');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const filteredSales = sales.filter(sale => {
        if (!search) return true;
        const q = search.toLowerCase();
        const customerName = sale.customer_id
            ? (customers.find(c => c.id === sale.customer_id)?.nome || '').toLowerCase()
            : '';
        return customerName.includes(q) || String(sale.id).includes(q);
    });

    const totalSalesPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
    const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="sales-page fade-in">
            {confirmDeleteSale && (
                <ConfirmModal
                    title="Cancelar venda?"
                    message={`A venda #${confirmDeleteSale.id} será cancelada e o estoque restaurado.`}
                    onConfirm={() => handleDeleteSale(confirmDeleteSale.id)}
                    onCancel={() => setConfirmDeleteSale(null)}
                    confirmLabel="Cancelar Venda"
                />
            )}
            <div className="page-header">
                <h1>💳 Vendas</h1>
                <p className="text-muted">Gerenciar vendas e pedidos</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="sales-actions mb-lg" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => navigate('/pdv')}>+ Nova Venda</button>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Data inicial</label>
                        <input type="date" className="form-input" value={dateRange.startDate}
                            onChange={e => setDateRange(d => ({ ...d, startDate: e.target.value }))} />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Data final</label>
                        <input type="date" className="form-input" value={dateRange.endDate}
                            onChange={e => setDateRange(d => ({ ...d, endDate: e.target.value }))} />
                    </div>
                    <button className="btn btn-secondary" onClick={() => loadData()}>Filtrar</button>
                    <button className="btn btn-secondary" onClick={() => { setDateRange({ startDate: today(), endDate: today() }); loadData({ startDate: today(), endDate: today() }); }}>Hoje</button>
                    {(dateRange.startDate || dateRange.endDate) && (
                        <button className="btn btn-secondary" onClick={() => { setDateRange({ startDate: '', endDate: '' }); loadData({ startDate: '', endDate: '' }); }}>✕ Limpar</button>
                    )}
                </div>
                <input type="text" className="form-input" placeholder="🔍 Buscar cliente..." value={search}
                    onChange={e => setSearch(e.target.value)} style={{ maxWidth: '220px' }} />
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <div className="card-header">
                        <h3 className="card-title">Nova Venda</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Cliente (Opcional)</label>
                                <select
                                    className="form-control"
                                    value={selectedCustomer || ''}
                                    onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.nome} {customer.cpf ? `(${customer.cpf})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Desconto (R$)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={desconto}
                                    onChange={(e) => setDesconto(e.target.value)}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Observação</label>
                            <textarea
                                className="form-control"
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                rows="2"
                            />
                        </div>

                        <div className="products-selector mt-lg">
                            <h4 className="mb-md">Adicionar Produtos</h4>
                            <div className="products-grid">
                                {products.filter(p => p.quantidade_estoque > 0).map(product => (
                                    <div key={product.id} className="product-card">
                                        <div className="product-info">
                                            <strong>{product.nome}</strong>
                                            <small>{product.codigo}</small>
                                            <div className="product-price">
                                                {formatCurrency(product.preco)}
                                            </div>
                                            <div className="product-stock">
                                                Estoque: {product.quantidade_estoque}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => addToCart(product)}
                                        >
                                            + Adicionar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {cartItems.length > 0 && (
                            <div className="cart-section mt-xl">
                                <h4 className="mb-md">Itens da Venda</h4>
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Produto</th>
                                                <th>Qtd</th>
                                                <th>Preço Unit.</th>
                                                <th>Subtotal</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cartItems.map(item => (
                                                <tr key={item.product_id}>
                                                    <td>
                                                        <div>
                                                            <strong>{item.product_nome}</strong>
                                                            <br />
                                                            <small>{item.product_codigo}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            value={item.quantidade}
                                                            onChange={(e) => updateCartItem(item.product_id, 'quantidade', e.target.value)}
                                                            min="1"
                                                            max={item.estoque_disponivel}
                                                            style={{ width: '80px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            value={item.preco_unitario}
                                                            onChange={(e) => updateCartItem(item.product_id, 'preco_unitario', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            style={{ width: '120px' }}
                                                        />
                                                    </td>
                                                    <td>{formatCurrency(calculateSubtotal(item))}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => removeFromCart(item.product_id)}
                                                        >
                                                            Remover
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="sale-summary mt-lg">
                                    <div className="summary-row">
                                        <span>Subtotal:</span>
                                        <strong>{formatCurrency(cartItems.reduce((sum, item) => sum + calculateSubtotal(item), 0))}</strong>
                                    </div>
                                    {desconto > 0 && (
                                        <div className="summary-row">
                                            <span>Desconto:</span>
                                            <strong className="text-danger">- {formatCurrency(desconto)}</strong>
                                        </div>
                                    )}
                                    <div className="summary-row summary-total">
                                        <span>Total:</span>
                                        <strong className="text-primary">{formatCurrency(calculateTotal())}</strong>
                                    </div>
                                </div>

                                <div className="form-actions mt-lg">
                                    <button
                                        className="btn btn-success btn-lg"
                                        onClick={handleFinalizeSale}
                                    >
                                        ✅ Finalizar Venda
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={resetForm}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">Histórico de Vendas ({filteredSales.length})</h3>
                    {sales.length > 0 && (
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>
                            Total: {formatCurrency(filteredSales.reduce((s, v) => s + v.total, 0))}
                        </span>
                    )}
                </div>
                {filteredSales.length > 0 ? (
                    <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Data</th>
                                    <th>Cliente</th>
                                    <th>Pagamento</th>
                                    <th>Itens</th>
                                    <th>Total</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSales.map(sale => {
                                    const PAYMENT_ICON = { dinheiro: '💵', pix: '📱', debito: '💳', credito: '💳' };
                                    const PAYMENT_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito' };
                                    const pm = sale.forma_pagamento || 'dinheiro';
                                    return (
                                    <tr key={sale.id}>
                                        <td>#{sale.id}</td>
                                        <td>{formatDate(sale.created_at)}</td>
                                        <td>
                                            {sale.customer_id
                                                ? customers.find(c => c.id === sale.customer_id)?.nome || 'Cliente removido'
                                                : 'Cliente não informado'}
                                        </td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                {PAYMENT_ICON[pm]} {PAYMENT_LABEL[pm] || pm}
                                            </span>
                                        </td>
                                        <td>{sale.items?.length || 0} item(s)</td>
                                        <td>
                                            <strong>{formatCurrency(sale.total)}</strong>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => setConfirmDeleteSale(sale)}
                                            >
                                                Cancelar
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalSalesPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Anterior</button>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Página {page} de {totalSalesPages}</span>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.min(totalSalesPages, p + 1))} disabled={page === totalSalesPages}>Próximo ›</button>
                        </div>
                    )}
                    </>
                ) : (
                    <div className="empty-state">
                        <p className="text-muted">{search || dateRange.startDate ? 'Nenhuma venda encontrada.' : 'Nenhuma venda registrada ainda.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sales;

