# Phase 03 — API admin/manager & job nhắc hạn

## 1. Endpoints — `server/controllers/borrow-admin-controller.js`, mount trong `routes/borrow.js`
Tất cả: `verifyToken, requireRole(['admin', 'manager'])`. `actor = { uid, email, role }` từ `req.user`.

Response admin dùng `toAdminView(req)`: đầy đủ borrower (không che), `history`, mọi field **trừ** `*Hash`.

| Method | Path | Body | Hành động |
|---|---|---|---|
| GET | `/api/borrow/admin/requests` | query `status` (một hoặc nhiều, phân tách dấu phẩy), `overdue=true`, `limit` (≤100, mặc định 50), `cursor` (id) | Không truyền `status` → mọi status **trừ** `unverified`, `expired`. Sort `createdAt desc` |
| GET | `/api/borrow/admin/requests/:id` | — | chi tiết |
| GET | `/api/borrow/admin/counts` | — | `{ pending, approved, handed_over, return_pending, overdue }` — dùng `count()` aggregation |
| POST | `…/requests/:id/approve` | — | `transition(→approved, expectFrom ['pending'], patch { approvedAt: now })` (trừ kho). Gửi `sendApproved`. 409 thiếu hàng → trả `shortages` để UI hiện |
| POST | `…/requests/:id/reject` | `{ reason }` bắt buộc 3–500 ký tự | `→rejected`, `patch.rejectReason`. Gửi `sendRejected` |
| POST | `…/requests/:id/handover` | — | `→handed_over, expectFrom ['approved']` |
| POST | `…/requests/:id/cancel` | `{ reason }` bắt buộc | `→cancelled, expectFrom ['approved']` (cộng kho đủ). Gửi `sendCancelled` |
| POST | `…/requests/:id/confirm-return` | `{ items: [{ resourceId, receivedQty }], returnNote? }` | xem §2 |

Lỗi gửi email sau khi transition thành công → log, response vẫn `200` kèm `emailSent: false` (trạng thái đã đổi là sự thật, không rollback).

## 2. `confirm-return`
- `expectFrom: ['handed_over', 'return_pending']` (cho phép chốt khi người mượn mang trả mà không bấm báo trả).
- `items` phải chứa **đúng** tập `resourceId` của phiếu; `receivedQty` nguyên `0 ≤ x ≤ qty`. Sai → 400.
- Có món `receivedQty < qty` **hoặc** `returnNote` không rỗng → `returned_with_issue`; ngược lại `returned`.
- `patch.items` = items của phiếu với `receivedQty` đã điền; `patch.returnNote`.
- Restock theo `receivedQty` (đã nằm trong `transition`, phase 01).
- Gửi `sendReturned`.

## 3. `server/jobs/borrow-reminder-job.js` (mới)
Theo cấu trúc [reminderJob.js](../../server/jobs/reminderJob.js): class có `start()` (chạy ngay + `setInterval` 15 phút), `stop()`, `run()`; export instance. `run()` có cờ `this.running` để không chạy chồng. Mỗi bước bọc try/catch riêng — một bước lỗi không chặn bước sau.

| Bước | Query | Hành động |
|---|---|---|
| 1. Hết hạn xác nhận | `status == 'unverified'`, `verifyExpiresAt < now` | `transition(→expired)`, `actor = { uid: null, email: 'system' }` |
| 2. Duyệt mà không tới lấy | `status == 'approved'` | `approvedAt` < now − 3 ngày và `approvedStaleNotifiedAt == null` → thông báo admin/manager "Phiếu đã duyệt 3 ngày chưa nhận", set `approvedStaleNotifiedAt`. **Không** tự huỷ |
| 3. Sắp tới hạn | `status == 'handed_over'`, `dueAt` trong (now, now+24h], `dueSoonRemindedAt == null` | `sendDueSoon`, set `dueSoonRemindedAt` |
| 4. Quá hạn | `status == 'handed_over'`, `dueAt < now` | set `isOverdue = true` nếu chưa; nếu `overdueRemindedAt` null hoặc > 24h trước → `sendOverdue` + thông báo admin/manager, set `overdueRemindedAt` |

- Ghi field reminder **trước** khi gửi email (tránh gửi lặp khi crash giữa chừng; chấp nhận mất 1 email hơn là spam).
- `return_pending` không bị nhắc (người mượn đã báo trả).
- Các update ở bước 2–4 là update field trực tiếp (không đổi status) → **không** đi qua `transition()`.
- Đăng ký trong `server/index.js`: `require` cạnh các job khác, `borrowReminderJob.start()` cạnh `reminderJob.start()`, `borrowReminderJob.stop()` trong `gracefulShutdown`.

## Tests
`server/tests/borrow-admin.test.js`
1. User role `user` gọi approve → 403 (test middleware `requireRole` với `req.user.role='user'`).
2. Manager approve → `approved`, kho trừ, `sendApproved` gọi.
3. Approve khi thiếu hàng → 409 có `shortages`, status vẫn `pending`.
4. Reject không có reason → 400.
5. confirm-return đủ → `returned`; thiếu 1 → `returned_with_issue` + kho cộng đúng; có `returnNote` nhưng đủ → `returned_with_issue`.
6. confirm-return thiếu `resourceId` hoặc `receivedQty > qty` → 400.
7. confirm-return trực tiếp từ `handed_over` → được.
8. cancel từ `approved` → kho cộng đủ.
9. List mặc định không có `unverified`/`expired`; response không có `*Hash`.

`server/tests/borrow-reminder-job.test.js`
1. `unverified` quá hạn → `expired`, `isOpen=false`.
2. `handed_over` quá hạn → `isOverdue=true`, `sendOverdue` 1 lần; chạy `run()` lần 2 ngay → không gửi thêm.
3. `handed_over` hạn trong 10h → `sendDueSoon` 1 lần; chạy lại → không gửi.
4. `return_pending` quá hạn → không gửi gì.
5. Bước 1 ném lỗi → bước 4 vẫn chạy.

## Validation
- `cd server && npx jest tests/borrow-admin.test.js tests/borrow-reminder-job.test.js` pass; toàn bộ `npx jest` không giảm.
- Khởi động server: log có dòng start của borrow reminder job; Ctrl+C → log stop.
