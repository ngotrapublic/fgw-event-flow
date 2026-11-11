import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';

import BorrowForm from '../BorrowForm';
import BorrowHome from '../BorrowHome';
import BorrowReturn from '../BorrowReturn';
import BorrowRequestCard from '../BorrowRequestCard';
import AccessibleDialog from '../AccessibleDialog';
import { formatVnDueDate, getVnOffsetDateStr } from '../../../lib/borrow-utils';

const {
    mockShowSuccess,
    mockShowError,
    mockUseAuth,
    mockGetResources,
    mockCreate,
    mockGetMy,
    mockLookupOtp,
    mockLookupVerify,
    mockReturnRequest,
    mockResendVerification,
    mockNavigate
} = vi.hoisted(() => ({
    mockShowSuccess: vi.fn(),
    mockShowError: vi.fn(),
    mockUseAuth: vi.fn(() => ({ user: null, loading: false })),
    mockGetResources: vi.fn(),
    mockCreate: vi.fn(),
    mockGetMy: vi.fn(),
    mockLookupOtp: vi.fn(),
    mockLookupVerify: vi.fn(),
    mockReturnRequest: vi.fn(),
    mockResendVerification: vi.fn(),
    mockNavigate: vi.fn()
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

vi.mock('../../Toast', () => ({
    useToast: () => ({
        showSuccess: mockShowSuccess,
        showError: mockShowError
    })
}));

vi.mock('../../../api/borrow', () => ({
    borrowApi: {
        getResources: (...args) => mockGetResources(...args),
        create: (...args) => mockCreate(...args),
        getMy: (...args) => mockGetMy(...args),
        lookupOtp: (...args) => mockLookupOtp(...args),
        lookupVerify: (...args) => mockLookupVerify(...args),
        returnRequest: (...args) => mockReturnRequest(...args),
        resendVerification: (...args) => mockResendVerification(...args)
    }
}));

async function runAxeCheck(container) {
    const results = await axe.run(container, {
        rules: {
            // jsdom does not compute Tailwind CSS layout/background colors
            'color-contrast': { enabled: false },
            region: { enabled: false }
        }
    });
    expect(results.violations).toEqual([]);
}

describe('Borrow Public UI — Timezone, Accessibility, OTP & Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        mockGetMy.mockResolvedValue({ data: { requests: [] } });
        mockGetResources.mockResolvedValue({
            data: [
                { id: 'res-mic', label: 'Mic Không Dây Shure', category: 'Âm thanh', availableQty: 3 },
                { id: 'res-proj', label: 'Máy Chiếu Sony Laser', category: 'Hình ảnh', availableQty: 0 }
            ]
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    // Test #10 from Review §5
    it('due_date_renders_same_calendar_day_in_utc_minus_8_and_plus_10', () => {
        // UTC-8 (America/Los_Angeles): 2026-11-12T00:00Z -> local 2026-11-11
        // UTC+10 (Australia/Sydney):  2026-11-12T16:59:59Z -> local 2026-11-13
        const request = {
            id: 'req-tz-1',
            status: 'handed_over',
            dueDate: '2026-11-12',
            dueAt: '2026-11-12T16:59:59.000Z',
            items: [{ resourceId: 'res-mic', label: 'Mic', qty: 1 }],
            borrower: { name: 'Sinh Viên Test' }
        };

        // Simulate a host device returning shifted local getters (e.g. UTC-8 previous day / UTC+10 next day)
        const spyGetDate = vi.spyOn(Date.prototype, 'getDate').mockReturnValue(13);
        const spyGetDay = vi.spyOn(Date.prototype, 'getDay').mockReturnValue(5);
        const spyGetTimezoneOffset = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-600); // UTC+10
        vi.stubEnv('TZ', 'Australia/Sydney');

        const { unmount } = render(<BorrowRequestCard request={request} />);
        expect(screen.getByText(/12\/11\/2026 · 23:59 giờ Việt Nam/)).toBeInTheDocument();
        expect(formatVnDueDate('2026-11-12T16:59:59.000Z')).toBe('Thứ 5, 12/11/2026 · 23:59 giờ Việt Nam');
        expect(getVnOffsetDateStr(1, Date.UTC(2026, 10, 11, 18, 0, 0))).toBe('2026-11-13'); // 01:00+07 on Nov 12 -> +1 = Nov 13
        unmount();

        // Now flip simulated host timezone to UTC-8 (America/Los_Angeles)
        spyGetDate.mockReturnValue(11);
        spyGetDay.mockReturnValue(3);
        spyGetTimezoneOffset.mockReturnValue(480); // UTC-8
        vi.stubEnv('TZ', 'America/Los_Angeles');

        render(<BorrowRequestCard request={request} />);
        expect(screen.getByText(/12\/11\/2026 · 23:59 giờ Việt Nam/)).toBeInTheDocument();
        expect(formatVnDueDate('2026-11-12')).toBe('Thứ 5, 12/11/2026 · 23:59 giờ Việt Nam');
        expect(getVnOffsetDateStr(1, Date.UTC(2026, 10, 11, 18, 0, 0))).toBe('2026-11-13');
    });

    // Test #11 from Review §5
    it('borrow_form_and_otp_pass_axe', async () => {
        const user = userEvent.setup();
        const { container: formContainer, unmount: unmountForm } = render(
            <MemoryRouter>
                <BorrowForm />
            </MemoryRouter>
        );

        await screen.findByText('Mic Không Dây Shure');

        // Explicit label / input associations
        expect(screen.getByLabelText(/Họ và tên/i)).toHaveAttribute('autocomplete', 'name');
        expect(screen.getByLabelText(/Email nhận thông báo/i)).toHaveAttribute('autocomplete', 'email');
        expect(screen.getByLabelText(/Số điện thoại liên hệ/i)).toHaveAttribute('autocomplete', 'tel');
        expect(screen.getByLabelText(/Ngày hẹn trả thiết bị/i)).toBeInTheDocument();
        expect(
            screen.getByText(/Gửi yêu cầu không đồng nghĩa đã giữ thiết bị/i)
        ).toBeInTheDocument();

        await runAxeCheck(formContainer);

        // Submitting invalid form reveals accessible inline role="alert" messages linked via aria-describedby
        await user.click(screen.getByRole('button', { name: /HOÀN TẤT ĐĂNG KÝ/i }));
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(4);
        expect(screen.getByLabelText(/Họ và tên/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/Email nhận thông báo/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/Số điện thoại liên hệ/i)).toHaveAttribute('aria-invalid', 'true');
        unmountForm();

        // Check OTP lookup view passes axe + semantic OTP input
        mockLookupOtp.mockResolvedValueOnce({ data: { message: 'OTP sent' } });
        const { container: returnContainer, unmount: unmountReturn } = render(
            <MemoryRouter>
                <BorrowReturn />
            </MemoryRouter>
        );

        const phoneInput = await screen.findByLabelText(/Số điện thoại người mượn/i);
        await user.type(phoneInput, '0901234567');
        await user.click(screen.getByRole('button', { name: /Gửi Mã OTP Đến Email Đăng Ký/i }));

        const otpInput = await screen.findByLabelText(/Mã Xác Thực OTP/i);
        expect(otpInput).toHaveAttribute('autocomplete', 'one-time-code');
        expect(otpInput).toHaveAttribute('inputmode', 'numeric');
        await runAxeCheck(returnContainer);
        unmountReturn();

        // Check AccessibleDialog role="dialog", aria-modal, Esc close and focus restoration
        function DialogHarness() {
            const [open, setOpen] = React.useState(false);
            return (
                <div>
                    <button type="button" onClick={() => setOpen(true)}>
                        Mở hộp thoại
                    </button>
                    <AccessibleDialog open={open} onClose={() => setOpen(false)} titleId="dlg-title">
                        <h2 id="dlg-title">Tiêu đề hộp thoại</h2>
                        <button type="button" onClick={() => setOpen(false)}>
                            Xác nhận
                        </button>
                    </AccessibleDialog>
                </div>
            );
        }

        const { container: dialogContainer } = render(<DialogHarness />);
        const trigger = screen.getByRole('button', { name: 'Mở hộp thoại' });
        await user.click(trigger);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'dlg-title');
        expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
        await runAxeCheck(dialogContainer);

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    // Test #12 from Review §5
    it('otp_backspace_clears_previous_digit_and_full_paste_fills_all', async () => {
        const user = userEvent.setup();
        mockLookupOtp.mockResolvedValueOnce({ data: { message: 'OTP sent' } });
        mockLookupVerify.mockResolvedValueOnce({
            data: {
                requests: [
                    {
                        id: 'req-lookup-1',
                        status: 'handed_over',
                        dueDate: '2026-11-20',
                        items: [{ resourceId: 'res-mic', label: 'Mic Không Dây', qty: 1 }]
                    }
                ]
            }
        });

        render(
            <MemoryRouter>
                <BorrowReturn />
            </MemoryRouter>
        );

        const phoneInput = await screen.findByLabelText(/Số điện thoại người mượn/i);
        await user.type(phoneInput, '0901234567');
        await user.click(screen.getByRole('button', { name: /Gửi Mã OTP Đến Email Đăng Ký/i }));

        const otpInput = await screen.findByLabelText(/Mã Xác Thực OTP/i);
        await user.click(otpInput);

        // Paste full 6-digit code
        fireEvent.paste(otpInput, {
            clipboardData: {
                getData: () => '123456'
            }
        });
        expect(otpInput).toHaveValue('123456');

        // Single Backspace must immediately delete the last digit without requiring 2 keystrokes
        await user.keyboard('{Backspace}');
        expect(otpInput).toHaveValue('12345');
        expect(otpInput).toHaveFocus();

        // Typing '6' restores all 6 digits and enables submission
        await user.type(otpInput, '6');
        expect(otpInput).toHaveValue('123456');

        await user.click(screen.getByRole('button', { name: /Xác Nhận & Tra Cứu/i }));
        await waitFor(() => {
            expect(mockLookupVerify).toHaveBeenCalledWith('0901234567', '123456');
        });
    });

    // Test #13 from Review §5
    it('resource_fetch_failure_shows_retry_not_empty_inventory', async () => {
        const user = userEvent.setup();
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockGetResources.mockRejectedValueOnce(new Error('Network timeout'));

        const { unmount } = render(
            <MemoryRouter>
                <BorrowForm />
            </MemoryRouter>
        );

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/Không thể tải danh mục thiết bị/i);
        expect(screen.queryByText(/Không có thiết bị nào/i)).not.toBeInTheDocument();

        const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
        expect(retryBtn).toBeInTheDocument();

        // Retry recovers and renders actual equipment
        mockGetResources.mockResolvedValueOnce({
            data: [{ id: 'res-mic', label: 'Mic Không Dây Shure', category: 'Âm thanh', availableQty: 3 }]
        });
        await user.click(retryBtn);
        expect(await screen.findByText('Mic Không Dây Shure')).toBeInTheDocument();
        unmount();

        // Also confirm BorrowHome separates network failure from empty requests
        mockGetMy.mockRejectedValueOnce(new Error('Server 500'));
        render(
            <MemoryRouter>
                <BorrowHome />
            </MemoryRouter>
        );
        const homeAlert = await screen.findByRole('alert');
        expect(homeAlert).toHaveTextContent(/Không thể tải danh sách phiếu mượn/i);
        expect(screen.queryByText(/Bạn chưa có phiếu mượn nào đang mở/i)).not.toBeInTheDocument();

        consoleErrorSpy.mockRestore();
    });

    // Test #14 from Review §5
    it('out_of_stock_resource_remains_visible_and_disabled', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <BorrowForm />
            </MemoryRouter>
        );

        await screen.findByText('Mic Không Dây Shure');
        const outOfStockCardTitle = screen.getByText('Máy Chiếu Sony Laser');
        expect(outOfStockCardTitle).toBeInTheDocument();
        expect(screen.getByText('Hết hàng')).toBeInTheDocument();

        const checkboxes = screen.getAllByRole('checkbox');
        const disabledCheckbox = checkboxes.find((el) => el.textContent.includes('Máy Chiếu Sony Laser'));
        expect(disabledCheckbox).toBeDisabled();
        expect(disabledCheckbox).toHaveAttribute('aria-checked', 'false');
        expect(disabledCheckbox).toHaveTextContent(/Còn sẵn:\s*0/);

        await user.click(disabledCheckbox);
        expect(disabledCheckbox).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByText('0 món')).toBeInTheDocument();
    });
});
