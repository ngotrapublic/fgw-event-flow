# Phase 02 — API công khai `/api/borrow`

## Context (đã kiểm trong code)

- Đây là route **công khai đầu tiên** có ghi dữ liệu. Không import gì từ `eventController` hay `eventsCollection`.
- Email: `emailService.send(recipients[], subject, html)` ([emailService.js:47](../../server/services/emailService.js#L47)). Khi kênh email tắt trong Settings, hàm **return `undefined` không ném lỗi** → phải tự kiểm `getSettingsInternal().channels?.email` trước.
- Email hiện không chứa link nào về app → cần biến môi trường mới `APP_PUBLIC_URL`.
- Server sau nginx → bắt buộc `trust proxy` trước khi dùng rate-limit.

## 1. Cấu hình

- `.env.example`: thêm
  ```
  # --- Public URL used in borrow emails (no trailing slash) ---
  APP_PUBLIC_URL=https://event.greenwichvietnam.edu.vn
  ```
- `server/index.js`: ngay sau `const app = express();` thêm `app.set('trust proxy', 1); // behind nginx — req.ip = real client IP`.
- Server khởi động thiếu `APP_PUBLIC_URL` → `console.warn` một lần, các route borrow gửi email trả `503 'Chưa cấu hình APP_PUBLIC_URL'`.
- Mount `app.use('/api/borrow', require('./routes/borrow'));` cùng nhóm với các `app.use('/api/...')` hiện có (trước SPA fallback).

## 2. `server/middleware/optional-auth.js` (mới)

- Không có header `Authorization` → `req.user = null`, `next()`.
- Có Bearer → `admin.auth().verifyIdToken`; thành công → `req.user = decoded`, lấy `role/name/email/department` từ `users/{uid}` gắn vào `req.user.profile`.
- Bearer sai/hết hạn → `401` (KHÔNG lặng lẽ coi là khách).

## 3. `server/middleware/rate-limiters.js` (mới) — dùng `express-rate-limit` v7

```js
const make = (windowMs, limit, keyGenerator) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    message: { error: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" },
  });
module.exports = {
  borrowRead: make(15 * 60e3, 120),
  createLimiter: make(60 * 60e3, 5), // POST /requests (khách); người có TK bỏ qua — xem §5
  verifyLimiter: make(15 * 60e3, 20),
  otpIpLimiter: make(60 * 60e3, 5),
  otpVerifyLimiter: make(15 * 60e3, 20),
  resendLimiter: make(60 * 60e3, 3),
  returnLimiter: make(15 * 60e3, 20),
};
```

Giới hạn theo SĐT cho OTP nằm trong `borrow_otps` (§7), không ở middleware.

## 4. `server/services/borrow-token-service.js` (mới)

```js
const newToken = () => crypto.randomBytes(32).toString("base64url");
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const newOtp = () => String(crypto.randomInt(0, 1e6)).padStart(6, "0");
const safeEqualHex = (a, b) =>
  a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
```

## 5. `server/services/borrow-validation.js` (mới) — validate & chuẩn hoá

| Field     | Quy tắc                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `name`    | trim, 2–80 ký tự (chỉ bắt buộc với khách)                                                                                            |
| `email`   | trim, lowercase, `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`, ≤ 254 (chỉ khách)                                                                |
| `phone`   | bỏ khoảng trắng/dấu chấm/gạch; `+84` hoặc `84` đầu → `0`; phải khớp `/^0\d{9}$/`                                                     |
| `items`   | mảng 1–`MAX_ITEMS`; mỗi item `{resourceId: string, qty: int 1–MAX_QTY}`                                                              |
| `dueDate` | chuỗi `YYYY-MM-DD`; ≥ ngày mai theo giờ VN; ≤ hôm nay + `MAX_DUE_DAYS`. Lưu `dueAt` = `YYYY-MM-DDT16:59:59.000Z` (= 23:59:59 giờ VN) |
| `note`    | optional, trim, ≤ 500                                                                                                                |

Lỗi → `HttpError(400, message, { field })`. Message tiếng Việt, rõ field nào sai.

## 6. `server/services/borrow-email-service.js` (mới)

- `escapeHtml(s)` cho mọi giá trị người dùng nhập.
- `assertEmailEnabled()` → `getSettingsInternal().channels?.email` false → `HttpError(503, 'Hệ thống email đang tắt, vui lòng liên hệ quản trị viên')`.
- Templates (HTML đơn giản, inline style, tiếng Việt):
  | Hàm | Gửi khi | Nội dung chính |
  |---|---|---|
  | `sendVerify(req, verifyToken, accessToken)` | khách tạo phiếu | danh sách thiết bị, hạn trả, nút **Xác nhận email** → `${APP_PUBLIC_URL}/borrow/verify?token=…`, nút **Quản lý / Trả thiết bị** → `${APP_PUBLIC_URL}/borrow/manage?t=…`. Ghi rõ link xác nhận hết hạn sau 24h |
  | `sendCreatedForAccount(req, accessToken)` | người có TK tạo phiếu | xác nhận đã nhận phiếu + link quản lý |
  | `sendApproved(req)` | duyệt | "Đã duyệt — vui lòng tới kho nhận thiết bị" |
  | `sendRejected(req)` | từ chối | lý do |
  | `sendCancelled(req)` | huỷ | lý do |
  | `sendReturned(req)` | chốt trả | từng món: mượn / nhận lại; nếu có vấn đề thì ghi `returnNote` |
  | `sendOtp(email, code)` | tra phiếu | mã 6 số, hết hạn 10 phút, "nếu không phải bạn, bỏ qua email này" |
  | `sendDueSoon(req)`, `sendOverdue(req)` | job phase 03 | hạn trả + link quản lý **không có token** (người dùng dùng token đã lưu hoặc OTP) |
- Link chứa token **chỉ** có trong `sendVerify` và `sendCreatedForAccount` (gửi 1 lần lúc tạo, và khi resend).

## 7. Endpoints — `server/routes/borrow.js` + `server/controllers/borrow-public-controller.js`

Response phiếu cho người mượn dùng chung serializer `toPublicView(req)`:

```js
{ id, status, isOverdue, borrower: { name, email: maskEmail(email), phone: maskPhone(phone) },
  items: [{ resourceId, label, qty, receivedQty }], dueAt, note, rejectReason, returnNote, createdAt, updatedAt }
```

**Không bao giờ** trả `history`, `uid`, bất kỳ `*Hash`, `verifyExpiresAt`. `maskEmail('nguyen@gmail.com') = 'ng***@gmail.com'`, `maskPhone('0912345678') = '091****678'`.

### `GET /api/borrow/resources` · `borrowRead`

→ `[{ id, label, category, icon, availableQty }]`, chỉ `availableQty > 0` (doc thiếu field dùng `quantity`), sort theo `category` rồi `label`. **Không** trả `quantity` tổng.

### `POST /api/borrow/requests` · `optionalAuth`, `createLimiter` (skip khi `req.user`)

Body: `{ name?, email?, phone, items, dueDate, note? }`

1. Validate (§5). Kiểm từng `resourceId` tồn tại và `qty ≤ availableQty` hiện tại → thiếu thì `409` + `shortages` (kiểm sơ bộ, kho **chưa** bị trừ).
2. Người có TK: `borrower = { uid, name: profile.name || email, email: user.email, phone }`, `borrowerType='account'`, `status='pending'`. Lưu `phone` vào `users/{uid}.phone` nếu khác.
3. Khách: `assertEmailEnabled()`. Đếm phiếu `isOpen==true` theo email **và** theo SĐT; ≥ `MAX_OPEN_PER_GUEST` → `429 'Bạn đang có quá nhiều phiếu chưa hoàn tất'`. `status='unverified'`, sinh `verifyToken`, `verifyExpiresAt = now + VERIFY_TTL_MS`.
4. Sinh `accessToken`; lưu hash. Ghi doc với `history: [{ status, at, byUid, byEmail, note: 'created' }]`.
5. Gửi email (§6). **Gửi lỗi**: khách → xoá doc vừa tạo, trả `502 'Không gửi được email, vui lòng kiểm tra địa chỉ hoặc thử lại'`; người có TK → giữ phiếu, trả kèm `emailSent:false`.
6. Người có TK: thông báo admin/manager (§8).
7. → `201 { request: toPublicView(doc), accessToken }`

### `POST /api/borrow/verify` · `verifyLimiter`

Body `{ token }`. Tìm theo `verifyTokenHash`. Không thấy → `404 'Link không hợp lệ'`. Đã `pending` trở đi → `200` idempotent (trả phiếu). Quá hạn → `410 'Link đã hết hạn, vui lòng tạo phiếu mới'` (job phase 03 sẽ đặt `expired`). Hợp lệ → `transition(→pending)`, gán `verifyTokenHash: null` (không dùng `FieldValue.delete()` vì schema quy định `string | null` và tránh lưu object `{__delete: true}` trong Firestore mock), thông báo admin/manager. → `200 { request }`.

### `POST /api/borrow/requests/:id/resend-verification` · `resendLimiter`

Kiểm tra `doc.exists` trước (không tồn tại → `404`, không dựa vào `update` ném lỗi). Header `X-Borrow-Token` khớp phiếu, status `unverified` → sinh `verifyToken` **mới** + gia hạn 24h, gửi lại `sendVerify`. Khác → `404`.

### `GET /api/borrow/my` · `optionalAuth`, `borrowRead`

- Header `X-Borrow-Tokens: tok1,tok2,…` (tối đa `MAX_CLIENT_TOKENS`, thừa → bỏ).
- Hash từng token → query `accessTokenHash in [...]` (≤ 10 → 1 query `in`).
- Nếu `req.user`: thêm phiếu `borrower.uid == uid` (50 phiếu gần nhất).
- Gộp, bỏ trùng theo id. → `200 { requests: [toPublicView…], invalidTokens: [...] }` — `invalidTokens` là token không khớp phiếu nào để client tự xoá.

### `POST /api/borrow/lookup/otp` · `otpIpLimiter`

Body `{ phone }`.

1. Validate phone. `assertEmailEnabled()`.
2. Tìm phiếu `borrower.phone == phone && isOpen == true`.
3. **Response luôn giống nhau**: `200 { message: 'Nếu số điện thoại có phiếu đang mở, mã xác thực đã được gửi tới email đã đăng ký' }`. Không trả email đã che (tránh xác nhận SĐT có tồn tại).
4. Chỉ khi có phiếu: doc `borrow_otps/{sha256(phone)}`:
   - `sentAt` < 60s trước → không gửi (vẫn trả 200 như trên).
   - Trong cửa sổ 1h đã gửi ≥ 3 lần → không gửi.
   - Ngược lại sinh OTP, lưu `codeHash`, `expiresAt`, `attempts=0`, gửi `sendOtp` tới **các email riêng biệt** của các phiếu đó.
5. Lỗi gửi email → log, vẫn trả 200 (không lộ thông tin).

### `POST /api/borrow/lookup/verify` · `otpVerifyLimiter`

Body `{ phone, code }`.

- Không có OTP doc / hết hạn / `attempts ≥ 5` → `400 'Mã không đúng hoặc đã hết hạn'` (cùng một message cho mọi trường hợp).
- Sai → `attempts++`, cùng message 400.
- Đúng → **xoá** OTP doc. Với mỗi phiếu mở của SĐT: sinh `accessToken` mới, ghi đè `accessTokenHash` (token cũ trên máy khác mất hiệu lực — chấp nhận). → `200 { requests: [...], accessTokens: [...] }`.

### `POST /api/borrow/requests/:id/return` · `optionalAuth`, `returnLimiter`

- Xác thực quyền: header `X-Borrow-Token` hash khớp `accessTokenHash` của phiếu **hoặc** `req.user.uid == borrower.uid`. Không khớp → `404` (không phân biệt "không có" và "không có quyền").
- `transition(id, 'return_pending', { expectFrom: ['handed_over'] })`. Status khác → `409` với message theo status: `return_pending` → 'Bạn đã báo trả, đang chờ kho kiểm'; `approved` → 'Bạn chưa nhận thiết bị'; …
- Thông báo admin/manager (§8). → `200 { request }`.

## 8. Thông báo admin + manager

[notificationService.getAdminUids()](../../server/services/notificationService.js) chỉ lấy `role == 'admin'`. Thêm method mới (không sửa hàm cũ, đang được nơi khác dùng):

```js
async getUidsByRoles(roles) { /* where('role', 'in', roles) */ }
```

Gọi `notificationService.create({ recipients: uids, type: 'info', title, message, data: { borrowRequestId: id }, sender: 'Mượn trả thiết bị' })`.
| Sự kiện | title |
|---|---|
| phiếu → `pending` | `Yêu cầu mượn thiết bị mới` — message: `{name}: {n} món, trả {dd/MM}` |
| phiếu → `return_pending` | `Có người báo trả thiết bị` |
Lỗi thông báo → log, không làm fail request.

## Tests — `server/tests/borrow-public.test.js`

Gọi controller trực tiếp như `round3Bugs.test.js`; mock `borrow-email-service` (jest.fn), `notificationService`, `settingsController.getSettingsInternal` (`channels.email: true` mặc định).

1. Khách tạo phiếu hợp lệ → `unverified`, có `accessToken`, `sendVerify` được gọi 1 lần, doc không chứa token gốc.
2. SĐT `+84 912 345 678` → lưu `0912345678`.
3. `dueDate` hôm nay → 400 field `dueDate`.
4. qty > availableQty → 409 `shortages`.
5. Email channel tắt → 503, không có doc.
6. `sendVerify` ném lỗi → 502, không có doc.
7. Khách có 3 phiếu mở → phiếu thứ 4 → 429.
8. verify token đúng → `pending`, thông báo được gọi; gọi lại → 200 idempotent; token sai → 404; quá hạn → 410.
9. `my` với 1 token đúng + 1 token rác → 1 phiếu, `invalidTokens` chứa token rác. Response không có `history`/`*Hash`/`uid`.
10. lookup/otp: SĐT không có phiếu và SĐT có phiếu → **cùng** status + body; chỉ trường hợp sau gọi `sendOtp`.
11. lookup/otp gọi 2 lần trong 60s → `sendOtp` chỉ 1 lần.
12. lookup/verify sai 5 lần → lần 6 dù đúng mã vẫn 400.
13. lookup/verify đúng → token mới mở được phiếu; token cũ → `my` trả trong `invalidTokens`.
14. return với token đúng khi `handed_over` → `return_pending`; khi `approved` → 409; token phiếu khác → 404.
15. Người có TK (`req.user` có uid) tạo phiếu → `pending`, borrower lấy từ profile, `users/{uid}.phone` được cập nhật.

## Validation

- `cd server && npx jest tests/borrow-public.test.js` pass; toàn bộ `npx jest` không giảm.
- Thủ công qua curl sau nginx: gửi 6 `POST /api/borrow/requests` liên tiếp → lần 6 nhận 429; log server hiện IP thật.
- `grep -rn "eventsCollection\|eventController" server/routes/borrow.js server/controllers/borrow-*.js server/services/borrow-*.js` → không có kết quả.
