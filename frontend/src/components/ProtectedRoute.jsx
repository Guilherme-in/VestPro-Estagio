import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requiredRole = null }) {
    const { user, loading } = useAuth();

    if (loading) return <div className="loading-screen">Carregando...</div>;
    if (!user) return <Navigate to="/login" replace />;

    if (requiredRole === 'admin' && user.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }
    if (requiredRole === 'gerente' && !['ADMIN', 'GERENTE'].includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
