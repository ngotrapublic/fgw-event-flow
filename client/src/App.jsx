import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, Unauthorized } from './components/auth/ProtectedRoute';
import { NotificationProvider } from './context/NotificationContext';

// Lazy-loaded Routes so public /borrow pages never eagerly download heavy dashboard/admin bundles
const Login = lazy(() => import('./components/auth/Login'));
const Layout = lazy(() => import('./layout/Layout'));
const EventDashboard = lazy(() => import('./components/EventDashboard'));
const EventForm = lazy(() => import('./components/EventForm'));
const Settings = lazy(() => import('./components/Settings'));
const DepartmentManager = lazy(() => import('./components/DepartmentManager'));
const LocationManager = lazy(() => import('./components/LocationManager'));
const PrintPortal = lazy(() => import('./components/PrintPortal'));

const NotificationSettings = lazy(() => import('./components/settings/NotificationSettings'));
const AuditLogs = lazy(() => import('./components/settings/AuditLogs'));
const ResourceManager = lazy(() => import('./components/settings/ResourceManager'));
const DataRetention = lazy(() => import('./components/settings/DataRetention'));
const UserManagement = lazy(() => import('./components/settings/UserManagement'));
const EquipmentLoans = lazy(() => import('./components/settings/EquipmentLoans'));
const BorrowQr = lazy(() => import('./components/settings/BorrowQr'));

// Equipment Borrow Public Pages
const BorrowHome = lazy(() => import('./components/borrow/BorrowHome'));
const BorrowForm = lazy(() => import('./components/borrow/BorrowForm'));
const BorrowVerify = lazy(() => import('./components/borrow/BorrowVerify'));
const BorrowManage = lazy(() => import('./components/borrow/BorrowManage'));
const BorrowReturn = lazy(() => import('./components/borrow/BorrowReturn'));

function RouteLoadingFallback() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-slate-700 p-6"
        >
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin motion-reduce:animate-none mb-3" />
            <p className="text-sm font-bold text-slate-700">Đang tải trang...</p>
        </div>
    );
}

function App() {
    return (
        <MotionConfig reducedMotion="user">
            <ToastProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                            <Suspense fallback={<RouteLoadingFallback />}>
                                <Routes>
                                    {/* Public Routes */}
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/unauthorized" element={<Unauthorized />} />

                                    {/* Equipment Borrow Public Routes */}
                                    <Route path="/borrow" element={<BorrowHome />} />
                                    <Route path="/borrow/new" element={<BorrowForm />} />
                                    <Route path="/borrow/verify" element={<BorrowVerify />} />
                                    <Route path="/borrow/manage" element={<BorrowManage />} />
                                    <Route path="/borrow/return" element={<BorrowReturn />} />

                                    {/* Protected Routes Wrapper */}
                                    <Route element={<Layout />}>
                                        {/* Dashboard - Accessible to all logged in users */}
                                        <Route element={<ProtectedRoute />}>
                                            <Route path="/" element={<EventDashboard />} />
                                            <Route path="/print-portal/:id" element={<PrintPortal />} />
                                        </Route>

                                        {/* Management Routes - Admin & Manager & User (Ownership check inside) */}
                                        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'user']} />}>
                                            <Route
                                                path="/register"
                                                element={
                                                    <ErrorBoundary>
                                                        <EventForm />
                                                    </ErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="/events/:id/edit"
                                                element={
                                                    <ErrorBoundary>
                                                        <EventForm />
                                                    </ErrorBoundary>
                                                }
                                            />
                                            <Route path="/departments" element={<DepartmentManager />} />
                                            <Route path="/locations" element={<LocationManager />} />
                                        </Route>

                                        {/* Equipment Borrow Management - Admin & Manager */}
                                        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
                                            <Route path="/equipment-loans" element={<EquipmentLoans />} />
                                            <Route path="/equipment-loans/qr" element={<BorrowQr />} />
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
                            </Suspense>
                        </Router>
                    </NotificationProvider>
                </AuthProvider>
            </ToastProvider>
        </MotionConfig>
    );
}

export default App;
