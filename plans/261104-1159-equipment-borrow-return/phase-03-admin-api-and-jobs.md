# Phase 03 — API admin/manager & job nhắc hạn

> Gồm cả phần sửa M1/M2 của phase 02 (§4) — hai lỗi này nằm trong `borrow-public-controller.js`, sửa cùng commit để không phải deploy hai lần.

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

## 4. Sửa lỗi còn lại của phase 02 (gộp vào commit này)

Hai lỗi dưới đây đã ghi ở [báo cáo review phase 02](../../plans/reports/review-261106-1005-phase-02-public-borrow-api.md). Sửa trong cùng commit phase 03, cùng file `server/controllers/borrow-public-controller.js`.

### 4.1 `verifyOtp` — đếm số lần nhập sai trong transaction (M1)

Hiện tại: đọc `attempts` → so mã → mới `update({ attempts: attempts + 1 })`, không transaction. N request gửi **đồng thời** cùng đọc `attempts = 0` → cả N lần đều được so mã, vượt giới hạn 5.

Thay phần đọc/so/tăng/xoá doc OTP bằng:

```js
const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(otpRef);
    const otp = snap.exists ? snap.data() : null;
    if (!otp) return 'invalid';
    if (!otp.expiresAt || new Date(otp.expiresAt).getTime() < Date.now()) return 'invalid';
    if ((otp.attempts || 0) >= LIMITS.OTP_MAX_ATTEMPTS) return 'invalid';
    if (!safeEqualHex(hash(String(code).trim()), otp.codeHash)) {
        tx.update(otpRef, { attempts: (otp.attempts || 0) + 1 });
        return 'invalid';
    }
    tx.delete(otpRef);
    return 'ok';
});
if (result !== 'ok') throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
```

Sau transaction mới truy vấn phiếu và sinh `accessToken` như hiện tại. Giữ nguyên nguyên tắc: mọi trường hợp sai trả **cùng một** message.

### 4.2 `requestOtp` — trả 200 trước khi gửi email (M2)

`await sendOtp(...)` chỉ chạy khi SĐT có phiếu → chênh thời gian phản hồi → đo được SĐT nào đang mượn thiết bị.

Trả response trước, gửi email sau (không `await`):

```js
res.status(200).json(standardResponse);
Promise.allSettled(distinctEmails.map((e) => borrowEmailService.sendOtp(e, code)))
    .then((rs) => rs.filter((r) => r.status === 'rejected')
        .forEach((r) => console.error('[BORROW] Error sending OTP email:', r.reason?.message)));
```

Test 10, 11 hiện có: cho test chờ flush microtask (`await new Promise((r) => setImmediate(r))`) trước khi kiểm `sendOtp` đã được gọi.

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

`server/tests/borrow-public.test.js` (thêm cho §4)
10. 6 lần nhập sai OTP gửi bằng `Promise.all` → doc `attempts === 5`; sau đó nhập **đúng** vẫn `400`.
11. Nhập đúng sau 4 lần sai → `200`, doc OTP bị xoá.
12. `requestOtp`: SĐT có phiếu và SĐT không có phiếu trả về cùng status/body, không chờ gửi email (response xong trước khi `sendOtp` resolve).

`server/tests/borrow-reminder-job.test.js`
1. `unverified` quá hạn → `expired`, `isOpen=false`.
2. `handed_over` quá hạn → `isOverdue=true`, `sendOverdue` 1 lần; chạy `run()` lần 2 ngay → không gửi thêm.
3. `handed_over` hạn trong 10h → `sendDueSoon` 1 lần; chạy lại → không gửi.
4. `return_pending` quá hạn → không gửi gì.
5. Bước 1 ném lỗi → bước 4 vẫn chạy.

## Validation
- `cd server && npx jest tests/borrow-admin.test.js tests/borrow-reminder-job.test.js tests/borrow-public.test.js` pass; toàn bộ `npx jest` không giảm so với 124 pass hiện tại.
- Khởi động server: log có dòng start của borrow reminder job; Ctrl+C → log stop.
- `grep -n "runTransaction" server/controllers/borrow-public-controller.js` → có (M1); `grep -n "await borrowEmailService.sendOtp" server/controllers/borrow-public-controller.js` → không có kết quả (M2).
