import { useState, useEffect } from 'react';
import { categoriesAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import FormModal from '../components/FormModal';

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nome: '', descricao: '' });
    const [message, setMessage] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const r = await categoriesAPI.getAll();
            setCategories(r.data);
        } catch {
            showMessage('Erro ao carregar categorias.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ nome: '', descricao: '' });
        setShowForm(true);
    };

    const openEdit = (cat) => {
        setEditing(cat);
        setForm({ nome: cat.nome, descricao: cat.descricao || '' });
        setShowForm(true);
    };

    const resetForm = () => {
        setForm({ nome: '', descricao: '' });
        setEditing(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await categoriesAPI.update(editing.id, form);
                showMessage('Categoria atualizada com sucesso!');
            } else {
                await categoriesAPI.create(form);
                showMessage('Categoria criada com sucesso!');
            }
            resetForm();
            fetchCategories();
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Erro ao salvar categoria.', 'danger');
        }
    };

    const handleToggleAtivo = async (cat) => {
        try {
            await categoriesAPI.update(cat.id, { ativo: !cat.ativo });
            showMessage(`Categoria ${!cat.ativo ? 'ativada' : 'desativada'} com sucesso!`);
            fetchCategories();
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Erro ao alterar status.', 'danger');
        }
    };

    const handleDelete = async (cat) => {
        setConfirmDelete(null);
        try {
            await categoriesAPI.delete(cat.id);
            showMessage('Categoria excluída com sucesso!');
            fetchCategories();
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Erro ao excluir categoria.', 'danger');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {confirmDelete && (
                <ConfirmModal
                    title="Excluir categoria?"
                    message={`"${confirmDelete.nome}" será removida permanentemente.`}
                    onConfirm={() => handleDelete(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1>Categorias</h1>
                    <p className="text-muted">Gerenciar categorias de produtos</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    + Nova Categoria
                </button>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            {showForm && (
                <FormModal
                    title={editing ? `Editar Categoria — ${editing?.nome}` : 'Nova Categoria'}
                    onClose={resetForm}
                    maxWidth={560}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Nome *</label>
                                <input
                                    type="text"
                                    name="nome"
                                    className="form-input"
                                    value={form.nome}
                                    onChange={handleInputChange}
                                    required
                                    maxLength={100}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input
                                    type="text"
                                    name="descricao"
                                    className="form-input"
                                    value={form.descricao}
                                    onChange={handleInputChange}
                                    maxLength={255}
                                />
                            </div>
                        </div>
                        <div className="flex gap-md mt-lg">
                            <button type="submit" className="btn btn-success">
                                {editing ? 'Atualizar' : 'Criar'} Categoria
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </FormModal>
            )}

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Lista de Categorias ({categories.length})</h3>
                </div>
                {categories.length > 0 ? (
                    <div className="table-container">
                        <table className="table" aria-label="Lista de categorias">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nome</th>
                                    <th>Descrição</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(cat => (
                                    <tr key={cat.id}>
                                        <td>{cat.id}</td>
                                        <td><strong>{cat.nome}</strong></td>
                                        <td>{cat.descricao || '-'}</td>
                                        <td>
                                            <span className={`badge ${cat.ativo ? 'badge-success' : 'badge-danger'}`}>
                                                {cat.ativo ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button className="btn btn-sm btn-primary" onClick={() => openEdit(cat)}>Editar</button>
                                                <button
                                                    className={`btn btn-sm ${cat.ativo ? 'btn-warning' : 'btn-success'}`}
                                                    onClick={() => handleToggleAtivo(cat)}
                                                >
                                                    {cat.ativo ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(cat)}>Excluir</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p className="text-muted">Nenhuma categoria cadastrada ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Categories;
