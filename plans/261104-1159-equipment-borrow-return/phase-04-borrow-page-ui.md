# Phase 04 — Trang công khai `/borrow`

## Context (đã kiểm trong code)
- [App.jsx](../../client/src/App.jsx): `<Router>` → `<Layout>` (sidebar + header) → `<ProtectedRoute>` → routes trong app. Trang mượn phải nằm **ngoài** `<Layout>`.
- [api.js](../../client/src/services/api.js): interceptor tự gắn Bearer khi `auth.currentUser`; 401 → log; **không** navigate.
- Pattern API: [client/src/api/events.js](../../client/src/api/events.js) wrap axios. Trang mượn không import `eventsApi` hay file nào chứa `collection(db, 'events')`.
- [Button](../../client/src/components/ui/Button.jsx), [Card](../../client/src/components/ui/Card.jsx), [Input](../../client/src/components/ui/Input.jsx) hiện có; dùng Tailwind như các component khác.
- Thông báo lỗi: `import { useToast } from '../Toast'`, `showError(message)`.

## Routes thêm vào App.jsx (ngoài `<Layout>`)
```jsx
<Route path="/borrow" element={<BorrowHome />} />
<Route path="/borrow/new" element={<BorrowForm />} />
<Route path="/borrow/verify" element={<BorrowVerify />} />
<Route path="/borrow/manage" element={<BorrowManage />} />
<Route path="/borrow/return" element={<BorrowReturn />} />
```

## `client/src/api/borrow.js` (mới) — wrap API phase 02
```js
const BASE = '/borrow';
export const borrowApi = {
  getResources: () => api.get(`${BASE}/resources`),
  create: (data) => api.post(`${BASE}/requests`, data),
  verify: (token) => api.post(`${BASE}/verify`, { token }),
  resendVerification: (id, token) => api.post(`${BASE}/requests/${id}/resend-verification`, {}, {
    headers: { 'X-Borrow-Token': token }
  }),
  getMy: (tokens) => api.get(`${BASE}/my`, {
    headers: tokens?.length ? { 'X-Borrow-Tokens': tokens.join(',') } : {}
  }),
  lookupOtp: (phone) => api.post(`${BASE}/lookup/otp`, { phone }),
  lookupVerify: (phone, code) => api.post(`${BASE}/lookup/verify`, { phone, code }),
  returnRequest: (id, token) => api.post(`${BASE}/requests/${id}/return`, {}, {
    headers: token ? { 'X-Borrow-Token': token } : {}
  })
};
```

## `client/src/lib/borrow-token-store.js` (mới)
```js
const KEY = 'borrowTokens';
const MAX = 10;
// load() → string[], save(tokens), add(token), removeByIds(requestIds)
```
Không lưu tên/email/SĐT. Chỉ mảng token. Thêm/xoá → persist vào `localStorage`.

## Components mới — `client/src/components/borrow/`

### `BorrowHome.jsx`
- Không có Layout (sidebar/header). Logo/tiêu đề riêng ở đầu trang.
- Gọi `borrowApi.getMy(tokens)` (từ localStorage + `auth.currentUser` nếu có).
- Phiếu đang mở (status ∉ `['returned', 'returned_with_issue', 'rejected', 'cancelled', 'expired']`) → hiện thẻ danh sách đầu trang (mỗi phiếu 1 thẻ `<BorrowRequestCard>`).
- Hai nút lớn: **Mượn thiết bị** (`navigate('/borrow/new')`), **Trả thiết bị** (`navigate('/borrow/return')`).

### `BorrowForm.jsx` (`/borrow/new`)
1. `borrowApi.getResources()` → danh sách thiết bị checkbox + input số lượng (giới hạn `≤ availableQty`, disabled khi = 0).
2. Có `auth.currentUser` → form chỉ có SĐT (tên + email đã biết từ profile, hiển thị xám). Không có → form đầy đủ tên, email, SĐT.
3. Chọn ngày trả (date input, min = ngày mai, max = 1 năm sau).
4. Ghi chú optional textarea ≤ 500 ký tự.
5. Submit → `borrowApi.create()`. Loading spinner khi gửi.
6. Lỗi (400/409/429/503) → hiện `error.response.data.error` + `details` nếu có (thiếu hàng thì liệt kê món). 502 → "Không gửi được email, kiểm tra địa chỉ hoặc thử lại".
7. Thành công: lưu `accessToken` vào store. Người có TK → toast "Đã tạo phiếu, chờ duyệt", `navigate('/borrow')` (thẻ phiếu hiện ở đầu trang). Khách → màn hình "Kiểm tra email để xác nhận" + nút "Gửi lại email", nút về `/borrow`.

### `BorrowVerify.jsx` (`/borrow/verify?token=xxx`)
- `useSearchParams().get('token')` → `borrowApi.verify(token)`.
- 200 → lưu token, "Đã xác nhận! Chờ admin duyệt", nút về Home.
- 404/410 → message tương ứng.

### `BorrowManage.jsx` (`/borrow/manage?t=xxx`)
- Lấy token từ query, lưu vào store, redirect `/borrow` (để phiếu tự hiện ra).

### `BorrowReturn.jsx` (`/borrow/return`)
- Gọi `borrowApi.getMy()` → lọc `status == 'handed_over'`.
- Không có → hiện form nhỏ **Tra phiếu bằng SĐT**: nhập SĐT → `lookupOtp()` → "Mã đã gửi tới email" → nhập mã → `lookupVerify()` → lưu token mới, reload phiếu.
- Có phiếu `handed_over` → danh sách thẻ, mỗi thẻ nút **Báo trả** → confirm modal → `borrowApi.returnRequest(id, token)`.
- Lỗi 409 → hiện message (status không đúng); thành công → toast "Đã báo trả, chờ kho kiểm".

### `BorrowRequestCard.jsx` (component dùng chung)
Props `request`, hiển thị status badge (màu theo status), danh sách thiết bị, hạn trả (đỏ nếu `isOverdue`), nút hành động theo status:
- `unverified` → "Gửi lại email" (`resendVerification`).
- `approved` → "Đã duyệt — tới kho nhận".
- `handed_over` → "Đang mượn".
- `return_pending` → "Chờ kho kiểm".
- `rejected` → hiện `rejectReason`.

## Styling
Mobile-first (80% người dùng quét bằng điện thoại). Các trang borrow: `max-w-2xl mx-auto p-4`, không sidebar. Nút to, dễ bấm. Badge status: màu xanh = chờ/đang làm, vàng = cảnh báo, xám = đóng, đỏ = lỗi/từ chối.

## Validation
- Tab ẩn danh: mở `/borrow` → Network không có request `/api/events`; không thấy Sidebar/Header app; chỉ request `/api/borrow/*`.
- Chỉ thiết bị `availableQty > 0` hiện ra; nhập số lượng vượt quá → nút Submit disabled.
- Điện thoại thật (Android Chrome + iOS Safari):
  - Khách: tạo phiếu → nhận email (spam folder) → bấm "Xác nhận" → /borrow/verify → toast xác nhận.
  - Quét lại QR `/borrow` → phiếu tự hiện ở đầu trang, không phải nhập gì.
  - Trình duyệt khác: bấm "Quản lý" trong email → phiếu hiện; hoặc /borrow/return → nhập SĐT → nhập OTP → phiếu hiện → "Báo trả".
- Người có TK: đăng nhập → /borrow/new → form chỉ có SĐT → tạo → về `/borrow`, thẻ phiếu `pending` hiện đầu trang.
- `cd client && npm run build` thành công.
