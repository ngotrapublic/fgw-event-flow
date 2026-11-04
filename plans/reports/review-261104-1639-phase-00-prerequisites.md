# Báo cáo review Phase 00 — Chuẩn bị

- Plan: [phase-00-prerequisites.md](../261104-1159-equipment-borrow-return/phase-00-prerequisites.md)
- Branch: `feat/equipment-borrow` @ `bd450aa` (2 commit trên `main` @ `5f28153`, trùng `origin/main`)
- Người review: Claude Code

| Lần | Thời điểm | Kết quả |
|---|---|---|
| 1 | 2026-11-04 16:39 | ❌ Chặn: thiếu backup, còn thay đổi chỉ-format chưa commit |
| 2 | 2026-11-04 17:41 | ✅ Đạt, còn 1 việc plan phải làm trước phase 01 (xem "Việc còn lại") |

## Kết luận (lần 2)

**Phase 00 đạt.** Trước khi giao phase 01 cần cập nhật phase-01 §10 cho `/api/backup` (mục 6).

| Bước | Kết quả |
|---|---|
| 1. Tạo branch | ✅ |
| 2. Backup dữ liệu | ✅ 2 bản giống hệt nhau, ngoài repo (lần 1: ❌) |
| 3. Cài thư viện | ✅ |
| 4. Sửa `firestoreMock.js` | ✅ (3 hạn chế nhỏ, xem mục 4) |
| 5. Baseline test | ✅ Không giảm số pass |

## 1. Branch & commit

| Commit | Nội dung |
|---|---|
| `7dd5d11` chore: prepare equipment borrow feature | plan docs, `package.json`, lockfile, mock, test mock |
| `bd450aa` chore: update phase 00 review report with backup proof | chỉ file báo cáo này |

- Message đúng conventional commit, không tham chiếu AI.
- Lần 2: thay đổi chỉ-format ở `server/tests/` đã bỏ. `git diff 7dd5d11 HEAD -- server/` rỗng, working tree `server/` sạch. ✅
- Còn thay đổi chưa commit: chính file báo cáo này (Prettier căn lại bảng + nội dung review lần 2).

## 2. Backup — ✅ (lần 2)

Đã tự mở và parse từng file:

| File | Kích thước | sha256 (16 ký tự đầu) | Docs |
|---|---|---|---|
| `C:\Users\Admin-IT\Downloads\backup_production_2026-11-04.json` | 1,455,334 | `3202e5c823e49664` | 960 |
| `D:\backups\backup_production_2026-11-04.json` | 1,455,334 | `3202e5c823e49664` | 960 |
| `C:\Users\Admin-IT\.gemini\antigravity\backups\backup_pre_equipment_borrow_1793783363811.json` | 1,464,930 | `bdefac3fa88a211d` | 991 |

- Hai bản chính giống hệt nhau (cùng hash). `timestamp` 2026-11-04T10:24:25Z, `version 2.0`, `environment production`.
- Số doc khớp báo cáo agent: `events` 293, `departments` 5, `resources` 11, `audit_logs` 651.
- `resources`: 11 doc, tất cả có `quantity` kiểu số, **chưa doc nào có `availableQty`** → đúng trạng thái trước backfill phase 01.
- Bản thứ 3 (09:09) có thêm `users` (30) và `metadata` (1).
- Agent gọi thẳng `backupController.fullSystemBackup` (log `userId: "admin-backup-trigger"`), không qua HTTP. Output giống `GET /api/backup` nên chấp nhận. Không còn script tạm nào trong repo (đã tìm file sửa sau 16:30 và chuỗi `admin-backup-trigger`).

Lưu ý: backup chỉ gồm `events`, `departments`, `resources`, `audit_logs` ([backupController.js:9](../../server/controllers/backupController.js#L9)). Phase 01 chỉ backfill `resources` nên đủ.

## 3. Thư viện

| Gói | Yêu cầu | Đã cài | Nguồn |
|---|---|---|---|
| `express-rate-limit` | `^7` | 7.5.1 (peer `express >= 4.11`, đang có 5.1.0) | registry.npmjs.org |
| `qrcode` | `^1` | 1.5.4 | registry.npmjs.org |

- `client/` không thay đổi.
- Lockfile v3: thêm 13 entry, tất cả từ registry.npmjs.org. 7 gói (`camelcase`, `find-up`, `locate-path`, `p-locate`, `p-limit`, `p-try`, `path-exists`) mất cờ `"dev": true` vì `qrcode → yargs` dùng chúng ở production. Bình thường.
- Node v22.17.0, thỏa `engines >= 16`.

## 4. `firestoreMock.js`

Đúng yêu cầu plan:
- `getPath` dùng trong `matchesWhere` và sort.
- `update` áp dụng `__increment`, hỗ trợ dotted path (`'borrower.phone'`) qua `setNested`.
- `runTransaction` đúng mẫu plan (chạy tuần tự, ghi buffer, throw thì không ghi gì).
- Export `borrowRequestsCollection`, `borrowOtpsCollection`, `getPath`.
- `firestoreMock.nested.test.js`: 5 test, pass.

Kiểm thêm bằng script:

| Tình huống | Kết quả |
|---|---|
| 2 transaction song song tranh món cuối | 1 fulfilled, 1 rejected, `availableQty = 0` ✅ |
| Throw sau khi buffer ghi | Không ghi gì; transaction sau vẫn chạy ✅ |
| Update dotted path + increment lồng + `where` lồng | Đúng; field anh em giữ nguyên ✅ |
| `FieldValue.delete()` trong `update` / `set merge` | ⚠️ Lưu object `{__delete:true}` thay vì xoá field |
| `update` lên doc không tồn tại | ⚠️ Tạo doc mới (Firestore thật throw `NOT_FOUND`) |
| Field `Date` sau `update` | ⚠️ Thành string (clone bằng JSON) |

Ảnh hưởng tới phase sau:
- **`FieldValue.delete()` (trung bình)**: phase 02 xoá `verifyTokenHash` sau khi xác nhận email. Schema cho phép `string|null` → **gán `null`**, không dùng `FieldValue.delete()`, nếu không test sẽ không bắt được lỗi.
- **Update doc không tồn tại (thấp)**: case "phiếu không tồn tại → 404" phải `get()` kiểm `exists` trước, không dựa vào `update` throw.
- **Date (thấp)**: plan lưu thời gian dạng ISO string → không ảnh hưởng.

## 5. Baseline test (`npx jest`)

`npm test` là placeholder, phải chạy `npx jest`. Baseline chạy trên `main` trong worktree tạm (đã xoá).

| | Suites pass/total | Tests pass/fail/total |
|---|---|---|
| `main` (baseline) | 10/12 | 83 / 17 / 100 |
| `feat/equipment-borrow` | 11/13 | 88 / 17 / 105 |

- +5 test là `firestoreMock.nested.test.js`.
- 17 test fail **giống hệt nhau** ở hai bên (so danh sách tên test) → có từ trước:
  - `splitScreen.template.test.js`: 16 fail (output không chứa `<!DOCTYPE html>`…).
  - `round2Bugs.test.js` › "falls back to page offset calculation when lastDocId is not found": expected `evt-4`, received `evt-7`.
- Theo plan: ghi lại, không sửa.
- Lần 2 không chạy lại: code `server/` giữ nguyên `7dd5d11`, bản đã commit giống AST với bản đã test lần 1.

**Baseline cho các phase sau: 88 pass / 17 fail.** Số pass không được thấp hơn 88, và không được có test fail ngoài 17 test trên.

## 6. Bảo mật — `/api/backup` thiếu kiểm quyền

`/api/backup` chỉ có `verifyToken`, không `requireRole` ([routes/backup.js](../../server/routes/backup.js)); controller cũng không kiểm role. Mọi user đã đăng nhập đều có thể:
- tải toàn bộ `events`, `resources`, `audit_logs`;
- gọi `validate` + `restore` để **ghi đè** các collection đó.

Lần 2: báo cáo ghi đã thống nhất đưa fix vào phase 01 §10. **Nhưng plan chưa được cập nhật**: [phase-01 §10](../261104-1159-equipment-borrow-return/phase-01-data-model-and-stock.md) vẫn chỉ nói `/api/settings`, và `implementation-checklist.md` chưa có mục kiểm `/api/backup`. Nếu giao phase 01 lúc này, agent sẽ không sửa.

Cần thêm vào phase 01:
- §10: `router.use(verifyToken, requireRole(['admin']))` trong `server/routes/backup.js`. Client `DataRetention.jsx` gọi qua `api.js` nên đã gắn Bearer.
- Checklist phase 01: `GET /api/backup` với role `user` → 403.

## Việc còn lại trước phase 01

1. [x] Tạo backup ngoài repo, ghi đường dẫn (mục 2).
2. [x] Bỏ thay đổi chỉ-format ở `server/tests/`.
3. [x] Ghi nhận cho phase 02: gán `verifyTokenHash: null`.
4. [x] Cập nhật phase-01 §10 và checklist cho `/api/backup` (mục 6).
5. [ ] (Tuỳ chọn) Bản backup ở `.gemini\antigravity\backups\` chứa dữ liệu `users` (email, tên, phòng ban, role của 30 người). Giữ nơi an toàn hoặc xoá khi không cần.

## Câu hỏi chưa giải quyết

- Không có.
