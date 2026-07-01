import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Movements from './pages/Movements';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import PDV from './pages/PDV';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Caixa from './pages/Caixa';
import './index.css';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/*" element={
                        <ProtectedRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/products" element={<Products />} />
                                    <Route path="/categories" element={<Categories />} />
                                    <Route path="/suppliers" element={<Suppliers />} />
                                    <Route path="/customers" element={<Customers />} />
                                    <Route path="/sales" element={<Sales />} />
                                    <Route path="/movements" element={<Movements />} />
                                    <Route path="/reports" element={<Reports />} />
                                    <Route path="/pdv" element={<PDV />} />
                                    <Route path="/users" element={<Users />} />
                                    <Route path="/audit" element={<AuditLogs />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/caixa" element={<Caixa />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Layout>
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
