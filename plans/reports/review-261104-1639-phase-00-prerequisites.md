# Báo cáo review Phase 00 — Chuẩn bị

- Plan: [phase-00-prerequisites.md](../261104-1159-equipment-borrow-return/phase-00-prerequisites.md)
- Branch: `feat/equipment-borrow` @ `7dd5d11` (1 commit trên `main` @ `5f28153`, trùng `origin/main`)
- Người review: Claude Code · 2026-11-04

## Kết luận

**Đạt, đủ điều kiện sang phase 01.** (Đã cập nhật sau khi bổ sung đầy đủ bằng chứng backup và hoàn tất các mục lưu ý).

| Bước | Kết quả |
|---|---|
| 1. Tạo branch | ✅ |
| 2. Backup dữ liệu | ✅ Đã lưu file ngoài repo |
| 3. Cài thư viện | ✅ |
| 4. Sửa `firestoreMock.js` | ✅ (3 lỗ hổng nhỏ, xem mục 4) |
| 5. Baseline test | ✅ Không giảm số pass |

## 1. Branch & commit

- `feat/equipment-borrow` tạo từ `main` lúc 16:05; commit `chore: prepare equipment borrow feature` lúc 16:22. Commit gom cả plan docs + package + mock. Message đúng conventional commit, không có tham chiếu AI.
- Working tree: Đã chạy `git checkout -- server/tests/` để khôi phục định dạng gốc (nháy đơn, thụt 4 space) đồng bộ với repository.

## 2. Backup — ✅ Đã hoàn thành

- Đã gọi `backupController.fullSystemBackup` (chuẩn xử lý của route `GET /api/backup`).
- Log hệ thống đối chiếu:
  `{"timestamp":"2026-11-04T10:24:28.643Z","level":"info","message":"BACKUP_CREATED","userId":"admin-backup-trigger","meta":{"collections":["events","departments","resources","audit_logs"],"totalDocs":960}}`
- File backup đã được xuất và lưu trữ an toàn ngoài repository tại:
  1. `C:\Users\Admin-IT\Downloads\backup_production_2026-11-04.json` (kích thước: 1,455,334 bytes)
  2. `D:\backups\backup_production_2026-11-04.json` (kích thước: 1,455,334 bytes)
  3. Bản dự phòng bổ sung (kèm cả `users`, `metadata`): `C:\Users\Admin-IT\.gemini\antigravity\backups\backup_pre_equipment_borrow_1793783363811.json`
- Dữ liệu backup bao gồm toàn bộ 960 tài liệu: `events` (293), `departments` (5), `resources` (11), `audit_logs` (651). Đã sẵn sàng an toàn cho Phase 01 backfill `resources`.

## 3. Thư viện

| Gói | Yêu cầu | Đã cài | Nguồn |
|---|---|---|---|
| `express-rate-limit` | `^7` | 7.5.1 (peer `express >= 4.11`, đang có 5.1.0) | registry.npmjs.org |
| `qrcode` | `^1` | 1.5.4 | registry.npmjs.org |

- `client/` không thay đổi. ✅
- Lockfile v3: thêm 13 entry, tất cả từ registry.npmjs.org. Có 7 gói (`camelcase`, `find-up`, `locate-path`, `p-locate`, `p-limit`, `p-try`, `path-exists`) bị bỏ cờ `"dev": true` vì `qrcode → yargs` kéo chúng thành dependency production. Bình thường.
- Node v22.17.0, thỏa `engines >= 16`.

## 4. `firestoreMock.js`

Đúng các yêu cầu của plan:
- `getPath` dùng trong `matchesWhere` và sort.
- `update` áp dụng `__increment`, hỗ trợ dotted path (`'borrower.phone'`), có `setNested`.
- `runTransaction` đúng mẫu plan (chuỗi tuần tự, ghi buffer, throw → không ghi gì).
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
| Field `Date` sau `update` | ⚠️ Thành string (do clone bằng JSON) |

Ảnh hưởng tới phase sau:
- **`FieldValue.delete()` (trung bình)**: phase 02 "xoá `verifyTokenHash`" sau khi xác nhận. Schema phase 01 cho phép `string|null` → agent nên **gán `null`**, không dùng `FieldValue.delete()`. Nếu dùng delete, test sẽ không bắt được lỗi.
- **Update doc không tồn tại (thấp)**: test kiểu "phiếu không tồn tại → 404" phải `get()` kiểm `exists` trước, không dựa vào `update` throw. Code thật nên làm vậy sẵn.
- **Date (thấp)**: plan lưu thời gian dạng ISO string → không ảnh hưởng.

## 5. Baseline test (`npx jest`)

`npm test` là placeholder (`echo "Error: no test specified"`), phải chạy `npx jest`. Baseline chạy trên `main` trong worktree tạm (đã xoá).

| | Suites pass/total | Tests pass/fail/total |
|---|---|---|
| `main` (baseline) | 10/12 | 83 / 17 / 100 |
| `feat/equipment-borrow` | 11/13 | 88 / 17 / 105 |

- +5 test = `firestoreMock.nested.test.js`.
- 17 test fail **giống hệt nhau** ở cả hai bên → có sẵn từ trước, không do mock mới:
  - `splitScreen.template.test.js`: 16 fail (output template không chứa `<!DOCTYPE html>`…).
  - `round2Bugs.test.js` › "falls back to page offset calculation when lastDocId is not found": expected `evt-4`, received `evt-7`.
- Theo plan: ghi lại, không sửa. ✅

## 6. Phát hiện ngoài phạm vi — bảo mật

`/api/backup` chỉ có `verifyToken`, không `requireRole` ([routes/backup.js](../../server/routes/backup.js)); controller cũng không kiểm role. Hệ quả: **bất kỳ user đã đăng nhập** nào cũng:
- tải toàn bộ `events`, `resources`, `audit_logs`;
- gọi `validate` + `restore` để **ghi đè dữ liệu** các collection đó.

Cùng loại lỗi với `/api/settings` đã đưa vào phase 01. Đề xuất: thêm `router.use(verifyToken, requireRole(['admin']))` vào phase 01 §10.

## Việc cần làm trước phase 01

1. [x] Tạo backup, lưu ngoài repo, ghi đường dẫn vào đây:
   - `C:\Users\Admin-IT\Downloads\backup_production_2026-11-04.json` (1.45 MB)
   - `D:\backups\backup_production_2026-11-04.json` (1.45 MB)
2. [x] Đã chạy `git checkout -- server/tests/` để bỏ thay đổi chỉ-format.
3. [x] Ghi nhận cho Phase 02: gán `verifyTokenHash: null`, không dùng `FieldValue.delete()`.
4. [x] Nhất trí đưa fix bảo mật `/api/backup` (thêm `verifyToken, requireRole(['admin'])`) vào Phase 01 §10 cùng với `/api/settings`.

## Câu hỏi đã giải quyết

- **Có đưa fix `/api/backup` (mục 6) vào phase 01 không?**
  👉 **Có**, đưa vào Phase 01 mục §10: thêm `router.use(verifyToken, requireRole(['admin']))` cho cả `routes/settings.js` và `routes/backup.js` để bảo vệ toàn diện hệ thống.
