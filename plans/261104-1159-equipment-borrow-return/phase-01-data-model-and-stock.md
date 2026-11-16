# Phase 01 — Data model, tồn kho, chặn lỗ hổng resources, settings và backup

## Context (đã kiểm trong code)

- `resources` chỉ có `quantity` ([resourceController.js](../../server/controllers/resourceController.js)).
- `PUT/POST/DELETE /api/resources` chỉ có `verifyToken` → **user thường sửa/xoá được thiết bị** ([routes/resources.js](../../server/routes/resources.js)). `updateResource` ghi thẳng `req.body`.
- `GET/POST /api/backup` chỉ có `verifyToken`, thiếu `requireRole` ([routes/backup.js](../../server/routes/backup.js)) → **user thường tải hoặc ghi đè toàn bộ dữ liệu hệ thống**.
- [firestore.rules](../../firestore.rules) có catch-all `allow read: if request.auth != null` → collection mới mặc định ai đăng nhập cũng đọc được.
- `ResourceManager.jsx` (admin) gọi `GET/POST/PUT/DELETE /resources` — phải tiếp tục chạy.

## 1. `server/utils/http-error.js` (mới)

```js
class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details; // optional, e.g. { shortages: [...] }
  }
}
module.exports = HttpError;
```

Sửa [errorHandler.js](../../server/middleware/errorHandler.js): thêm `...(err.details && { details: err.details })` vào JSON response. Không đổi gì khác.

## 2. `server/config/firebase.js`

Thêm và export:

```js
const borrowRequestsCollection = db.collection("borrow_requests");
const borrowOtpsCollection = db.collection("borrow_otps");
```

## 3. Schema `borrow_requests`

```js
{
  borrower: {
    uid: string | null,        // null = khách
    name: string,              // 2–80 ký tự
    email: string,             // lowercase
    phone: string              // chuẩn hoá '0xxxxxxxxx'
  },
  borrowerType: 'account' | 'guest',
  items: [{
    resourceId: string,
    label: string,             // snapshot tên tại thời điểm mượn
    qty: number,               // nguyên 1–999
    receivedQty: number | null // ghi khi chốt trả
  }],
  status: 'unverified'|'pending'|'approved'|'rejected'|'cancelled'|'handed_over'
        |'return_pending'|'returned'|'returned_with_issue'|'expired',
  isOpen: boolean,             // true khi status thuộc OPEN_STATUSES — dùng cho query
  dueAt: string,               // ISO, cuối ngày người mượn chọn (23:59:59 giờ VN → UTC)
  note: string,                // ghi chú người mượn, ≤ 500 ký tự, có thể rỗng
  accessTokenHash: string,     // sha256 hex
  verifyTokenHash: string|null,
  verifiedTokenHash: string|null, // lưu hash token đã xác minh để hỗ trợ retry idempotent
  verifyExpiresAt: string|null,
  isOverdue: boolean,
  dueSoonRemindedAt: string|null,
  overdueRemindedAt: string|null,
  approvedAt: string|null,     // set khi pending→approved, dùng cho job nhắc "chưa tới lấy"
  approvedStaleNotifiedAt: string|null,
  rejectReason: string|null,
  cancelReason: string|null,   // lý do admin huỷ phiếu
  returnNote: string|null,     // ghi chú tình trạng khi chốt trả
  history: [{ status, at, byUid, byEmail, note }],
  createdAt: string, updatedAt: string
}
```

## 4. Schema `borrow_otps` (doc id = sha256(phone))

```js
// borrow_otps/{sha256(phone)}
const otpDoc = { codeHash, expiresAt, attempts, sentAt, windowStart, sendCount };
```

## 5. `server/services/borrow-constants.js` (mới)

```js
const OPEN_STATUSES = [
  "unverified",
  "pending",
  "approved",
  "handed_over",
  "return_pending",
];

// from → allowed targets
const TRANSITIONS = {
  unverified: ["pending", "expired"],
  pending: ["approved", "rejected"],
  approved: ["handed_over", "cancelled"],
  handed_over: ["return_pending", "returned", "returned_with_issue"],
  return_pending: ["returned", "returned_with_issue"],
};

const LIMITS = {
  MAX_ITEMS: 20,
  MAX_QTY: 999,
  MAX_DUE_DAYS: 365,
  MAX_OPEN_PER_GUEST: 3, // theo email và theo SĐT
  VERIFY_TTL_MS: 24 * 3600e3,
  OTP_TTL_MS: 10 * 60e3,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_MS: 60e3,
  MAX_CLIENT_TOKENS: 10,
  APPROVED_STALE_MS: 3 * 24 * 3600e3,
  DUE_SOON_MS: 24 * 3600e3,
};
module.exports = { OPEN_STATUSES, TRANSITIONS, LIMITS };
```

## 6. `server/services/borrow-stock-service.js` (mới)

Hàm nhận `tx` (Firestore transaction) để chạy **chung transaction** với việc đổi status:

```js
// Reads every resource first (Firestore requires all reads before writes),
// then throws 409 listing every shortage, or decrements availableQty.
async function reserveInTx(tx, items) { ... }
// Adds back `pick(item)` units per resource; ignores resources that were deleted.
async function restockInTx(tx, items, pick = (i) => i.qty) { ... }
```

- Gộp `items` cùng `resourceId` trước khi kiểm.
- Thiếu hàng → `throw new HttpError(409, 'Không đủ thiết bị trong kho', { shortages: [{ resourceId, label, requested, available }] })`.
- Resource không tồn tại khi reserve → coi như `available: 0`.
- Dùng `admin.firestore.FieldValue.increment()` cho ghi.

## 7. `server/services/borrow-transition-service.js` (mới)

```js
/**
 * Single entry point for every status change.
 * Runs in a transaction: re-reads the request, checks TRANSITIONS, runs the
 * stock side-effect for that edge, writes status/isOpen/history/updatedAt.
 */
async function transition(requestId, toStatus, { actor, note, patch = {}, expectFrom }) { ... }
```

- `actor` = `{ uid, email }` hoặc `{ uid: null, email: borrowerEmail }` cho khách.
- `expectFrom` (optional, mảng) — nếu status hiện tại không thuộc → `409 'Phiếu đã được xử lý'`.
- Cạnh không có trong `TRANSITIONS` → `409`.
- Side effect theo cạnh:
  - `pending→approved`: `reserveInTx(items)`
  - `approved→cancelled`: `restockInTx(items, i => i.qty)`
  - `* → returned | returned_with_issue`: `restockInTx(patch.items, i => i.receivedQty)`
- Ghi `isOpen = OPEN_STATUSES.includes(toStatus)`.
- Trả về phiếu sau cập nhật.
- Sau transaction thành công gọi `logAction({ actor: actor.email, role: actor.role || 'guest', action: 'UPDATE', target: \`BorrowRequest: ${id}\`, details: { from, to } })`. Lỗi log **không** làm fail request (try/catch, `console.error`).

## 8. Sửa `resourceController.js`

- `createResource`: thêm `availableQty: parseInt(quantity)`.
- `getAllResources`: khi seed `INITIAL_RESOURCES`, thêm `availableQty = quantity`. Với doc cũ thiếu field, **trả về** `availableQty ?? quantity` (không ghi).
- `updateResource`: chạy trong transaction:
  - `delete updates.availableQty` (không cho client set trực tiếp).
  - Nếu có `quantity`: `delta = newQty - (old.quantity)`; `newAvail = (old.availableQty ?? old.quantity) + delta`; `newAvail < 0` → `409 'Số lượng mới nhỏ hơn số đang cho mượn'`. Ghi cả `quantity`, `availableQty`.
- `deleteResource`: nếu `(availableQty ?? quantity) < quantity` → `409 'Thiết bị đang có người mượn'`.

## 9. Sửa `routes/resources.js`

```js
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const canManage = requireRole(['admin', 'manager']);
router.get('/', verifyToken, ...);                  // giữ — EventForm cần
router.post('/', verifyToken, canManage, ...);
router.put('/', verifyToken, canManage, ...);  router.put('/:id', verifyToken, canManage, ...);
router.delete('/', verifyToken, canManage, ...); router.delete('/:id', verifyToken, canManage, ...);
```

Xoá các comment TODO cũ đã lỗi thời trong file này.

## 10. Chặn lỗ hổng `/api/settings` và `/api/backup`

1. **`/api/settings`**: [server/routes/settings.js](../../server/routes/settings.js) hiện mount trực tiếp không auth → ai cũng ghi được `POST/PUT /api/settings` → tắt email hoặc đổi SMTP → đọc được OTP của tính năng mượn trả.
   Sửa đầu file:

```js
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
router.use(verifyToken, requireRole(["admin"]));
```

Kiểm client: [Settings.jsx](../../client/src/components/Settings.jsx), [NotificationSettings.jsx](../../client/src/components/settings/NotificationSettings.jsx), [EmailTemplateSettings.jsx](../../client/src/components/settings/EmailTemplateSettings.jsx) gọi qua `api.js` → tự gắn Bearer.

2. **`/api/backup`**: [server/routes/backup.js](../../server/routes/backup.js) hiện chỉ có `verifyToken`, thiếu `requireRole` → mọi user đã đăng nhập đều có thể:

- Tải toàn bộ dữ liệu `events`, `resources`, `audit_logs` (`GET /api/backup`).
- Gọi `validate` + `restore` (`POST /api/backup/restore`) để **ghi đè** các collection này.
  Sửa:

```js
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// Protect all backup routes - admin only
router.use(verifyToken, requireRole(["admin"]));
```

Kiểm client: [DataRetention.jsx](../../client/src/components/settings/DataRetention.jsx) gọi qua `api.js` → tự gắn Bearer.

Test thủ công: user role `user` gọi:

- `GET /api/settings` → 403
- `GET /api/backup` → 403
- `POST /api/backup/restore` → 403

## 11. `ResourceManager.jsx`

Hiển thị `Còn: {item.availableQty ?? item.quantity} / {item.quantity}` thay cho dòng "In Stock". Bắt lỗi 409 và hiện `error.response.data.error` bằng toast hiện có.

## 12. `firestore.rules` — thêm **trước** catch-all

```
    // Borrow data contains guest PII; only the server (Admin SDK) may touch it.
    match /borrow_requests/{docId} {
      allow read, write: if false;
    }
    match /borrow_otps/{docId} {
      allow read, write: if false;
    }
```

Thêm test vào [firestoreRules.test.js](../../server/tests/firestoreRules.test.js): hai block trên tồn tại với `allow read, write: if false`.
**Chú ý:** test hiện có `expect(rules).not.toMatch(/allow\s+read\s*,\s*write\s*:/)` sẽ **fail** với block mới. Sửa test đó thành chỉ cấm `allow read, write: if true` / `if request.auth != null` (pattern lỏng), giữ nguyên ý định ban đầu. Ghi rõ lý do trong comment test.

## 13. `server/firestore.indexes.json` — thêm

```json
{ "collectionGroup": "borrow_requests", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "status", "order": "ASCENDING" }, { "fieldPath": "createdAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "borrow_requests", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "status", "order": "ASCENDING" }, { "fieldPath": "dueAt", "order": "ASCENDING" } ] },
{ "collectionGroup": "borrow_requests", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "borrower.phone", "order": "ASCENDING" }, { "fieldPath": "isOpen", "order": "ASCENDING" } ] },
{ "collectionGroup": "borrow_requests", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "borrower.email", "order": "ASCENDING" }, { "fieldPath": "isOpen", "order": "ASCENDING" } ] },
{ "collectionGroup": "borrow_requests", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "borrower.uid", "order": "ASCENDING" }, { "fieldPath": "createdAt", "order": "DESCENDING" } ] }
```

Lookup theo `accessTokenHash` / `verifyTokenHash` là single-field equality → không cần index.

## 14. `server/scripts/backfill-available-qty.js` (mới)

Đọc tất cả `resources`; doc nào **chưa có** `availableQty` thì set `= quantity`. In số doc đã cập nhật. Chạy lại không đổi gì (idempotent). Chạy: `cd server && node scripts/backfill-available-qty.js`.

## 15. Tests — `server/tests/borrow-stock.test.js`

Theo pattern [round3Bugs.test.js](../../server/tests/round3Bugs.test.js) (mock `../config/firebase` bằng `buildFirebaseMock`, mock `auditLogController.logAction`).

1. reserve đủ hàng → `availableQty` giảm đúng.
2. reserve thiếu 1 món trong 2 → 409, `details.shortages` có đúng món đó, **không** món nào bị trừ.
3. items trùng `resourceId` được gộp (2+2 > 3 → 409).
4. Hai `transition(pending→approved)` song song trên 2 phiếu cùng tranh món cuối → đúng 1 thành công, 1 lỗi 409, `availableQty === 0`.
5. `transition` cạnh không hợp lệ (`pending→returned`) → 409.
6. `transition` hai lần `pending→approved` cùng phiếu → lần 2 409, kho chỉ trừ 1 lần.
7. chốt trả `receivedQty` 1/2 → kho cộng 1.
8. `approved→cancelled` → kho cộng đủ.
9. `updateResource` giảm `quantity` dưới số đang mượn → 409.

## 16. Validation

- `cd server && npx jest tests/borrow-stock.test.js tests/firestoreRules.test.js` pass.
- `npx jest` toàn bộ: không giảm so với baseline phase 00.
- Sau khi **đã backup** (phase 00): chạy backfill trên DB thật, chạy lần 2 báo `0 updated`.
- Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes` (chờ index build xong trước phase 02).
- Thủ công: đăng nhập user role `user`:
  - `PUT /api/resources?id=mic` → 403
  - `GET /api/settings` → 403
  - `GET /api/backup` → 403
