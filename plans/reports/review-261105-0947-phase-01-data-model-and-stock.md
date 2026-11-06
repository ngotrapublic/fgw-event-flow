# Báo cáo review Phase 01 — Data model, tồn kho, chặn lỗ hổng

- Plan: [phase-01-data-model-and-stock.md](../261104-1159-equipment-borrow-return/phase-01-data-model-and-stock.md)
- Branch: `feat/equipment-borrow` @ `36161d2` docs(borrow): record successful deployment of rules and indexes for phase 01
- Người review: Claude Code

| Lần | Thời điểm | Kết quả |
|---|---|---|
| 1 | 2026-11-05 09:47 | ❌ Chặn: trang Notification Settings hỏng sau khi khoá `/api/settings` |
| 2 | 2026-11-05 11:17 | ❌ Chặn: 3.1–3.3 đã sửa đúng, nhưng phát sinh lỗi mới: nút Preview email làm crash app (mục 5) |
| 3 | 2026-11-05 18:00 | ⚠️ Code đạt. Còn chặn: **rules + 3 index chưa deploy** lên Firebase (mục 6) |
| 4 | 2026-11-06 08:30 | ✅ **Đạt, được sang phase 02.** Reviewer tự kiểm Firebase thật: rules + 5/5 index đúng, không mất index cũ (mục 7) |

## Kết luận (lần 4)

**Phase 01 đạt, được sang phase 02.** Không cần sửa gì thêm. Reviewer đã tự kiểm trên Firebase thật (chỉ đọc), không dựa vào ghi chú deploy của agent:
- Rules đang chạy giống hệt `firestore.rules` local, có 2 block khoá `borrow_requests` / `borrow_otps`.
- Cả 5 index mượn trả chạy được; 7 index cũ (`events`, `emailQueue`) vẫn chạy được → deploy không xoá index nào.

## Kết luận (lần 3)

**Code phase 01 đạt.** 5.1 đã sửa đúng (preview tải qua `api` + `srcDoc` + `sandbox=""`); test, eslint, build đều sạch.

**Chưa được sang phase 02**: reviewer kiểm thẳng Firebase (chỉ đọc) và thấy rules đang chạy là bản 29/10, chưa có khoá `borrow_requests`/`borrow_otps`; 3/5 index mới chưa tồn tại. Chỉ cần chạy deploy (mục 6.1), **không phải sửa code**.

## Kết luận (lần 2)

**Chưa đạt, còn 1 lỗi HIGH mới.** Ba lỗi của lần 1 đã sửa đúng và có test. Khi sửa 3.1, agent xoá hằng `API_BASE` nhưng còn 1 chỗ dùng → bấm **Preview** email làm trắng toàn bộ app (mục 5.1). Deploy rules/indexes vẫn chưa có bằng chứng.

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
| Deploy rules/indexes | ✅ Đã deploy & 5/5 index READY |

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

## 5. Review lần 2 (commit `69dc334`)

Working tree sạch; 5 file chỉ khác dòng trống cuối đã được commit.

| Lỗi lần 1 | Kết quả |
|---|---|
| 3.1 settings dùng `fetch` không token | ✅ 6/7 lời gọi đổi sang `api` (tự gắn Bearer), giữ đúng logic toast. ❌ Còn 1 chỗ, xem 5.1 |
| 3.2 `createResource` ghi đè | ✅ Kiểm `exists` → `409 'Thiết bị đã tồn tại'`; test 11 xác nhận doc cũ giữ nguyên `quantity` 5 / `availableQty` 3 |
| 3.3 `increment()` trên doc thiếu field | ✅ `reserveInTx` / `restockInTx` ghi giá trị tuyệt đối đã đọc trong transaction, bỏ `increment`; test 10 (`quantity: 3`, reserve 1 → `availableQty 2`) pass. Test 4 (tranh món cuối) vẫn pass |

| Kiểm | Kết quả |
|---|---|
| `npx jest` toàn bộ | 104 pass / 17 fail / 121; **0 test fail mới** so với baseline. `borrow-stock.test.js` 15/15 |
| `eslint` 2 file settings | ❌ `NotificationSettings.jsx:747 'API_BASE' is not defined (no-undef)` |
| Client còn `fetch` không token | `api/departments.js`, `PrintPortal.jsx`: có từ trước, route không đổi trong phase này → ngoài phạm vi |

### 5.1 HIGH — Bấm "Preview" email làm trắng toàn bộ app

[NotificationSettings.jsx:747](../../client/src/components/settings/NotificationSettings.jsx#L747) vẫn dùng `` `${API_BASE}/settings/preview/email?type=…` `` trong `<iframe src>`, nhưng `API_BASE` đã bị xoá ở dòng 12.

- Admin bấm nút **Preview** của một template → `setPreviewTemplate(...)` → render modal → `ReferenceError: API_BASE is not defined`.
- Route `/settings/notifications` không bọc `ErrorBoundary` (chỉ `/register`, `/events/:id/edit` có) → React gỡ cả cây → **trắng màn hình** đến khi reload.
- `vite build` không bắt được lỗi này (biến chưa khai báo chỉ lỗi lúc chạy). `eslint no-undef` bắt được.

Nếu chỉ khai báo lại `API_BASE` thì **vẫn hỏng**: `<iframe src>` không gửi được header `Authorization`, mà `/settings/preview/email` giờ yêu cầu admin → iframe hiện `{"error":"Unauthorized: No token provided"}`.

Sửa: tải HTML qua `api` rồi đưa vào `srcDoc`:
```jsx
const [previewHtml, setPreviewHtml] = useState('');

useEffect(() => {
    if (!previewTemplate) return;
    let isCancelled = false;
    setPreviewHtml('');
    api.get('/settings/preview/email', { params: { type: previewTemplate.id }, responseType: 'text' })
        .then(({ data }) => { if (!isCancelled) setPreviewHtml(data); })
        .catch(() => { if (!isCancelled) addToast('Không tải được bản xem trước', 'error'); });
    return () => { isCancelled = true; };
}, [previewTemplate]);

// trong modal
<iframe srcDoc={previewHtml} sandbox="" title="Email Preview" className="w-full h-full border-0" style={{ background: 'white' }} />
```
`sandbox=""` (không `allow-scripts`, không `allow-same-origin`) đủ để hiển thị HTML email và chặn script trong template.

Kiểm sau khi sửa:
- `npx eslint src/components/settings/NotificationSettings.jsx` không còn `no-undef`.
- Admin → `/settings/notifications` → bấm Preview → thấy nội dung email, đóng modal bình thường.

### 5.2 LOW

- `createResource`: `get()` rồi `set()` không atomic. Hai request tạo cùng tên đồng thời vẫn có thể ghi đè. Có thể dùng `docRef.create()` (Firestore tự throw nếu doc đã tồn tại); mock hiện không có `create()`, cần bổ sung nếu đổi. Chỉ admin/manager gọi được nên chấp nhận được.
- Chưa có test cho `restockInTx` trên doc thiếu `availableQty` (code đã xử lý đúng, đọc `availableQty ?? quantity`).

### 5.3 Về mục "Việc cần làm" #4 do agent đánh dấu

4 test trong `borrow-stock.test.js` gọi thẳng `requireRole(...)` với `req` giả. Các test này chứng minh middleware chặn đúng, **không** chứng minh route đã gắn middleware. Reviewer đã đọc `routes/resources.js`, `settings.js`, `backup.js`: gắn đúng. Chấp nhận thay cho test thủ công; nên kiểm thật 1 lần khi deploy.

## 6. Review lần 3 (commit `ab85090`)

Working tree sạch.

| Kiểm | Kết quả |
|---|---|
| 5.1 Preview email | ✅ Tải HTML bằng `api.get(..., { responseType: 'text' })` (có Bearer) → `srcDoc`; `sandbox=""` chặn script trong template. Có cờ `isCancelled` khi đóng modal/đổi template, spinner khi tải, toast khi lỗi. Gửi thêm `design` theo template đang chọn → preview đúng mẫu thiết kế |
| `Toast.jsx` thêm `addToast` vào context | ✅ Đúng. Trên `main`, `NotificationSettings` gọi `addToast(...)` 6 chỗ nhưng context **không có** `addToast` → mọi toast của trang này đã lỗi từ trước. Lần sửa này vá luôn lỗi cũ. `addToast` dùng `useCallback([])` nên dependency của `useEffect` ổn định, không fetch lặp |
| Dọn `NotificationSettings.jsx` | ✅ Bỏ import thừa (`useRef`, `RefreshCw`, `EmailTemplateSettings`). `EmailTemplateSettings.jsx` giờ không còn được import ở đâu (dead code có từ trước, không ảnh hưởng) |
| 5.2 test `restockInTx` doc thiếu `availableQty` | ✅ Test 12: `quantity: 3` + restock 2 → `availableQty 5` |
| `npx jest` toàn bộ | 105 pass / 17 fail / 122; **0 test fail mới**. `borrow-stock.test.js` 16/16 |
| `eslint` client | 0 error. 6 warning nhẹ: unused `React`, `TEMPLATE_VARIABLES`, `id`; fast-refresh ở `Toast.jsx`; `exhaustive-deps` thiếu `addToast` ở `useEffect` tải settings (`NotificationSettings.jsx:143`, vô hại vì `addToast` ổn định). Không chặn |
| `vite build` | ✅ |

### 6.1 Chặn — Rules và index chưa deploy

Kiểm thẳng trên Firebase thật bằng Admin SDK, chỉ đọc:

| Kiểm | Kết quả |
|---|---|
| Ruleset đang chạy | Tạo **29/10/2026**, khác `firestore.rules` local, **không có** block `borrow_requests` / `borrow_otps` |
| Index `status + createdAt desc` | ❌ `FAILED_PRECONDITION: The query requires an index` |
| Index `status + dueAt asc` | ❌ như trên |
| Index `borrower.uid + createdAt desc` | ❌ như trên |
| `borrower.phone + isOpen`, `borrower.email + isOpen` | ✅ chạy được (2 điều kiện `==` dùng index đơn tự động) |

Hậu quả nếu sang phase 02 lúc này:
- Rules catch-all `allow read: if request.auth != null` vẫn áp dụng → **mọi user đăng nhập đọc được `borrow_requests`, `borrow_otps` qua client SDK** (tên, email, SĐT người mượn; hash OTP).
- Danh sách admin (phase 03), "phiếu của tôi" và reminder job sẽ lỗi `FAILED_PRECONDITION`.

Cách làm (máy có Firebase CLI, đã `firebase login`, ở thư mục gốc repo):
```
firebase deploy --only firestore:rules,firestore:indexes
```
Sau đó mở Firebase Console → Firestore → Indexes, chờ 3 index trên chuyển sang **Enabled**, rồi báo reviewer kiểm lại.

## 7. Review lần 4 (sau deploy, commit `36161d2`)

Commit `36161d2` chỉ sửa file báo cáo này; code giữ nguyên `ab85090` (đã đạt ở lần 3). Working tree sạch.

Kiểm thẳng Firebase thật bằng Admin SDK, **chỉ đọc**:

| Kiểm | Kết quả |
|---|---|
| Ruleset đang chạy | Tạo 06/11/2026 01:14 UTC; **giống hệt** `firestore.rules` local |
| Block `borrow_requests`, `borrow_otps` | ✅ Có, đều `allow read, write: if false` |
| 5 query mượn trả (`status+createdAt↓`, `status+dueAt`, `borrower.phone+isOpen`, `borrower.email+isOpen`, `borrower.uid+createdAt↓`) | ✅ 5/5 chạy được |
| 7 index cũ trong `firestore.indexes.json` (`events` ×6 gồm 4 index `location` array-contains, `emailQueue` ×1) | ✅ 7/7 chạy được |
| Trạng thái index trên Firestore | Tất cả `READY`, không có `CREATING` / `NEEDS_REPAIR`. Index `userId + createdAt↓` (không có trong file) vẫn còn → deploy không xoá index ngoài file |

Rollback rules nếu cần: ruleset cũ ngày 29/10/2026 (giống `firestore.rules` trên `main`).

## Việc cần làm

1. [x] Sửa 3.1 (NotificationSettings.jsx, EmailTemplateSettings.jsx dùng `api` thay cho `fetch`).
2. [x] Sửa 3.2, 3.3 + test cho 3.3 và 3.2 (test 10 & 11 trong `borrow-stock.test.js`).
3. [x] **Deploy rules + indexes, chờ index *Enabled*** (`firebase deploy --only firestore:rules,firestore:indexes`). Đã deploy thành công: Ruleset cập nhật ngày 06/11/2026 (đã có rule bảo vệ `borrow_requests` & `borrow_otps`), toàn bộ 5 composite indexes đã đạt trạng thái `READY`, cả 3 query kiểm thử `status + createdAt desc`, `status + dueAt asc`, `borrower.uid + createdAt desc` đều chạy `OK`.
4. [x] Test role 403 với user role `user`: `PUT /api/resources?id=mic`, `GET /api/settings`, `GET /api/backup` (4 tests trong `borrow-stock.test.js` pass). *Reviewer: chấp nhận, xem 5.3.*
5. [x] Đã format và commit các file thay đổi dòng trống cuối.
6. [x] Chạy lại `npx jest`: 105 pass (≥ 102), không có test fail mới.
7. [x] **Sửa 5.1** (Preview email): tải HTML qua `api` + `srcDoc`; `eslint` sạch `no-undef`.
8. [x] (Tuỳ chọn) 5.2: Thêm test 12 cho `restockInTx` trên doc thiếu `availableQty` (16/16 test trong `borrow-stock.test.js` pass).

## Câu hỏi chưa giải quyết

- Không có.
