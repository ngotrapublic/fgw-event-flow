# Báo cáo review Phase 03 — API admin/manager & job nhắc hạn

- Plan: [phase-03-admin-api-and-jobs.md](../261104-1159-equipment-borrow-return/phase-03-admin-api-and-jobs.md)
- Branch: `feat/equipment-borrow`
- Người review: Claude Code

| Lần | Thời điểm | Kết quả |
|---|---|---|
| 1 | 2026-11-09 12:30 | ❌ Chặn: `confirm-return` nhận `resourceId` trùng → mất món và mất tồn kho (H1). **Chưa chạy lại được test** |
| 2 | 2026-11-09 15:05 | (agent tự ghi) Đã fix H1, M2, M3, L1–L6, thêm test, báo 62/62 pass |
| 3 | 2026-11-09 | ✅ Đạt (đọc code, Claude xác minh độc lập). Đủ điều kiện sang phase 04. **Claude vẫn chưa chạy được `npx jest`**, nên con số 62/62 là của agent |
| 4 | 2026-11-09 | ✅ Xác nhận bằng `npx jest` người dùng chạy: 17 fail / 151 pass / 168 test, 2/17 suite fail. Số fail **bằng baseline 17**, không có fail mới |

## Kết luận (lần 3 — Claude xác minh lại commit `a995717`)

**Đạt.** Đọc lại code sau khi fix thì không còn lỗi chặn. Có thể bắt đầu phase 04.

**Giới hạn:** Shell của phiên vẫn treo (lệnh `npx jest ... ; echo EXIT` không trả gì), nên kết quả bên dưới dựa trên đọc code và test, chưa phải số liệu chạy thật. Cần dán phần tóm tắt `npx jest` (cả bộ) để xác nhận: tập test fail phải **trùng đúng baseline 17** (`splitScreen.template.test.js` 16 + `round2Bugs.test.js` 1), và các file `borrow-*` pass hết.

| Lỗi lần 1 | Kết quả | Bằng chứng |
|---|---|---|
| H1 trùng/thiếu `resourceId` | ✅ | `confirmReturn` kiểm: số món bằng nhau, `Set` không trùng, mọi `resourceId` thuộc phiếu. Test 11 phủ trùng, thiếu, thừa (400) và đảo thứ tự (200) |
| M2 lọc overdue sau `limit` | ✅ | Đưa vào query: `status in [handed_over, return_pending]` + `dueAt < now` + `orderBy('dueAt')`, lấy `limit+1`, `nextCursor` theo trang đã cắt. Index `(status ASC, dueAt ASC)` có trong [server/firestore.indexes.json](../../server/firestore.indexes.json) (dòng 76–83), phase 01 báo đã READY. Mock hỗ trợ `in`, `<`, `orderBy`, `startAfter`, nên test 13 kiểm thật thứ tự và phân trang |
| M3 `cancelReason` | ✅ | `toPublicView` có `cancelReason`; schema phase 01 đã thêm `verifiedTokenHash`, `cancelReason`, `windowStart`/`sendCount` |
| L1 hằng số | ✅ | Job dùng `LIMITS.APPROVED_STALE_MS`, `LIMITS.DUE_SOON_MS`. Còn chu kỳ `15 * 60 * 1000` viết cứng (nhỏ, không cần sửa) |
| L2 cursor không tồn tại | ✅ | Trả 400 "Cursor không hợp lệ…" (test 13) |
| L3 whitelist status | ✅ | Lọc theo danh sách cho phép, bỏ trùng, tối đa 10 (giới hạn của `in`) |
| L4 reset `isOverdue` | ✅ | Patch `isOverdue: false` khi trả (test 12) |
| L5 `returnNote` | ✅ | Bắt buộc string, trim, ≤ 500 (test 12) |
| L6 `start()` gọi 2 lần | ✅ | Có guard `intervalId` (test 8 của job) |
| L7 bàn giao không gửi email | Giữ nguyên | Đúng plan, chỉ là ghi chú |
| §3 test còn thiếu | ✅ | Admin: test 14 (404/ẩn `*Hash`), 15 (409 handover), 16 (email lỗi → 200 `emailSent:false`). Job: test 7 (`approvedAt` thiếu/sai), 8 (idempotent) |

### Ghi chú nhỏ (không chặn)

1. `overdue=true` đi kèm status không hợp (vd `status=pending`) sẽ âm thầm trả về `handed_over`/`return_pending` thay vì danh sách rỗng hoặc 400. UI phase 05 không gửi tổ hợp này thì không sao.
2. Job bước 4 chỉ đặt `isOverdue=true` cho `handed_over`, còn `counts`/danh sách coi `return_pending` quá `dueAt` là quá hạn. Điều này khớp plan (đã báo trả thì không nhắc), nhưng **UI phase 05 nên tính quá hạn theo `dueAt`**, không dựa vào cờ `isOverdue`.
3. Index `(status, dueAt)` cần có trên **production** trước khi dùng bộ lọc quá hạn. Nếu thiếu, Firestore trả lỗi `FAILED_PRECONDITION` kèm link tạo index.

## Kết luận (lần 2 — agent tự ghi, chưa được Claude xác minh)

Tất cả các vấn đề báo cáo trong lần 1 đã được giải quyết triệt để:
- **H1 (HIGH)**: `confirmReturn` kiểm tra bắt buộc exact set `resourceId` (số lượng khớp, không trùng, mọi `resourceId` đều thuộc phiếu).
- **M2 (MEDIUM)**: Lọc `overdue=true` đẩy xuống Firestore query với index `(status ASC, dueAt ASC)`, giải quyết triệt để vấn đề mất phân trang và `nextCursor`.
- **M3 (MEDIUM)**: Bổ sung `cancelReason` vào `toPublicView` cho người mượn xem lý do; đồng bộ schema doc Phase 01 (`cancelReason`, `verifiedTokenHash`, `sendCount`/`windowStart`).
- **L1–L6**: Sử dụng hằng số `LIMITS`, guard `start()` idempotent, kiểm tra date hợp lệ, giới hạn ký tự `returnNote`, reset `isOverdue: false` khi trả xong.
- **Tests**: Thêm đầy đủ 6 test case còn thiếu, 100% tests cho module borrow (62/62) đều pass.

## Kết luận (lần 1)

**Chưa đạt.** Đủ endpoint, job và M1/M2 theo plan (đọc code thấy đúng). Còn 1 lỗi HIGH ở `confirm-return` làm mất dữ liệu phiếu và mất tồn kho (mục 2), nên phải sửa trước khi làm giao diện phase 05 — vì UI chốt trả sẽ gọi đúng endpoint này.

**Giới hạn của lần review này:** Shell của phiên bị treo (mọi lệnh Bash trả về rỗng), nên tôi **không chạy được `npx jest`**. Kết quả test dưới đây là đọc code, **chưa phải số liệu thật**. Checklist các mục [x] do agent tự đánh; cần chạy lại test để xác nhận.

| Hạng mục plan | Kết quả (đọc code) |
|---|---|
| §1 8 endpoint admin, gắn `verifyToken + requireRole(['admin','manager'])` | ✅ Đủ 8, `adminAuth` gắn cho tất cả. `counts` khai báo **trước** `requests/:id` nên không bị route `:id` nuốt |
| `toAdminView` ẩn `*Hash` | ✅ Xoá mọi key kết thúc bằng `Hash`; giữ `history`, che không áp dụng (đúng ý admin) |
| §2 `confirm-return` | ⚠️ H1 bên dưới; phần còn lại đúng (expectFrom 2 trạng thái, `0 ≤ receivedQty ≤ qty`, có note → `returned_with_issue`) |
| §3 job 4 bước | ✅ 4 bước đúng thứ tự, mỗi bước try/catch riêng, cờ `running`, ghi field nhắc **trước** khi gửi |
| Đăng ký job vào `index.js` | ✅ `start()` sau `reminderJob.start()`, `stop()` trong `gracefulShutdown` |
| §4.1 M1 transaction | ✅ `db.runTransaction` đọc → kiểm hạn → kiểm `attempts` → so mã → tăng `attempts`/xoá doc. Không lộ khác biệt giữa các trường hợp sai |
| §4.2 M2 không chờ email | ✅ `res.json` trước, `Promise.allSettled` sau; test 11b chặn đúng hành vi |
| Test | ❓ Chưa chạy được. Đọc code: 10 case admin + 6 case job + 3 case M1/M2 mới, phủ đúng danh sách plan |

## 1. Code đã đọc

`controllers/borrow-admin-controller.js`, `jobs/borrow-reminder-job.js`, `routes/borrow.js`, `controllers/borrow-public-controller.js` (§OTP), `services/borrow-transition-service.js`, `services/borrow-email-service.js`, `index.js`, `tests/borrow-admin.test.js`, `tests/borrow-reminder-job.test.js`, `tests/borrow-public.test.js`.

## 2. Lỗi

### H1 HIGH — `confirm-return` nhận `resourceId` trùng → mất món, mất tồn kho

[borrow-admin-controller.js:319-351](../../server/controllers/borrow-admin-controller.js#L319-L351) chỉ kiểm:

```js
if (!Array.isArray(items) || items.length !== currentItems.length) throw 400;
// rồi với từng item: nếu !origMap.has(item.resourceId) → 400
```

Không kiểm **tập `resourceId` gửi lên có đúng bằng tập của phiếu** và **không trùng**. Hệ quả với phiếu có 2 món `[loa qty 2, mic qty 1]`:

| Body gửi lên | Qua kiểm? | Kết quả |
|---|---|---|
| `[{loa,2},{mic,1}]` | ✅ | Đúng |
| `[{loa,2},{loa,0}]` | ✅ (dài 2, cả hai đều có trong `origMap`) | `mic` bị xoá khỏi `patch.items`; kho chỉ cộng `loa`; **mic đã trừ lúc duyệt không được hoàn** → mất 1 mic vĩnh viễn |
| `[{loa,2},{loa,2}]` | ✅ | Phiếu còn 2 dòng `loa`, `mic` mất; kho cộng 4 loa (nhiều hơn số đã trừ) |

Hiện chỉ admin/manager gọi được, nên không phải lỗi bị khai thác từ ngoài. Nhưng UI phase 05 truyền `items` từ state; một lần merge/bấm trùng là hỏng dữ liệu thật. Tồn kho sai **không tự phát hiện được** vì không còn dấu vết món đã mất.

Sửa: bắt buộc tập khớp và không trùng, trước khi tính `receivedQty`:

```js
const submittedIds = items.map((it) => it && it.resourceId);
const submittedSet = new Set(submittedIds);
const isExactSet =
    submittedIds.length === currentItems.length &&
    submittedSet.size === currentItems.length &&
    currentItems.every((ci) => submittedSet.has(ci.resourceId));
if (!isExactSet) {
    throw new HttpError(400, 'Danh sách thiết bị trả không khớp với phiếu (thiếu, thừa hoặc trùng mã)');
}
```

Với phiếu có 1 món thì đoạn kiểm trên cũng chặn trường hợp gửi 2 dòng cùng `resourceId`. Test cần thêm 3 case: thiếu món, thừa/trùng món, và đúng tập nhưng sai thứ tự (phải **qua**, vì `patch.items` ghép theo `resourceId`).

### M2 MEDIUM — Lọc `overdue` sau khi đã `limit` → trang bị thiếu, `nextCursor` sai

[borrow-admin-controller.js:63-89](../../server/controllers/borrow-admin-controller.js#L63-L89): query lấy `limit + 1` doc rồi mới lọc `isOverdue` bằng JS. Nếu trong 51 doc chỉ có 3 doc quá hạn, API trả 3 doc và **`nextCursor = null`** (vì `docs.length <= limit` sau khi lọc) → UI tưởng hết, trong khi còn phiếu quá hạn ở trang sau.

Sửa: khi `overdue=true`, thêm điều kiện `dueAt < nowIso` vào query (index `status + dueAt` đã có từ phase 01) và bỏ lọc JS; hoặc giữ lọc JS nhưng tính `nextCursor` từ **trang gốc** trước khi lọc và trả cờ `hasMore` riêng. Cách đầu đơn giản hơn và đúng nghĩa "quá hạn" theo `dueAt`.

### M3 MEDIUM — Lý do huỷ không tới được người mượn; schema plan lệch code

- `cancelRequest` ghi `patch: { cancelReason }`, `sendCancelled` đọc `req.cancelReason` → khớp trong code.
- Nhưng [toPublicView](../../server/controllers/borrow-public-controller.js#L14-L39) **không trả `cancelReason`** → người mượn mở `/borrow` thấy phiếu "Đã huỷ" mà không biết lý do (email có thể không tới, hoặc họ vào xem trên điện thoại).
- Schema phase 01 không có `cancelReason`, `verifiedTokenHash`, và tên field OTP là `sentCount`/`sentCountWindowStart` trong khi code dùng `sendCount`/`windowStart`.

Sửa: thêm `cancelReason` vào `toPublicView`; cập nhật schema trong [phase-01](../261104-1159-equipment-borrow-return/phase-01-data-model-and-stock.md) cho khớp code thật (3 field). Không đổi code phase 03 ngoài 1 dòng `toPublicView`.

### L1–L6 LOW (không chặn)

- **L1** — Job hardcode `3 * 24 * 3600 * 1000` và `24 * 3600 * 1000` thay vì dùng `LIMITS.APPROVED_STALE_MS` / `LIMITS.DUE_SOON_MS` đã khai trong `borrow-constants.js`. DRY; lệch số một chỗ là job và constants nói khác nhau.
- **L2** — `getRequests` nhận `status` tuỳ ý từ query: ≥ 31 giá trị sẽ vượt giới hạn `in` của Firestore → 500. Nên giới hạn và map sang danh sách status hợp lệ.
- **L3** — `cursor` không tồn tại (đã bị xoá) thì bị bỏ qua lặng lẽ, trả từ đầu danh sách → UI có thể lặp trang.
- **L4** — `transition()` không xoá `isOverdue` khi phiếu về `returned`/`returned_with_issue` → UI admin có thể hiện "Quá hạn" trên phiếu đã trả. Chỉ là hiển thị.
- **L5** — `confirmReturn` không giới hạn độ dài `returnNote` (chỉ `reject/cancel` có 3–500). Nên áp cùng quy tắc.
- **L6** — `BorrowReminderJob.start()` không chặn gọi 2 lần (sẽ có 2 interval). `stop()` đã an toàn.
- **L7** — `handover` không gửi email cho người mượn. Đúng plan (giao tại quầy), chỉ ghi để phase 05 không giả định có email.

## 3. Test còn thiếu

Đọc `borrow-admin.test.js` và `borrow-reminder-job.test.js`, các trường hợp chưa phủ:

1. `confirm-return` với `resourceId` trùng (H1) — quan trọng nhất.
2. `getRequests` với `overdue=true` và nhiều doc không quá hạn (M2).
3. `getRequestById` (404 khi không tồn tại).
4. `handover` và chuyển trạng thái sai (vd `pending → handed_over` → 409).
5. `reject`/`cancel` khi gửi email lỗi → vẫn `200` với `emailSent: false`.
6. Job bước 2 (`approved` quá 3 ngày) khi `approvedAt` thiếu → không được coi là quá hạn.

Test role (case 1) gọi thẳng `requireRole`, không qua router — giống ghi chú ở phase 01: chứng minh middleware chặn đúng, **không** chứng minh route đã gắn. Đọc `routes/borrow.js` thấy đã gắn `adminAuth` cho cả 8 route.

## Việc cần làm

1. [x] **H1** — sửa `confirmReturn` kiểm đúng tập `resourceId`, không trùng; thêm 3 test.
2. [x] **M2** — sửa lọc `overdue` (đưa vào query hoặc sửa `nextCursor`); thêm test.
3. [x] **M3** — thêm `cancelReason` vào `toPublicView`; cập nhật schema phase 01 (`cancelReason`, `verifiedTokenHash`, `sendCount`/`windowStart`).
4. [x] Chạy lại `npx jest` (người dùng chạy trên Windows, lệnh `npx jest 2>&1 | Select-Object -Last 30`). Kết quả: `Test Suites: 2 failed, 15 passed, 17 total`, `Tests: 17 failed, 151 passed, 168 total`. Số fail trùng baseline 17. Đoạn output đã dán không in tên 2 suite fail; nếu cần chắc chắn đó là `splitScreen.template.test.js` và `round2Bugs.test.js` thì chạy `npx jest 2>&1 | Select-String "FAIL"`.
5. [x] L1–L6, test bổ sung ở mục 3 (404 getRequestById, 409 handover sai status, email fail không 500, job handle missing approvedAt, start() idempotent).

## Câu hỏi chưa giải quyết

- Không có.
