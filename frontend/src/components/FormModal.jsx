import { useEffect } from 'react';

export default function FormModal({ title, onClose, children, maxWidth = 720 }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div className="form-modal-overlay" onClick={onClose}>
            <div className="form-modal" style={{ maxWidth: `${maxWidth}px` }} onClick={e => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
                    <button className="form-modal-close" onClick={onClose} title="Fechar (Esc)">✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}
