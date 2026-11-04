# Equipment Borrow/Return — Checklist triển khai

Đây là checklist cho người review (Claude Code) khi agent antigravity code xong từng phase. Dựa trên [acceptance criteria](plan.md#acceptance-criteria-reviewer-kiểm-từng-mục) và validation trong từng phase.

## Phase 00 — Backup & chuẩn bị
- [ ] File backup JSON nằm **ngoài** repo
- [ ] `package.json` có `express-rate-limit@^7`, `qrcode@^1`
- [ ] `firestoreMock.js` có `runTransaction`, `borrowRequestsCollection`, `borrowOtpsCollection`
- [ ] Baseline test ghi trong báo cáo; số test pass không giảm sau khi sửa mock

## Phase 01 — Data model, tồn kho, lỗ hổng
- [ ] `availableQty` đã được backfill (chạy script báo 0 updated lần 2)
- [ ] `PUT /api/resources` role `user` → 403
- [ ] `GET /api/settings` role `user` → 403
- [ ] `PUT /api/resources` giảm `quantity` dưới số mượn → 409
- [ ] Rules deploy xong: user thường đọc `borrow_requests` qua SDK → permission denied
- [ ] Test `borrow-stock.test.js`, `firestoreRules.test.js` pass; toàn bộ không giảm
- [ ] `ResourceManager.jsx` hiện "Còn x / tổng"

## Phase 02 — API công khai
- [ ] `.env` có `APP_PUBLIC_URL`; thiếu → server log warn
- [ ] `server/index.js` có `trust proxy` trên dòng đầu tiên sau `const app`
- [ ] Test `borrow-public.test.js` pass, đủ 15 case liệt kê trong phase 02; toàn bộ không giảm
- [ ] Curl sau nginx: 6 POST liên tiếp → lần 6 nhận 429; log server có IP client thật (không phải IP nginx)
- [ ] `grep -rn "eventsCollection\|eventController" server/{routes,controllers,services}/borrow-*.js` → không có kết quả
- [ ] Khách tạo phiếu → nhận email có 2 link (Xác nhận, Quản lý); link Xác nhận hết hạn sau 24h

## Phase 03 — Admin API & job
- [ ] Test `borrow-admin.test.js` (9+ cases), `borrow-reminder-job.test.js` (5+ cases) pass
- [ ] Server khởi động → log có "borrow reminder job"; Ctrl+C → log stop
- [ ] Manager gọi `POST /api/borrow/admin/requests/:id/approve` → 200
- [ ] User role `user` gọi → 403
- [ ] confirm-return thiếu món → `returned_with_issue` + kho chỉ cộng số nhận

## Phase 04 — Trang `/borrow`
- [ ] Tab ẩn danh mở `/borrow` → không có request `/api/events*`
- [ ] Không có sidebar/header app; chỉ request `/api/borrow/*`
- [ ] Chỉ thiết bị `availableQty > 0` hiện; nhập vượt → Submit disabled
- [ ] **Điện thoại thật** (Android + iOS):
  - Khách: tạo phiếu → email → xác nhận → toast; quét lại QR → phiếu tự hiện
  - Trình duyệt khác: nhập SĐT → OTP → phiếu hiện
- [ ] Người có TK: form chỉ có SĐT → submit → về `/` toast
- [ ] `cd client && npm run build` thành công

## Phase 05 — Admin UI
- [ ] Manager đăng nhập → thấy "Equipment Loans" sidebar → `/equipment-loans` → danh sách
- [ ] User role `user` không thấy "Equipment Loans"; vào URL thủ công → Unauthorized
- [ ] Tab **Chờ duyệt** badge = số phiếu `pending` đúng
- [ ] Duyệt thiếu hàng → modal hiện món thiếu, phiếu vẫn `pending`
- [ ] Chốt trả đủ → `returned`; thiếu 1 món → `returned_with_issue`, kho cộng đúng số
- [ ] `/equipment-loans/qr` → QR hiển thị; quét điện thoại → mở `/borrow`
- [ ] Có thông báo `borrowRequestId` → click → mở `/equipment-loans`

## Cuối cùng
- [ ] `cd server && npx jest` toàn bộ: số pass ≥ baseline phase 00
- [ ] `cd client && npm run build` không lỗi
- [ ] Review code dùng pattern đúng: HttpError cho lỗi nghiệp vụ; `transition()` cho mọi đổi status; không log token/OTP/SĐT/email đủ
- [ ] Không có `eventsCollection`, `eventController` trong code mượn trả
- [ ] Người dùng chưa có tài khoản mượn → trả được mà không thấy bất kỳ sự kiện nào
