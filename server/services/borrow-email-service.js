const emailService = require('./emailService');
const { getSettingsInternal } = require('../controllers/settingsController');
const HttpError = require('../utils/http-error');

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function assertEmailEnabled() {
    const settings = getSettingsInternal();
    if (!settings || !settings.channels || settings.channels.email === false) {
        throw new HttpError(503, 'Hệ thống email đang tắt, vui lòng liên hệ quản trị viên');
    }
}

function getAppPublicUrl() {
    const url = process.env.APP_PUBLIC_URL;
    if (!url) {
        throw new HttpError(503, 'Chưa cấu hình APP_PUBLIC_URL');
    }
    return url.replace(/\/+$/, '');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        // Format as DD/MM/YYYY in Vietnam time
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        }).format(d);
    } catch {
        return String(dateStr);
    }
}

function renderItemList(items = []) {
    const rows = items.map(item => {
        const label = escapeHtml(item.label || item.resourceId);
        const qty = item.qty || 0;
        const received = item.receivedQty !== undefined && item.receivedQty !== null
            ? ` (Đã nhận lại: ${item.receivedQty})`
            : '';
        return `<li style="margin-bottom: 6px;"><strong>${label}</strong>: ${qty} cái${received}</li>`;
    }).join('');
    return `<ul style="margin: 10px 0; padding-left: 20px;">${rows}</ul>`;
}

function wrapTemplate({ title, content, actionButton = '' }) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 2px solid #000000; border-radius: 12px; box-shadow: 4px 4px 0px 0px #000000; overflow: hidden;">
            <div style="background: #0284c7; padding: 20px 24px; border-bottom: 2px solid #000000;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">HỆ THỐNG MƯỢN TRẢ THIẾT BỊ</h1>
            </div>
            <div style="padding: 24px;">
                <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">${escapeHtml(title)}</h2>
                ${content}
                ${actionButton}
            </div>
            <div style="background: #f8fafc; padding: 16px 24px; border-top: 2px solid #000000; font-size: 12px; color: #64748b; text-align: center;">
                Đây là email tự động từ Hệ thống Quản lý Thiết bị Sự kiện. Vui lòng không trả lời trực tiếp email này.
            </div>
        </div>
    </body>
    </html>
    `;
}

const borrowEmailService = {
    assertEmailEnabled,
    getAppPublicUrl,
    escapeHtml,

    async sendVerify(req, verifyToken, accessToken) {
        assertEmailEnabled();
        const appUrl = getAppPublicUrl();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const verifyUrl = `${appUrl}/borrow/verify?token=${encodeURIComponent(verifyToken)}`;
        const manageUrl = `${appUrl}/borrow/manage?t=${encodeURIComponent(accessToken)}`;
        const dueFormatted = formatDate(req.dueAt || req.dueDate);

        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p>Hệ thống đã nhận được yêu cầu mượn thiết bị mã <strong>#${escapeHtml(req.id)}</strong> của bạn.</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Hạn trả dự kiến:</strong> ${escapeHtml(dueFormatted)}</p>
                <p style="margin: 0 0 8px 0;"><strong>Danh sách thiết bị:</strong></p>
                ${renderItemList(req.items)}
                ${req.note ? `<p style="margin: 8px 0 0 0;"><strong>Ghi chú:</strong> ${escapeHtml(req.note)}</p>` : ''}
            </div>
            <p style="color: #dc2626; font-size: 13px;"><strong>Lưu ý quan trọng:</strong> Vui lòng bấm nút <strong>Xác nhận email</strong> bên dưới để hoàn tất gửi phiếu đến người quản trị. Link xác nhận sẽ hết hạn sau <strong>24 giờ</strong>.</p>
        `;

        const actionButton = `
            <div style="margin: 24px 0; text-align: center;">
                <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 700; border: 2px solid #000000; border-radius: 8px; box-shadow: 2px 2px 0px 0px #000000; margin-right: 12px; margin-bottom: 8px;">Xác nhận email</a>
                <a href="${manageUrl}" style="display: inline-block; background: #f8fafc; color: #0f172a; text-decoration: none; padding: 12px 24px; font-weight: 700; border: 2px solid #000000; border-radius: 8px; box-shadow: 2px 2px 0px 0px #000000; margin-bottom: 8px;">Quản lý / Trả thiết bị</a>
            </div>
        `;

        const subject = `[Mượn thiết bị] Xác nhận yêu cầu mượn thiết bị #${req.id}`;
        const html = wrapTemplate({
            title: `Xác nhận yêu cầu mượn #${req.id}`,
            content,
            actionButton
        });

        await emailService.send([recipient], subject, html);
    },

    async sendCreatedForAccount(req, accessToken) {
        assertEmailEnabled();
        const appUrl = getAppPublicUrl();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const manageUrl = `${appUrl}/borrow/manage?t=${encodeURIComponent(accessToken)}`;
        const dueFormatted = formatDate(req.dueAt || req.dueDate);

        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p>Hệ thống đã tiếp nhận yêu cầu mượn thiết bị mã <strong>#${escapeHtml(req.id)}</strong> của bạn. Yêu cầu đang được chờ người quản lý phê duyệt.</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Hạn trả dự kiến:</strong> ${escapeHtml(dueFormatted)}</p>
                <p style="margin: 0 0 8px 0;"><strong>Danh sách thiết bị:</strong></p>
                ${renderItemList(req.items)}
                ${req.note ? `<p style="margin: 8px 0 0 0;"><strong>Ghi chú:</strong> ${escapeHtml(req.note)}</p>` : ''}
            </div>
            <p>Bạn có thể theo dõi tiến độ và báo trả thiết bị qua liên kết bên dưới:</p>
        `;

        const actionButton = `
            <div style="margin: 24px 0; text-align: center;">
                <a href="${manageUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 700; border: 2px solid #000000; border-radius: 8px; box-shadow: 2px 2px 0px 0px #000000;">Quản lý / Trả thiết bị</a>
            </div>
        `;

        const subject = `[Mượn thiết bị] Tiếp nhận yêu cầu mượn thiết bị #${req.id}`;
        const html = wrapTemplate({
            title: `Tiếp nhận yêu cầu mượn #${req.id}`,
            content,
            actionButton
        });

        await emailService.send([recipient], subject, html);
    },

    async sendApproved(req) {
        assertEmailEnabled();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const dueFormatted = formatDate(req.dueAt || req.dueDate);
        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p style="color: #16a34a; font-size: 16px;"><strong>Yêu cầu mượn thiết bị #${escapeHtml(req.id)} của bạn đã được duyệt!</strong></p>
            <p>Vui lòng đến kho thiết bị để làm thủ tục nhận thiết bị.</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Hạn trả:</strong> ${escapeHtml(dueFormatted)}</p>
                <p style="margin: 0 0 8px 0;"><strong>Danh sách thiết bị:</strong></p>
                ${renderItemList(req.items)}
            </div>
        `;

        const subject = `[Mượn thiết bị] Yêu cầu #${req.id} đã được duyệt`;
        const html = wrapTemplate({
            title: `Yêu cầu #${req.id} đã được duyệt`,
            content
        });

        await emailService.send([recipient], subject, html);
    },

    async sendRejected(req) {
        assertEmailEnabled();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const reason = req.rejectReason || 'Không có lý do chi tiết';
        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p style="color: #dc2626;">Rất tiếc, yêu cầu mượn thiết bị #${escapeHtml(req.id)} của bạn đã bị từ chối.</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: #991b1b;"><strong>Lý do từ chối:</strong> ${escapeHtml(reason)}</p>
            </div>
            <p>Nếu bạn có thắc mắc, vui lòng liên hệ trực tiếp người quản trị kho thiết bị.</p>
        `;

        const subject = `[Mượn thiết bị] Yêu cầu #${req.id} bị từ chối`;
        const html = wrapTemplate({
            title: `Yêu cầu #${req.id} bị từ chối`,
            content
        });

        await emailService.send([recipient], subject, html);
    },

    async sendCancelled(req) {
        assertEmailEnabled();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const reason = req.cancelReason || 'Không có lý do chi tiết';
        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p>Yêu cầu mượn thiết bị #${escapeHtml(req.id)} của bạn đã được huỷ bỏ.</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Lý do huỷ:</strong> ${escapeHtml(reason)}</p>
            </div>
        `;

        const subject = `[Mượn thiết bị] Yêu cầu #${req.id} đã bị huỷ`;
        const html = wrapTemplate({
            title: `Yêu cầu #${req.id} đã bị huỷ`,
            content
        });

        await emailService.send([recipient], subject, html);
    },

    async sendReturned(req) {
        assertEmailEnabled();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const hasIssue = req.status === 'returned_with_issue';
        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p>Kho đã xác nhận nhận lại thiết bị cho yêu cầu mượn mã <strong>#${escapeHtml(req.id)}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Chi tiết thiết bị đã nhận:</strong></p>
                ${renderItemList(req.items)}
                ${hasIssue && req.returnNote ? `<p style="margin: 8px 0 0 0; color: #dc2626;"><strong>Ghi chú sự cố:</strong> ${escapeHtml(req.returnNote)}</p>` : ''}
            </div>
            <p>Cảm ơn bạn đã sử dụng và bàn giao thiết bị đúng quy trình!</p>
        `;

        const subject = `[Mượn thiết bị] Xác nhận đã trả thiết bị #${req.id}`;
        const html = wrapTemplate({
            title: `Xác nhận trả thiết bị #${req.id}`,
            content
        });

        await emailService.send([recipient], subject, html);
    },

    async sendOtp(email, code) {
        assertEmailEnabled();
        if (!email) return;

        const content = `
            <p>Xin chào,</p>
            <p>Mã xác thực tra cứu phiếu mượn thiết bị của bạn là:</p>
            <div style="margin: 20px 0; text-align: center;">
                <span style="display: inline-block; font-size: 28px; font-weight: 900; letter-spacing: 6px; padding: 12px 24px; background: #fef08a; border: 2px solid #000000; border-radius: 8px; box-shadow: 2px 2px 0px 0px #000000;">${escapeHtml(code)}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">Mã xác thực có hiệu lực trong vòng <strong>10 phút</strong>. Nếu không phải bạn yêu cầu tra cứu phiếu mượn, vui lòng bỏ qua email này.</p>
        `;

        const subject = `[Mượn thiết bị] Mã xác thực tra cứu: ${code}`;
        const html = wrapTemplate({
            title: 'Mã xác thực tra cứu phiếu mượn',
            content
        });

        await emailService.send([email], subject, html);
    },

    async sendDueSoon(req, accessToken) {
        assertEmailEnabled();
        const appUrl = getAppPublicUrl();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const manageUrl = accessToken
            ? `${appUrl}/borrow/manage?t=${encodeURIComponent(accessToken)}`
            : `${appUrl}/borrow/manage`;
        const dueFormatted = formatDate(req.dueAt || req.dueDate);

        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p style="color: #b45309;"><strong>Nhắc nhở: Phiếu mượn thiết bị #${escapeHtml(req.id)} của bạn sắp đến hạn trả!</strong></p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Hạn trả:</strong> ${escapeHtml(dueFormatted)}</p>
                <p style="margin: 0 0 8px 0;"><strong>Danh sách thiết bị:</strong></p>
                ${renderItemList(req.items)}
            </div>
            <p>Vui lòng chuẩn bị và mang thiết bị đến kho bàn giao đúng thời hạn.</p>
        `;

        const actionButton = `
            <div style="margin: 24px 0; text-align: center;">
                <a href="${manageUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 700; border: 2px solid #000000; border-radius: 8px; box-shadow: 2px 2px 0px 0px #000000;">Xem phiếu mượn</a>
            </div>
        `;

        const subject = `[Mượn thiết bị] Nhắc nhở sắp đến hạn trả thiết bị #${req.id}`;
        const html = wrapTemplate({
            title: `Sắp đến hạn trả thiết bị #${req.id}`,
            content,
            actionButton
        });

        await emailService.send([recipient], subject, html);
    },

    async sendOverdue(req, accessToken) {
        assertEmailEnabled();
        const appUrl = getAppPublicUrl();
        const recipient = req.borrower?.email;
        if (!recipient) return;

        const manageUrl = accessToken
            ? `${appUrl}/borrow/manage?t=${encodeURIComponent(accessToken)}`
            : `${appUrl}/borrow/manage`;
        const dueFormatted = formatDate(req.dueAt || req.dueDate);

        const content = `
            <p>Xin chào <strong>${escapeHtml(req.borrower?.name || 'Bạn')}</strong>,</p>
            <p style="color: #dc2626; font-size: 16px;"><strong>CẢNH BÁO: Phiếu mượn thiết bị #${escapeHtml(req.id)} của bạn đã QUÁ HẠN!</strong></p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; color: #991b1b;"><strong>Hạn trả đã qua:</strong> ${escapeHtml(dueFormatted)}</p>
                <p style="margin: 0 0 8px 0;"><strong>Danh sách thiết bị cần hoàn trả:</strong></p>
                ${renderItemList(req.items)}
            </div>
            <p>Vui lòng mang thiết bị đến kho bàn giao ngay lập tức để tránh ảnh hưởng đến các sự kiện tiếp theo.</p>
        `;

        const actionButton = `
            <div style="margin: 24px 0; text-align: center;">
                <a href="${manageUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 700; border: 2px solid #000000; border-radius: 8px; box-shadow: 2px 2px 0px 0px #000000;">Xem phiếu mượn</a>
            </div>
        `;

        const subject = `[Mượn thiết bị] CẢNH BÁO: Quá hạn trả thiết bị #${req.id}`;
        const html = wrapTemplate({
            title: `CẢNH BÁO: Quá hạn trả thiết bị #${req.id}`,
            content,
            actionButton
        });

        await emailService.send([recipient], subject, html);
    }
};

module.exports = borrowEmailService;

