# Phase 05 — Admin UI: trang `/equipment-loans`

## Context
- `/settings/*` routes nằm trong `<ProtectedRoute allowedRoles={['admin']}>` ([App.jsx:62](../../client/src/App.jsx#L62)).
- [Sidebar.jsx:104–108](../../client/src/components/Sidebar.jsx#L104-L108): chỉ admin thấy System section.
- Pattern setting page: [ResourceManager.jsx](../../client/src/components/settings/ResourceManager.jsx) — danh sách + form modal + CRUD gọi API.
- Thông báo mới: [NotificationDropdown.jsx:30](../../client/src/components/ui/NotificationDropdown.jsx#L30) có `data.eventId` → navigate `/`. Phải handle `data.borrowRequestId`.

## 1. API client — `client/src/api/borrow-admin.js` (mới)
```js
const BASE = '/borrow/admin';
export const borrowAdminApi = {
  list: (params) => api.get(`${BASE}/requests`, { params }), // status, overdue, limit, cursor
  get: (id) => api.get(`${BASE}/requests/${id}`),
  counts: () => api.get(`${BASE}/counts`),
  approve: (id) => api.post(`${BASE}/requests/${id}/approve`),
  reject: (id, reason) => api.post(`${BASE}/requests/${id}/reject`, { reason }),
  handover: (id) => api.post(`${BASE}/requests/${id}/handover`),
  cancel: (id, reason) => api.post(`${BASE}/requests/${id}/cancel`, { reason }),
  confirmReturn: (id, items, returnNote) => api.post(`${BASE}/requests/${id}/confirm-return`, { items, returnNote }),
  qrStation: () => api.get(`${BASE}/qr-station`)
};
```

## 2. Route + Sidebar
- `App.jsx`: trong `<ProtectedRoute allowedRoles={['admin', 'manager']}>` thêm:
  ```jsx
  <Route path="/equipment-loans" element={<EquipmentLoans />} />
  ```
- `Sidebar.jsx`: trong `colorMap` thêm `amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500', activeBg: 'bg-amber-500' }` nếu chưa có; thêm vào **Management section** (trước Departments):
  ```jsx
  { icon: Package, label: 'Equipment Loans', to: '/equipment-loans', color: 'amber' }
  ```
  Import `Package` từ `lucide-react`.

## 3. `client/src/components/settings/EquipmentLoans.jsx` (mới)
- Gọi `borrowAdminApi.counts()` → badge số `pending`, `approved`, `return_pending` ở tab header.
- Tabs: **Chờ duyệt** (pending), **Đã duyệt** (approved), **Đang mượn** (handed_over), **Chờ kiểm** (return_pending), **Quá hạn** (query `overdue=true`), **Tất cả** (không filter status, không `unverified`/`expired`).
- Mỗi tab: `borrowAdminApi.list({ status, overdue, limit: 50 })` → danh sách thẻ `<AdminBorrowCard>`.
- Click thẻ → modal chi tiết `<BorrowDetailModal>`.

### `<AdminBorrowCard>` (component con)
Hiển thị `borrower.name`, `borrower.email` (không che), SĐT, danh sách thiết bị, hạn trả, trạng thái, thời gian tạo, nút hành động theo status:
- `pending` → **Duyệt** (xanh), **Từ chối** (đỏ).
- `approved` → **Đã giao** (xanh), **Huỷ** (đỏ).
- `return_pending` hoặc `handed_over` → **Chốt trả** (xanh).

### `<BorrowDetailModal>` (component con)
- Đầy đủ thông tin phiếu + `history` timeline.
- **Duyệt**: confirm → gọi `approve()`; 409 thiếu hàng → hiện danh sách món thiếu từ `error.response.data.details.shortages`, không close modal.
- **Từ chối**: textarea lý do (3–500 ký tự) → gọi `reject()`.
- **Đã giao**: confirm → `handover()`.
- **Huỷ**: textarea lý do → `cancel()`.
- **Chốt trả**: form nhập số lượng thực nhận từng món (mặc định = `qty`), textarea `returnNote` optional → `confirmReturn(items, returnNote)`.
- Thành công → toast, reload danh sách, đóng modal.

## 4. Thông báo click
Sửa [NotificationDropdown.jsx](../../client/src/components/ui/NotificationDropdown.jsx) trong `handleItemClick`:
```jsx
const handleItemClick = async (notif) => {
    await markAsRead(notif.id);
    setIsOpen(false);
    if (notif.data?.eventId) navigate(`/?eventId=${notif.data.eventId}`);
    if (notif.data?.borrowRequestId) navigate(`/equipment-loans`);
};
```

## 5. Trang in QR — `client/src/components/settings/BorrowQr.jsx`
- Route `/equipment-loans/qr` (trong cùng `ProtectedRoute` admin/manager).
- Endpoint mới trong `routes/borrow.js`, cùng nhóm admin (`verifyToken, requireRole(['admin','manager'])`):
  ```js
  // GET /api/borrow/admin/qr-station — PNG data URL of the station QR (encodes APP_PUBLIC_URL/borrow)
  router.get('/admin/qr-station', verifyToken, canManage, async (req, res, next) => {
      try {
          if (!process.env.APP_PUBLIC_URL) throw new HttpError(503, 'Chưa cấu hình APP_PUBLIC_URL');
          const url = `${process.env.APP_PUBLIC_URL}/borrow`;
          const qr = await QRCode.toDataURL(url, { width: 512, margin: 2 });
          res.json({ url, qr });
      } catch (err) { next(err); }
  });
  ```
  Không dùng `window.location.origin` — QR phải trỏ đúng domain công khai dù admin mở trang từ localhost.
- Trang hiển thị ảnh QR, URL dạng chữ bên dưới, dòng "Quét để mượn / trả thiết bị".
- Nút **In** → `window.print()`; `@media print` ẩn mọi thứ trừ khối QR.

## Validation
- Manager đăng nhập → thấy "Equipment Loans" trong sidebar → mở `/equipment-loans` → danh sách phiếu.
- User role `user` đăng nhập → không thấy "Equipment Loans"; vào `/equipment-loans` thủ công → Unauthorized.
- Tab **Chờ duyệt** có badge số (đúng số `counts.pending`).
- Phiếu `pending`: bấm Duyệt → 409 thiếu hàng → modal hiện món thiếu, phiếu vẫn `pending`; Từ chối → nhập lý do → phiếu `rejected`.
- Phiếu `approved`: bấm Đã giao → `handed_over`; Huỷ → nhập lý do → `cancelled`, kho cộng lại.
- Phiếu `return_pending`: bấm Chốt trả → form nhập số thực nhận (mặc định đủ) → submit đủ → `returned`; giảm 1 món → `returned_with_issue`, kho chỉ cộng số thực nhận.
- Mở `/equipment-loans/qr` → QR hiển thị; quét bằng điện thoại → mở `/borrow`.
- Có thông báo mới (`borrowRequestId`) → bấm → mở `/equipment-loans`.
