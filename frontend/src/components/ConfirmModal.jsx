import { useEffect } from 'react';

function ConfirmModal({ title, message, onConfirm, onCancel, danger = true, confirmLabel = 'Confirmar' }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-icon">{danger ? '⚠️' : 'ℹ️'}</div>
                <h3 className="confirm-modal-title">{title}</h3>
                {message && <p className="confirm-modal-message">{message}</p>}
                <div className="confirm-modal-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} autoFocus>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
