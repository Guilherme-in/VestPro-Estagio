import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const saved = localStorage.getItem('user');
        if (token && saved) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser(JSON.parse(saved));
                // Busca dados atualizados do servidor (garante nome_loja e outros campos frescos)
                api.get('/auth/me').then(res => {
                    localStorage.setItem('user', JSON.stringify(res.data));
                    setUser(res.data);
                }).catch(() => {});
            } catch {
                localStorage.clear();
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const resp = await api.post('/auth/login', { username, password });
        const { access_token, user: userData } = resp.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUser(userData);
        return userData;
    };

    const setTokenAndUser = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const isAdmin = () => user?.role === 'ADMIN';
    const isGerenteOrAdmin = () => ['ADMIN', 'GERENTE'].includes(user?.role);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setTokenAndUser, isAdmin, isGerenteOrAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
