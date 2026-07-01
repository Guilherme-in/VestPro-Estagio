import { useState, useEffect } from 'react';
import { productsAPI, categoriesAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import FormModal from '../components/FormModal';
import './Products.css';

const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'XXXG', 'Único'];

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({
        nome: '',
        codigo: '',
        tamanho: '',
        cor: '',
        categoria: '',
        preco_custo: '',
        preco: '',
        quantidade_estoque: 0,
        estoque_minimo: 5,
    });
    const [message, setMessage] = useState(null);
    const [categories, setCategories] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [uploadingId, setUploadingId] = useState(null);

    useEffect(() => {
        loadProducts();
        categoriesAPI.getAll().then(r => setCategories(r.data)).catch(() => {});
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getAll();
            setProducts(response.data);
        } catch (error) {
            showMessage('Erro ao carregar produtos', 'danger');
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
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const calcMargin = () => {
        const custo = parseFloat(formData.preco_custo);
        const venda = parseFloat(formData.preco);
        if (!custo || !venda || custo <= 0 || venda <= 0) return null;
        const margem = venda - custo;
        const pct = ((margem / venda) * 100).toFixed(1);
        return { margem, pct, positivo: margem >= 0 };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                preco_custo: formData.preco_custo ? parseFloat(formData.preco_custo) : null,
                preco: parseFloat(formData.preco),
                quantidade_estoque: parseInt(formData.quantidade_estoque),
                estoque_minimo: parseInt(formData.estoque_minimo),
            };

            if (editingProduct) {
                await productsAPI.update(editingProduct.id, data);
                showMessage('Produto atualizado com sucesso!');
            } else {
                await productsAPI.create(data);
                showMessage('Produto criado com sucesso!');
            }

            resetForm();
            loadProducts();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Erro ao salvar produto', 'danger');
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            nome: product.nome,
            codigo: product.codigo,
            tamanho: product.tamanho || '',
            cor: product.cor || '',
            categoria: product.categoria || '',
            preco_custo: product.preco_custo || '',
            preco: product.preco,
            quantidade_estoque: product.quantidade_estoque,
            estoque_minimo: product.estoque_minimo,
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        try {
            await productsAPI.delete(id);
            showMessage('Produto excluído com sucesso!');
            loadProducts();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Erro ao excluir produto', 'danger');
        } finally {
            setConfirmDelete(null);
        }
    };

    const handleImageUpload = async (productId, file) => {
        if (!file) return;
        try {
            setUploadingId(productId);
            const fd = new FormData();
            fd.append('file', file);
            await productsAPI.uploadImage(productId, fd);
            showMessage('Foto atualizada com sucesso!');
            loadProducts();
        } catch {
            showMessage('Erro ao enviar foto', 'danger');
        } finally {
            setUploadingId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            codigo: '',
            tamanho: '',
            cor: '',
            categoria: '',
            preco_custo: '',
            preco: '',
            quantidade_estoque: 0,
            estoque_minimo: 5,
        });
        setEditingProduct(null);
        setShowForm(false);
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const filteredProducts = products.filter((p) => {
        const q = search.toLowerCase();
        return (
            p.nome.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q) ||
            (p.categoria || '').toLowerCase().includes(q)
        );
    });

    const margin = calcMargin();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="products-page fade-in">
            {confirmDelete && (
                <ConfirmModal
                    title="Excluir produto?"
                    message={`"${confirmDelete.nome}" será removido permanentemente.`}
                    onConfirm={() => handleDelete(confirmDelete.id)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Produtos</h1>
                    <p className="text-muted">Gerenciar produtos do estoque</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditingProduct(null); setFormData({ nome: '', codigo: '', tamanho: '', cor: '', categoria: '', preco_custo: '', preco: '', quantidade_estoque: 0, estoque_minimo: 5 }); setShowForm(true); }}
                >
                    + Novo Produto
                </button>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            {showForm && (
                <FormModal
                    title={editingProduct ? `Editar Produto — ${editingProduct?.nome}` : 'Novo Produto'}
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
                                <label className="form-label">Código *</label>
                                <input
                                    type="text"
                                    name="codigo"
                                    className="form-input"
                                    value={formData.codigo}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tamanho</label>
                                <select
                                    name="tamanho"
                                    className="form-input"
                                    value={formData.tamanho}
                                    onChange={handleInputChange}
                                >
                                    <option value="">-- Selecione --</option>
                                    {TAMANHOS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cor</label>
                                <input
                                    type="text"
                                    name="cor"
                                    className="form-input"
                                    value={formData.cor}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select
                                    name="categoria"
                                    className="form-input"
                                    value={formData.categoria}
                                    onChange={handleInputChange}
                                >
                                    <option value="">-- Selecione --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.nome}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantidade em Estoque *</label>
                                <input
                                    type="number"
                                    name="quantidade_estoque"
                                    className="form-input"
                                    value={formData.quantidade_estoque}
                                    onChange={handleInputChange}
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Preço de Custo (R$)</label>
                                <input
                                    type="number"
                                    name="preco_custo"
                                    className="form-input"
                                    value={formData.preco_custo}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    min="0"
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Preço de Venda (R$) *</label>
                                <input
                                    type="number"
                                    name="preco"
                                    className="form-input"
                                    value={formData.preco}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    min="0"
                                    required
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Estoque Mínimo *</label>
                                <input
                                    type="number"
                                    name="estoque_minimo"
                                    className="form-input"
                                    value={formData.estoque_minimo}
                                    onChange={handleInputChange}
                                    min="0"
                                    required
                                />
                            </div>
                        </div>

                        {margin && (
                            <div className="margin-preview" style={{
                                margin: '0.5rem 0 1rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                background: margin.positivo ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${margin.positivo ? '#10b981' : '#ef4444'}`,
                                color: margin.positivo ? '#10b981' : '#ef4444',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                            }}>
                                {margin.positivo ? '📈' : '📉'} Margem:{' '}
                                {formatCurrency(margin.margem)} ({margin.pct}%)
                                {!margin.positivo && ' — preço de venda abaixo do custo!'}
                            </div>
                        )}

                        <div className="flex gap-md mt-lg">
                            <button type="submit" className="btn btn-success">
                                {editingProduct ? 'Atualizar' : 'Criar'} Produto
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={resetForm}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </FormModal>
            )}

            <div className="card">
                <div className="card-header flex justify-between items-center">
                    <h3 className="card-title">Lista de Produtos ({filteredProducts.length})</h3>
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="🔍 Buscar por nome, código ou categoria..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {filteredProducts.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nome</th>
                                    <th>Categoria</th>
                                    <th>Tam.</th>
                                    <th>Custo</th>
                                    <th>Venda</th>
                                    <th>Margem</th>
                                    <th>Estoque</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => {
                                    const m = product.preco_custo
                                        ? ((product.preco - product.preco_custo) / product.preco * 100).toFixed(1)
                                        : null;
                                    return (
                                        <tr key={product.id}>
                                            <td>{product.codigo}</td>
                                            <td>{product.nome}</td>
                                            <td>{product.categoria || '-'}</td>
                                            <td>{product.tamanho || '-'}</td>
                                            <td>{product.preco_custo ? formatCurrency(product.preco_custo) : '-'}</td>
                                            <td>{formatCurrency(product.preco)}</td>
                                            <td>
                                                {m !== null ? (
                                                    <span style={{ color: parseFloat(m) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                        {m}%
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td>{product.quantidade_estoque}</td>
                                            <td>
                                                {product.quantidade_estoque <= product.estoque_minimo ? (
                                                    <span className="badge badge-warning">Baixo</span>
                                                ) : (
                                                    <span className="badge badge-success">OK</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                    ) : (
                                                        <label title="Upload foto" style={{ cursor: 'pointer', fontSize: '1.1rem', opacity: 0.5 }}>
                                                            📷
                                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                                onChange={e => handleImageUpload(product.id, e.target.files[0])} />
                                                        </label>
                                                    )}
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(product)}>Editar</button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(product)}>Excluir</button>
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
                            {search ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto cadastrado ainda.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Products;
