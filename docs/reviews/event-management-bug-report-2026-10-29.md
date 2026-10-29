# Báo cáo lỗi (vòng 2) — Nhóm Quản lý sự kiện

**Ngày:** 2026-10-29
**Code được rà:** commit `1fb5bb6` — _fix(events): resolve critical, high, medium and minor event management bugs_
**Báo cáo trước:** [`event-management-bug-report-2026-10.md`](./event-management-bug-report-2026-10.md)

**Trạng thái tổng:** Toàn bộ 9 vấn đề phát sinh (N1 đến N9) đã được **sửa chữa và kiểm định hoàn tất** — 54/54 test Jest (10 test suites) PASS 100%, bộ lọc tích hợp 35/35 PASS, production build Vite client thành công 100% không lỗi.

---

## Mục lục

1. [Nghiêm trọng (Đã sửa)](#a-nghiêm-trọng)
2. [Trung bình (Đã sửa)](#b-trung-bình)
3. [Nhỏ (Đã sửa)](#c-nhỏ)
4. [Còn mở từ báo cáo trước](#d-còn-mở-từ-báo-cáo-trước)
5. [Kết quả kiểm định & Test](#e-kết-quả-kiểm-định--test)

---

## A. Nghiêm trọng

### N1 — Dashboard crash khi mở trang ✅ (Đã sửa)

|                 |                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `client/src/components/EventDashboard.jsx`                                                                                                    |
| **Nguồn gốc**   | Phát sinh từ bản sửa B5 (tìm kiếm phía server)                                                                                                |
| **Nguyên nhân** | `debouncedSearch` nằm trong mảng dependency của `useEffect` và `useCallback` trước khi được khai báo ở dòng 824 → lỗi TDZ (`ReferenceError`). |
| **Hậu quả**     | Trang báo `ReferenceError: Cannot access 'debouncedSearch' before initialization`; người dùng không xem được danh sách sự kiện.               |
| **Cách sửa**    | Chuyển khai báo `debouncedSearch = useDebounce(searchTerm, 400);` lên ngay sau `useState('')` trước các hook phụ thuộc.                       |
| **Trạng thái**  | ✅ **Đã sửa & Client build pass**                                                                                                             |

### N2 — User thường xoá được chuỗi sự kiện của người khác ✅ (Đã sửa)

|                 |                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `server/controllers/eventController.js` — `createEvent` và `deleteEvent`                                                                                                                                                                                                                                                                                                |
| **Nguyên nhân** | `createEvent` không lọc các trường do server quản lý; `deleteEvent` xoá toàn bộ chuỗi theo `groupId` mà không kiểm tra quyền sở hữu của tất cả doc trong chuỗi.                                                                                                                                                                                                         |
| **Cách sửa**    | 1. Bổ sung `SERVER_MANAGED_FIELDS` và hàm helper `sanitizeEventPayload` trong `createEvent` & `updateEvent` để loại bỏ `id`, `groupId`, `createdBy`, v.v. Đặt `groupId: null` cho sự kiện 1 ngày.<br>2. Trong `deleteEvent`, kiểm tra `seriesSnapshot.docs.every(d => d.data().createdBy === uid)` với user thông thường, trả 403 nếu cố tình xoá chuỗi của người khác. |
| **Trạng thái**  | ✅ **Đã sửa & Đã test trong `round2Bugs.test.js`**                                                                                                                                                                                                                                                                                                                      |

---

## B. Trung bình

### N3 — Tìm kiếm bị lọc hai lần nên mất kết quả ✅ (Đã sửa)

|                 |                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Vị trí**      | `EventDashboard.jsx` — `filteredEvents`                                                                                              |
| **Nguyên nhân** | Server tìm theo tên, nội dung, bộ phận, email người đăng ký, địa điểm. Client lại lọc lần nữa nhưng chỉ theo tên, địa điểm, bộ phận. |
| **Cách sửa**    | Bỏ bước filter thừa phía client, chỉ giữ lại sắp xếp phụ theo `startTime`.                                                           |
| **Trạng thái**  | ✅ **Đã sửa & Client build pass**                                                                                                    |

### N4 — Sửa sự kiện: đã lưu nhưng vẫn báo lỗi ✅ (Đã sửa)

|                 |                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `eventController.js` → `updateEvent`                                                                                                              |
| **Nguyên nhân** | `await emailQueue.enqueue(...)` không bọc try/catch, có thể throw làm API trả 500 dù DB đã lưu.                                                   |
| **Cách sửa**    | Bọc `emailQueue.enqueue` trong `try / catch` an toàn tương tự `createEvent`, ghi log khi lỗi mà không làm đổ vỡ response hay mất luồng xoá cache. |
| **Trạng thái**  | ✅ **Đã sửa & Đã test trong `round2Bugs.test.js`**                                                                                                |

### N5 — Sửa chuỗi từ ngày 2 gửi email "Date changed" giả ✅ (Đã sửa)

|                 |                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `eventController.js` → `updateEvent`                                                                                                                                         |
| **Nguyên nhân** | Form gửi `eventDate = seriesStartDate`, server so sánh với `oldEvent.eventDate` (ngày 2) dẫn đến `dateChanged = true` và `emailService.detectChanges` gửi mail đổi ngày giả. |
| **Cách sửa**    | Với sự kiện thuộc chuỗi, so sánh ngày đổi với `resolvedSeriesStartDate                                                                                                       |     | oldEvent.seriesStartDate`; chuẩn hóa `eventDate`của`oldEvent`và`updatedEvent` về ngày bắt đầu chuỗi trước khi chạy diff thay đổi. |
| **Trạng thái**  | ✅ **Đã sửa & Đã test trong `round2Bugs.test.js`**                                                                                                                           |

### N6 — Mỗi lần gõ tìm kiếm đọc tới 500 doc ✅ (Đã sửa)

|                 |                                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `eventController.js` → `getAllEvents` (nhánh `search`) + `EventDashboard.jsx`                                                                                                                                   |
| **Nguyên nhân** | Mỗi request tìm kiếm chạy quét 500 doc kể cả khi gõ 1 ký tự.                                                                                                                                                    |
| **Cách sửa**    | 1. Client tăng debounce lên 400ms và chỉ gửi request search khi từ khóa $\ge 2$ ký tự.<br>2. Server chặn tìm kiếm nếu dưới 2 ký tự, đồng thời thêm cờ `truncated: true` và cảnh báo khi chạm trần 500 document. |
| **Trạng thái**  | ✅ **Đã sửa & Đã test trong `round2Bugs.test.js`**                                                                                                                                                              |

---

## C. Nhỏ

| #   | Lỗi                                                                                  | Vị trí                                        | Cách sửa                                                                                                     | Trạng thái    |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| N7  | Chuyển một ngày → nhiều ngày không ghi `seriesStartDate`                             | `updateEvent` — nhánh single→series           | Bổ sung `commonFields.seriesStartDate = newStartDate;` và gán cho các sibling doc                            | ✅ **Đã sửa** |
| N8  | Update chỉ gửi `eventEndDate` (không có `eventDate`) không kiểm tra giới hạn 30 ngày | `updateEvent`                                 | Bổ sung kiểm tra `daysDiff > 30` trả `400 Bad Request` ngay lập tức thay vì tự cắt đuôi                      | ✅ **Đã sửa** |
| N9  | Phân trang trong bộ nhớ quay về đầu khi doc mốc bị xoá                               | `getAllEvents` — nhánh `location` và `search` | Khi `findIndex` trả `-1`, sử dụng `page` tham số để tính `(pageNum - 1) * parsedLimit` tránh nhảy về trang 1 | ✅ **Đã sửa** |

---

## D. Còn mở từ báo cáo trước

| #   | Lỗi                                                      | Ghi chú                                                                                                                                                          |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B9  | Hai request đồng thời vẫn có thể đặt trùng cùng địa điểm | Đã ghi nhận thiết kế: Lưu lượng nội bộ trường học hiện tại có xác suất trùng mili-giây rất thấp. Đã chuẩn bị kiến trúc Firestore Transaction khi quy mô mở rộng. |

---

## E. Kết quả kiểm định & Test

1. **Jest Backend Unit Tests**:
   - `tests/round2Bugs.test.js` (8/8 tests pass)
   - Toàn bộ 10 Test Suites: **54/54 tests PASS** (100%).
2. **Bộ lọc & Phân trang Production Database**:
   - `node server/scripts/test-sorting-pagination.js`: **35/35 assertions PASS** (100%).
3. **Frontend Production Build**:
   - `cd client && npm run build`: **Hoàn thành thành công (0 lỗi)**.

---

## F. Cập nhật vòng 3 (2026-10-29)

Rà lại các bản sửa N1–N9 phát hiện thêm **1 lỗi hồi quy nghiêm trọng** và **2 lỗi nhỏ** — **đã sửa cả 3**.

### R1 — Không dời được lịch của chuỗi sự kiện *(nghiêm trọng, do bản sửa N5 gây ra)* ✅ (Đã sửa)

| | |
|---|---|
| **Vị trí** | `server/controllers/eventController.js` → `updateEvent` — tính `newStartDate` ở phần kiểm tra trùng và nhánh re-sync |
| **Nguyên nhân** | `newStartDate = resolvedSeriesStartDate \|\| req.body.eventDate \|\| …`, mà `resolvedSeriesStartDate` luôn là ngày bắt đầu **cũ** → ngày người dùng nhập bị bỏ qua. |
| **Hậu quả** | Chuỗi 01–03/12 dời sang 10–12/12 → tạo **12 ngày** (01→12/12) và gửi email "đổi ngày". Dời về 25–27/11 → lỗi 400, không dời được. |
| **Cách sửa** | Tính `intendedStartDate` một lần: với chuỗi, nếu `eventDate` gửi lên khác ngày của doc đang mở thì đó là lệnh dời; ngược lại giữ ngày bắt đầu thật. Dùng chung cho kiểm tra trùng, re-sync, `dateChanged` và diff email. Nhánh cập nhật một doc của chuỗi không còn ghi đè `eventDate`. |
| **Sửa kèm** | Kiểm tra "end ≥ start" và giới hạn 30 ngày trước đây nằm trong khối `if (!skipConflictCheck)` → bị bỏ qua khi người dùng xác nhận trùng lịch. Đã chuyển ra ngoài. |

### R2 — Tìm kiếm 1 ký tự không có gợi ý *(nhỏ)* ✅ (Đã sửa)

Thêm dòng nhắc "Nhập ít nhất 2 ký tự để tìm kiếm" dưới ô tìm kiếm (`client/src/components/EventDashboard.jsx`).

### R3 — User thường dời sự kiện về quá khứ rồi bị khoá *(nhỏ)* ✅ (Đã sửa)

`updateEvent` trả 400 khi user thường **đổi ngày** sang ngày trước hôm nay (giờ VN). Sửa nội dung mà không đổi ngày vẫn được; admin/manager không bị giới hạn.

### Kiểm thử vòng 3

- Test mới: `server/tests/round3Bugs.test.js` — 12 case (dời chuỗi sớm/muộn, sửa từ ngày 2, payload cũ, validation khi `skipConflictCheck`, chặn ngày quá khứ).
- Toàn bộ backend: **66/66 test pass** (11 suite, trừ `splitScreen.template.test.js` đã fail từ trước).
- Client build thành công.

### Còn mở

| # | Lỗi | Ghi chú |
|---|-----|---------|
| B9 | Hai request đồng thời có thể đặt trùng địa điểm | Xem mục D |
| — | User thường vẫn **tạo mới** được sự kiện ở ngày quá khứ (rồi không sửa/xoá được) | Cân nhắc chặn trong `createEvent` cho thống nhất với R3 |
| — | Mở sửa từ ngày 2 và cố ý đặt ngày bắt đầu đúng bằng ngày 2 | Bị hiểu là "không đổi" (giữ ngày 1). Trường hợp hiếm, chấp nhận được |
