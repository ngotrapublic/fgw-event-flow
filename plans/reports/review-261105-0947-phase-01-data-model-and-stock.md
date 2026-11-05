# Báo cáo review Phase 01 — Data model, tồn kho, chặn lỗ hổng

- Plan: [phase-01-data-model-and-stock.md](../261104-1159-equipment-borrow-return/phase-01-data-model-and-stock.md)
- Branch: `feat/equipment-borrow` @ `daab3bc` feat(borrow): add stock tracking and borrow data model
- Người review: Claude Code

| Lần | Thời điểm | Kết quả |
|---|---|---|
| 1 | 2026-11-05 09:47 | ❌ Chặn: trang Notification Settings hỏng sau khi khoá `/api/settings` |

## Kết luận (lần 1)

**Chưa đạt.** Phần tồn kho, transition, rules, index đúng plan và test pass. Còn 1 lỗi HIGH: khoá `/api/settings` làm 2 trang admin không gọi được API (mục 3.1). Lỗi này đến từ plan: §10 ghi các trang này "gọi qua `api.js`", nhưng thực tế chúng dùng `fetch` không kèm token. Reviewer đã khảo sát sai ở bước viết plan.

| Hạng mục | Kết quả |
|---|---|
| §1 `HttpError` + `errorHandler` trả `details` | ✅ |
| §2 `firebase.js` export 2 collection | ✅ |
| §5 `borrow-constants.js` | ✅ khớp plan từng giá trị |
| §6 `borrow-stock-service.js` | ✅ (1 lưu ý MEDIUM, mục 3.3) |
| §7 `borrow-transition-service.js` | ✅ (lưu ý cho phase 03, mục 4) |
| §8 `resourceController.js` | ✅ (1 lưu ý MEDIUM, mục 3.2) |
| §9 `routes/resources.js` | ✅ |
| §10 `/api/settings`, `/api/backup` | ⚠️ server đúng, client hỏng (mục 3.1) |
| §11 `ResourceManager.jsx` | ✅ |
| §12 `firestore.rules` + test | ✅ |
| §13 indexes | ✅ thêm 5, không xoá index cũ |
| §14 backfill | ✅ DB thật: 11/11 doc có `availableQty` |
| §15 tests | ✅ 9 case plan + 4 case role, pass |
| Deploy rules/indexes | ❓ Chưa xác minh được (mục 2) |

## 1. Commit & working tree

- `8426a3d` docs: sync report, sửa schema, thêm `.prettierrc` (nháy đơn, thụt 4, `*.md` thụt 2). Đúng style repo.
- `daab3bc`: 18 file, khớp danh sách file plan. Message đúng conventional commit.
- Còn 5 file chưa commit (`http-error.js`, `borrow-constants.js`, `borrow-stock-service.js`, `borrow-transition-service.js`, `backfill-available-qty.js`): `git diff -w` cho thấy chỉ thêm 1 dòng trống cuối file. Commit kèm lần sửa tới hoặc bỏ đi.

## 2. Kiểm chứng

| Kiểm | Kết quả |
|---|---|
| `npx jest` toàn bộ | 102 pass / 17 fail / 119; 12/14 suites. **0 test fail mới** so với baseline phase 00 (17 fail cũ giữ nguyên) |
| `borrow-stock.test.js` | 13/13 pass |
| `firestoreRules.test.js` | 6/6 pass; test cũ được nới đúng ý plan, có comment lý do |
| `vite build` client | ✅ build xong (chỉ có cảnh báo chunk > 500 kB, đã có từ trước) |
| DB thật (chỉ đọc) | `resources` 11 doc, thiếu `availableQty`: 0, ngoài khoảng `[0, quantity]`: 0, đang cho mượn: 0 |
| `firestore.indexes.json` | JSON hợp lệ; 7 → 12 index; `firebase.json` trỏ đúng file |
| Deploy rules + indexes | ❓ Máy review không có `firebase` CLI. Cần agent/bạn xác nhận đã chạy `firebase deploy --only firestore:rules,firestore:indexes` và index ở trạng thái *Enabled* trên Console |
| Test thủ công 403 (user role `user`) | ❓ Chưa có bằng chứng. Test role chỉ gọi thẳng `requireRole`, không đi qua router. Reviewer đã đọc code: route gắn middleware đúng |

## 3. Lỗi

### 3.1 HIGH — Notification Settings và Email Templates hỏng sau khi khoá `/api/settings`

[NotificationSettings.jsx](../../client/src/components/settings/NotificationSettings.jsx) (4 lời gọi) và [EmailTemplateSettings.jsx](../../client/src/components/settings/EmailTemplateSettings.jsx) (3 lời gọi) dùng `fetch(\`${API_BASE}/settings…\`)` với header chỉ có `Content-Type`, **không có `Authorization`**. Giờ `/api/settings` chạy `verifyToken` → không có header → `401`.

Hậu quả: admin mở `/settings/notifications` thấy cài đặt trống, bấm Lưu báo lỗi; không gán được template email. Phase 02 dựa vào `channels.email` trong settings, nên admin sẽ không bật/tắt được kênh email.

Sửa: đổi 7 lời gọi `fetch` sang `api` từ [services/api.js](../../client/src/services/api.js) (interceptor tự gắn Bearer), giữ logic xử lý response. Ví dụ:
```js
// trước
const response = await fetch(`${API_BASE}/settings`);
if (response.ok) { const data = await response.json(); ... }
// sau
const { data } = await api.get('/settings');
```
`POST /settings` và `POST /settings/templates/:type/assign` làm tương tự với `api.post(url, body)`. Bỏ hằng `API_BASE` nếu không còn dùng.

Kiểm sau khi sửa: đăng nhập admin → `/settings/notifications` hiện đúng cài đặt, Lưu thành công; tab Email Templates tải và gán được.

`DataRetention.jsx`, `EventDashboard.jsx` (`/settings/app-context`), `ResourceManager.jsx` đã dùng `api` → không ảnh hưởng.

### 3.2 MEDIUM — `createResource` ghi đè thiết bị cũ, mất số đang cho mượn

[resourceController.js](../../server/controllers/resourceController.js) sinh `id` từ `label` rồi `set()` không kiểm tồn tại. Tạo thiết bị mới trùng tên với thiết bị đang có (vd "Micro") → ghi đè doc cũ, `availableQty` reset bằng `quantity` dù đang có người mượn → kho cho mượn vượt số thực.

Lỗi ghi đè có từ trước, nhưng giờ làm hỏng số tồn kho. Sửa: kiểm `doc.exists` trước khi `set` → `409 'Thiết bị đã tồn tại'`.

### 3.3 MEDIUM — `increment()` cho kết quả sai nếu doc thiếu `availableQty`

`reserveInTx` đọc `availableQty ?? quantity` để kiểm, nhưng ghi bằng `FieldValue.increment(-qty)`. Firestore coi field thiếu là 0 → doc thiếu `availableQty` sẽ thành **số âm**. `restockInTx` tương tự (cộng từ 0).

Hiện DB không còn doc nào thiếu field. Nhưng **restore backup phase 00** (chưa có `availableQty`) sẽ đưa lại doc thiếu field. Sửa: đã đọc trong transaction nên ghi giá trị tuyệt đối:
```js
tx.update(ref, { availableQty: available - m.qty });           // reserve
tx.update(ref, { availableQty: currentAvail + m.qty });        // restock, currentAvail = availableQty ?? quantity
```
Thêm 1 test: resource chỉ có `quantity: 3`, reserve 1 → `availableQty === 2`.

### 3.4 LOW

- `deleteResource` kiểm "đang cho mượn" ngoài transaction → nếu duyệt phiếu đúng lúc xoá thì có thể lọt. Hiếm, chấp nhận được.
- `updateResource` ghi mọi field client gửi (trừ `id`, `availableQty`). Giờ chỉ admin/manager gọi được nên rủi ro thấp.

## 4. Ghi chú cho phase 03

`transition(* → returned | returned_with_issue)` cộng kho theo `patch.items` do caller truyền vào; nếu thiếu `receivedQty` thì cộng đủ `qty`. Controller `confirm-return` ở phase 03 phải:
- Lấy `items` từ phiếu hiện tại, chỉ nhận `receivedQty` từ body theo `resourceId`.
- Bắt buộc `receivedQty` nguyên, `0 ≤ receivedQty ≤ qty`.

Nếu không, body sai có thể cộng kho vượt số đã cho mượn.

## Việc cần làm

1. [x] Sửa 3.1 (NotificationSettings.jsx, EmailTemplateSettings.jsx dùng `api` thay cho `fetch`).
2. [x] Sửa 3.2, 3.3 + test cho 3.3 và 3.2 (test 10 & 11 trong `borrow-stock.test.js`).
3. [ ] Xác nhận deploy rules + indexes, index *Enabled* (`firebase deploy --only firestore:rules,firestore:indexes`).
4. [x] Test role 403 với user role `user`: `PUT /api/resources?id=mic`, `GET /api/settings`, `GET /api/backup` (4 tests trong `borrow-stock.test.js` pass).
5. [x] Đã format và commit các file thay đổi dòng trống cuối.
6. [x] Chạy lại `npx jest`: 104 pass (≥ 102), không có test fail mới.

## Câu hỏi chưa giải quyết

- Không có.
