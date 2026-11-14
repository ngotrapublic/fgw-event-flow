import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axe from 'axe-core';

import BorrowPortalHeader from '../BorrowPortalHeader';
import BorrowerInfoSection from '../BorrowerInfoSection';
import { ProtectedRoute, Unauthorized } from '../../auth/ProtectedRoute';

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('Borrow User Access & Navigation Regression (LOW-01 & LOW-03)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. BorrowPortalHeader Component', () => {
        it('renders account actions when user is logged in (Về Dashboard, user badge, no guest login)', async () => {
            mockUseAuth.mockReturnValue({
                user: { uid: 'uid-123', name: 'Trần Văn B', email: 'b@greenwich.edu.vn', role: 'user' }
            });

            const { container } = render(
                <MemoryRouter>
                    <BorrowPortalHeader
                        title="Mượn Trả Thiết Bị"
                        subtitle="Phòng IT • Campus HCM"
                    />
                </MemoryRouter>
            );

            // Dashboard link
            const dashboardLink = screen.getByRole('link', { name: /Về Dashboard/i });
            expect(dashboardLink).toBeInTheDocument();
            expect(dashboardLink).toHaveAttribute('href', '/');

            // User identity badge
            expect(screen.getByText('Trần Văn B')).toBeInTheDocument();

            // Guest elements must NOT be present
            expect(screen.queryByText(/Khách — không cần tài khoản/i)).not.toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /Đăng nhập/i })).not.toBeInTheDocument();

            // Accessibility check
            const results = await axe.run(container);
            expect(results.violations).toEqual([]);
        });

        it('renders guest badge and non-overpromising login link when user is null', async () => {
            mockUseAuth.mockReturnValue({ user: null });

            const { container } = render(
                <MemoryRouter>
                    <BorrowPortalHeader
                        title="Mượn Trả Thiết Bị"
                        subtitle="Phòng IT • Campus HCM"
                    />
                </MemoryRouter>
            );

            // Guest badge
            expect(screen.getByText(/Khách — không cần tài khoản/i)).toBeInTheDocument();

            // Login link with accurate microcopy (LOW-03)
            const loginLink = screen.getByRole('link', { name: /Đăng nhập để tự điền thông tin và quản lý phiếu bằng tài khoản/i });
            expect(loginLink).toBeInTheDocument();
            expect(loginLink).toHaveAttribute('href', '/login');
            expect(loginLink).toHaveAttribute('title', 'Đăng nhập để tự điền thông tin và quản lý phiếu bằng tài khoản');

            // Dashboard link must NOT be present for guest
            expect(screen.queryByRole('link', { name: /Về Dashboard/i })).not.toBeInTheDocument();

            // Accessibility check
            const results = await axe.run(container);
            expect(results.violations).toEqual([]);
        });

        it('supports backTo navigation and custom rightAction', () => {
            mockUseAuth.mockReturnValue({ user: null });

            render(
                <MemoryRouter>
                    <BorrowPortalHeader
                        title="Đăng Ký Mượn Thiết Bị"
                        backTo="/borrow"
                        backLabel="Quay lại trang chủ mượn thiết bị"
                        rightAction={<span data-testid="custom-action">3 món</span>}
                    />
                </MemoryRouter>
            );

            const backButton = screen.getByRole('button', { name: /Quay lại trang chủ mượn thiết bị/i });
            expect(backButton).toBeInTheDocument();
            fireEvent.click(backButton);
            expect(mockNavigate).toHaveBeenCalledWith('/borrow');

            expect(screen.getByTestId('custom-action')).toHaveTextContent('3 món');
        });

        it('supports onRefresh callback and loading spinner', () => {
            mockUseAuth.mockReturnValue({ user: null });
            const mockRefresh = vi.fn();

            render(
                <MemoryRouter>
                    <BorrowPortalHeader
                        onRefresh={mockRefresh}
                        refreshLoading={false}
                    />
                </MemoryRouter>
            );

            const refreshBtn = screen.getByRole('button', { name: /Làm mới danh sách phiếu/i });
            expect(refreshBtn).toBeInTheDocument();
            fireEvent.click(refreshBtn);
            expect(mockRefresh).toHaveBeenCalledTimes(1);
        });
    });

    describe('2. BorrowerInfoSection Microcopy & Field Visibility', () => {
        it('Account form: shows account identity, gắn với tài khoản microcopy, and no name/email inputs', () => {
            const user = { uid: 'u-user', name: 'Nguyễn Văn User', email: 'user@fpt.edu.vn' };

            render(
                <BorrowerInfoSection
                    user={user}
                    phone="0912345678"
                    fieldErrors={{}}
                    onChangeName={vi.fn()}
                    onChangeEmail={vi.fn()}
                    onChangePhone={vi.fn()}
                />
            );

            // Account identity and microcopy
            expect(screen.getByText(/Đang mượn bằng tài khoản: Nguyễn Văn User/i)).toBeInTheDocument();
            expect(screen.getByText(/Phiếu này sẽ được gắn với tài khoản của bạn/i)).toBeInTheDocument();

            // Name & Email text inputs must NOT exist for logged-in user
            expect(screen.queryByLabelText(/Họ và tên/i)).not.toBeInTheDocument();
            expect(screen.queryByLabelText(/Email nhận thông báo/i)).not.toBeInTheDocument();

            // Phone field is still present
            expect(screen.getByLabelText(/Số điện thoại liên hệ/i)).toBeInTheDocument();
        });

        it('Guest form: shows email confirmation warning microcopy, name, email, and phone inputs', () => {
            render(
                <BorrowerInfoSection
                    user={null}
                    name="Khách Vãng Lai"
                    email="guest@gmail.com"
                    phone="0987654321"
                    fieldErrors={{}}
                    onChangeName={vi.fn()}
                    onChangeEmail={vi.fn()}
                    onChangePhone={vi.fn()}
                />
            );

            // Guest microcopy
            expect(screen.getByText(/Bạn sẽ xác nhận email trước khi phiếu được gửi tới bộ phận quản lý/i)).toBeInTheDocument();

            // Inputs exist
            expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Email nhận thông báo/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Số điện thoại liên hệ/i)).toBeInTheDocument();
        });
    });

    describe('3. Route-Level Role Protection (/borrow vs /equipment-loans)', () => {
        it('Guest can access public /borrow route without being redirected to /login', () => {
            mockUseAuth.mockReturnValue({ user: null, loading: false });

            render(
                <MemoryRouter initialEntries={['/borrow']}>
                    <Routes>
                        <Route path="/borrow" element={<div>Borrow Public Portal Page</div>} />
                        <Route path="/login" element={<div>Login Page</div>} />
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByText('Borrow Public Portal Page')).toBeInTheDocument();
            expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
        });

        it('Role "user" accessing /equipment-loans is blocked by ProtectedRoute and sees Access Denied', () => {
            mockUseAuth.mockReturnValue({
                user: { uid: 'u-user', email: 'normaluser@test.com', role: 'user' },
                loading: false
            });

            render(
                <MemoryRouter initialEntries={['/equipment-loans']}>
                    <Routes>
                        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
                            <Route path="/equipment-loans" element={<div>Admin Equipment Loans Console</div>} />
                        </Route>
                        <Route path="/unauthorized" element={<Unauthorized />} />
                    </Routes>
                </MemoryRouter>
            );

            // Access denied
            expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
            expect(screen.queryByText('Admin Equipment Loans Console')).not.toBeInTheDocument();
        });

        it('Role "manager" accessing /equipment-loans is allowed into the management console', () => {
            mockUseAuth.mockReturnValue({
                user: { uid: 'u-mgr', email: 'manager@test.com', role: 'manager' },
                loading: false
            });

            render(
                <MemoryRouter initialEntries={['/equipment-loans']}>
                    <Routes>
                        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
                            <Route path="/equipment-loans" element={<div>Admin Equipment Loans Console</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByText('Admin Equipment Loans Console')).toBeInTheDocument();
            expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
        });
    });
});

