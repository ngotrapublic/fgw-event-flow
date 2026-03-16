import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EventDashboard from './components/EventDashboard';
import EventForm from './components/EventForm';
import Settings from './components/Settings';
import Layout from './layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import DepartmentManager from './components/DepartmentManager';
import LocationManager from './components/LocationManager'; // ✅ NEW
import PrintPortal from './components/PrintPortal'; // ✅ NEW
// System Settings Modules
import NotificationSettings from './components/settings/NotificationSettings';
import AuditLogs from './components/settings/AuditLogs';
import ResourceManager from './components/settings/ResourceManager';
import DataRetention from './components/settings/DataRetention';
import UserManagement from './components/settings/UserManagement';

import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Unauthorized } from './components/auth/ProtectedRoute';

import { NotificationProvider } from './context/NotificationContext'; // ✅ NEW

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <NotificationProvider>
                    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/unauthorized" element={<Unauthorized />} />

                            {/* Protected Routes Wrapper */}
                            <Route element={<Layout />}>
                                {/* Dashboard - Accessible to all logged in users */}
                                <Route element={<ProtectedRoute />}>
                                    <Route path="/" element={<EventDashboard />} />
                                    <Route path="/print-portal/:id" element={<PrintPortal />} />
                                </Route>

                                {/* Management Routes - Admin & Manager & User (Ownership check inside) */}
                                <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'user']} />}>
                                    <Route path="/register" element={
                                        <ErrorBoundary>
                                            <EventForm />
                                        </ErrorBoundary>
                                    } />
                                    <Route path="/events/:id/edit" element={
                                        <ErrorBoundary>
                                            <EventForm />
                                        </ErrorBoundary>
                                    } />
                                    <Route path="/departments" element={<DepartmentManager />} />
                                    <Route path="/locations" element={<LocationManager />} />
                                </Route>

                                {/* Admin Routes - Admin Only */}
                                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/settings/users" element={<UserManagement />} />
                                    <Route path="/settings/notifications" element={<NotificationSettings />} />
                                    <Route path="/settings/audit-logs" element={<AuditLogs />} />
                                    <Route path="/settings/resources" element={<ResourceManager />} />
                                    <Route path="/settings/data-retention" element={<DataRetention />} />
                                </Route>
                            </Route>
                        </Routes>
                    </Router>
                </NotificationProvider>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
