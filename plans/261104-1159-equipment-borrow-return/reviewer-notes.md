# Reviewer notes — phát hiện khi khảo sát code

Ghi chú cho reviewer.

## 1. ✅ `/api/settings` ghi được mà không cần đăng nhập — đã đưa vào phase 01
- [routes/settings.js](../../server/routes/settings.js) không có `verifyToken`; `POST/PUT /api/settings` → `updateSettings` merge thẳng `req.body` rồi ghi file.
- `GET` đã che mật khẩu SMTP (`'********'`) — phần đọc ổn.
- **Liên quan trực tiếp tới tính năng mượn trả:** ai cũng có thể (a) tắt `channels.email` → mọi khách nhận `503`, hoặc (b) đổi `smtp.host/user/pass` sang server của họ → đọc được mọi email OTP và link quản lý phiếu → báo trả giùm hoặc xem SĐT người khác.
- Sửa: `router.use(verifyToken, requireRole(['admin']))` ở đầu file; kiểm `Settings.jsx`/`NotificationSettings.jsx`/`EmailTemplateSettings.jsx` vẫn gửi Bearer (đi qua `api.js` → có).
- **Đã thêm vào phase 01 §10.**

## 2. Test mock thiếu tính năng (đã đưa vào phase 00)
- Không có `runTransaction`.
- `ref.update` không áp dụng `FieldValue.increment` (chỉ `set` có).
- `where('borrower.phone', …)` không hoạt động vì mock đọc `data[field]` phẳng.

## 3. Email hiện không có link về app
Không tìm thấy biến URL công khai nào trong server → thêm `APP_PUBLIC_URL` (phase 02, phase 05).

## 4. `notificationService.getAdminUids()` chỉ lấy role `admin`
Manager không nhận thông báo nếu dùng hàm này → phase 02 thêm `getUidsByRoles(['admin','manager'])`, không sửa hàm cũ.

## 5. `users` không có `phone`
Phase 02 lưu `phone` vào `users/{uid}` khi người có TK tạo phiếu.

## 6. `emailService.send()` im lặng khi kênh email tắt
Trả `undefined`, không ném lỗi → code mượn trả phải tự kiểm `channels.email` trước (phase 02 `assertEmailEnabled`).

## 7. `npm test` của server là placeholder
`"test": "echo \"Error: no test specified\" && exit 1"`. Chạy bằng `npx jest`. Không sửa trong phạm vi này.

## 8. ✅ `/api/backup` thiếu kiểm tra quyền — đã đưa vào phase 01 §10
- [routes/backup.js](../../server/routes/backup.js) chỉ có `verifyToken`, không có `requireRole(['admin'])`. Mọi user đã đăng nhập đều có thể tải toàn bộ backup (events, resources, audit_logs) hoặc validate + restore để ghi đè dữ liệu.
- Sửa: `router.use(verifyToken, requireRole(['admin']))` ở đầu file `server/routes/backup.js`.
- Client: `DataRetention.jsx` gọi qua `api.js` nên đã tự động gắn Bearer token.
- **Đã thêm vào phase 01 §10 và checklist.**

## Điểm review trọng tâm theo phase
| Phase | Soi kỹ |
|---|---|
| 01 | Mọi đọc trong transaction đứng **trước** mọi ghi; `updateResource` không còn ghi `req.body` thô; test rules cũ được nới đúng ý |
| 02 | Response `lookup/otp` giống hệt nhau khi SĐT có/không có phiếu; không log token/OTP; `toPublicView` không lộ hash/history/uid; `trust proxy` = `1` (không phải `true`) |
| 03 | Không có chỗ nào đổi `status` ngoài `transition()`; job ghi cờ nhắc trước khi gửi |
| 04 | Không import gì liên quan events; `/borrow/*` nằm ngoài `<Layout>` |
| 05 | `requireRole` có trên mọi route `/admin/*`, kể cả `qr-station` |
