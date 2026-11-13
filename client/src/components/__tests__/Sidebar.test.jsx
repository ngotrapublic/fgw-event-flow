import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

describe('Sidebar — Role Visibility & Navigation (Guide 2026-11-13)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Role user: Thấy "Mượn thiết bị của tôi", không thấy "Quản lý mượn trả" hay các menu admin', () => {
        mockUseAuth.mockReturnValue({
            user: { uid: 'user-123', email: 'user@test.com', role: 'user' },
            logout: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Sidebar onOpenGuide={vi.fn()} onToggle={vi.fn()} />
            </MemoryRouter>
        );

        // User must see "Mượn thiết bị của tôi" pointing to /borrow
        const borrowLink = screen.getByRole('link', { name: /Mượn thiết bị của tôi/i });
        expect(borrowLink).toBeInTheDocument();
        expect(borrowLink).toHaveAttribute('href', '/borrow');

        // Standard user items
        expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Register Event/i })).toBeInTheDocument();

        // User must NOT see admin/manager items
        expect(screen.queryByRole('link', { name: /Quản lý mượn trả/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Equipment Loans/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Departments/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Locations/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/Management/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/System/i)).not.toBeInTheDocument();
    });

    it('Role manager: Thấy cả "Mượn thiết bị của tôi" và "Quản lý mượn trả", Departments, Locations nhưng không thấy Settings', () => {
        mockUseAuth.mockReturnValue({
            user: { uid: 'mgr-123', email: 'manager@test.com', role: 'manager' },
            logout: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Sidebar onOpenGuide={vi.fn()} onToggle={vi.fn()} />
            </MemoryRouter>
        );

        // Manager sees both borrow portal and management console
        const userBorrowLink = screen.getByRole('link', { name: /Mượn thiết bị của tôi/i });
        expect(userBorrowLink).toBeInTheDocument();
        expect(userBorrowLink).toHaveAttribute('href', '/borrow');

        const adminBorrowLink = screen.getByRole('link', { name: /Quản lý mượn trả/i });
        expect(adminBorrowLink).toBeInTheDocument();
        expect(adminBorrowLink).toHaveAttribute('href', '/equipment-loans');

        // Manager sees management resources
        expect(screen.getByRole('link', { name: /Departments/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Locations/i })).toBeInTheDocument();

        // Manager does NOT see System Settings
        expect(screen.queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument();
    });

    it('Role admin: Thấy đầy đủ tất cả menu bao gồm "Mượn thiết bị của tôi", "Quản lý mượn trả" và Settings', () => {
        mockUseAuth.mockReturnValue({
            user: { uid: 'adm-123', email: 'admin@test.com', role: 'admin' },
            logout: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Sidebar onOpenGuide={vi.fn()} onToggle={vi.fn()} />
            </MemoryRouter>
        );

        const userBorrowLink = screen.getByRole('link', { name: /Mượn thiết bị của tôi/i });
        expect(userBorrowLink).toBeInTheDocument();
        expect(userBorrowLink).toHaveAttribute('href', '/borrow');

        const adminBorrowLink = screen.getByRole('link', { name: /Quản lý mượn trả/i });
        expect(adminBorrowLink).toBeInTheDocument();
        expect(adminBorrowLink).toHaveAttribute('href', '/equipment-loans');

        expect(screen.getByRole('link', { name: /Departments/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Locations/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });
});
