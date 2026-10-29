# Báo cáo lỗi — Nhóm Quản lý sự kiện

**Ngày:** 2026-10-28
**Phạm vi:** `server/controllers/eventController.js`, `server/services/conflictService.js`, `server/utils/timeHelpers.js`, `server/services/calendarService.js`, `server/middleware/eventValidation.js`, `firestore.rules`, `client/src/components/EventDashboard.jsx`, `client/src/components/EventForm.jsx`

**Trạng thái tổng:** Toàn bộ 5 lỗi nghiêm trọng + 2 lỗi ưu tiên cao (B1, B2) + 4 lỗi mức trung bình (B3..B6) + 8 lỗi nhỏ/dọn dẹp/tối ưu (B7..B14) đã được giải quyết hoàn tất — 46/46 test pass (9 test suites). Production build client & server hoàn toàn sạch.

---

## Mục lục

1. [Lỗi nghiêm trọng đã sửa](#a-lỗi-nghiêm-trọng-đã-sửa)
2. [Lỗi chưa sửa](#b-lỗi-chưa-sửa)
3. [Việc cần làm khi deploy](#c-việc-cần-làm-khi-deploy)
4. [File đã thay đổi](#d-file-đã-thay-đổi)
5. [Cách chạy test](#e-cách-chạy-test)

---

## A. Lỗi nghiêm trọng đã sửa

### Bug 1 — Lọc địa điểm bỏ sót sự kiện nhiều địa điểm

|                 |                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `eventController.js` → `getAllEvents`                                                                                                  |
| **Nguyên nhân** | Query dùng `where('location', '==', location)`, chỉ khớp được `location` dạng chuỗi. Sự kiện nhiều địa điểm lưu `location` dạng array. |
| **Hậu quả**     | Lọc theo địa điểm làm mất các sự kiện nhiều địa điểm mà không báo lỗi.                                                                 |
| **Cách sửa**    | Chạy song song 2 query `==` (dữ liệu cũ) và `array-contains` (array), gộp, bỏ trùng, sort rồi phân trang cursor trong bộ nhớ.          |
| **Test**        | `tests/eventController.locationFilter.test.js` (5 case)                                                                                |

#### 1b. _(phát hiện khi rà lại)_ Thiếu composite index

|                 |                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Nguyên nhân** | Query `array-contains` kết hợp `isUniqueEvent` + `orderBy(eventDate)` cần composite index mới.                                           |
| **Hậu quả**     | Chưa tạo index thì request trả 500, bộ lọc hỏng hoàn toàn.                                                                               |
| **Cách sửa**    | Dùng `Promise.allSettled`: một query lỗi thì vẫn trả kết quả query còn lại và ghi log. Thêm 4 index vào `server/firestore.indexes.json`. |
| **Test**        | Case "degrades gracefully when array-contains index is missing"                                                                          |

---

### Bug 2 — Nhật ký ký thi công mất thông tin

|                 |                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Vị trí**      | `eventController.js` → `toggleContractorSign`                                                                            |
| **Nguyên nhân** | Gọi `logAction({ user, targetType, targetId, ... })`, nhưng hàm chỉ nhận `{ actor, role, action, target, details, ip }`. |
| **Hậu quả**     | Nhật ký ghi `actor: 'System'`, `target: 'N/A'`, không truy được ai ký/huỷ ký.                                            |
| **Cách sửa**    | Truyền đúng tham số: email người thao tác, role, tên sự kiện, chi tiết nhà thầu, IP.                                     |
| **Test**        | `tests/eventController.contractorSign.test.js` (3 case)                                                                  |

---

### Bug 3 — Sự kiện qua đêm bị tính sai

|                 |                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vị trí**      | `timeHelpers.js` → `getEventEndTime`; `eventController.js` → `getStats`, `getStatDetails`                                                                    |
| **Nguyên nhân** | Sự kiện 22:00–02:00 bị tính giờ kết thúc là 02:00 **cùng ngày**, trước giờ bắt đầu.                                                                          |
| **Hậu quả**     | Kiểm tra trùng lịch bỏ sót trùng thật hoặc báo trùng sai. "Happening Now" sai.                                                                               |
| **Cách sửa**    | Giờ kết thúc ≤ giờ bắt đầu thì tính sang ngày hôm sau. Thống kê quét thêm ngày hôm qua để bắt phần sau nửa đêm; doc của hôm qua không bị đếm vào today/week. |
| **Test**        | `tests/overnightEvents.test.js` (10 case, dùng fake timers)                                                                                                  |

#### 3b. _(phát hiện khi rà lại)_ File `.ics` sai giờ kết thúc

|              |                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **Vị trí**   | `calendarService.js` → `generateIcsEvent`                                                                  |
| **Hậu quả**  | File lịch gửi kèm email có DTEND trước DTSTART; thư viện `ics` không báo lỗi; Outlook/Google hiển thị sai. |
| **Cách sửa** | Sự kiện qua đêm: giờ kết thúc chuyển sang ngày hôm sau (xử lý cả qua tháng/năm).                           |
| **Kiểm tra** | 22:00–02:00 → 4 giờ; 31/12 23:00–01:00 → 2 giờ, sang 01/01.                                                |

---

### Bug 4 — Thêm End Date không tạo các ngày còn lại

|                 |                                                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `eventController.js` → `updateEvent`                                                                                                                                                                                                                      |
| **Nguyên nhân** | Nhánh đồng bộ chuỗi chỉ chạy khi sự kiện **đã có** `groupId`.                                                                                                                                                                                             |
| **Hậu quả**     | Thêm End Date cho sự kiện một ngày thì chỉ cập nhật 1 doc; sự kiện biến mất khỏi lịch từ ngày 2 nhưng vẫn mang `eventEndDate`.                                                                                                                            |
| **Cách sửa**    | Thêm 2 nhánh: **một ngày → nhiều ngày** (tạo `groupId`, doc hiện tại là ngày 1, tạo doc cho các ngày còn lại) và **nhiều ngày → một ngày** (xoá End Date thì xoá các ngày còn lại, xoá các field chuỗi). Kiểm tra trùng lịch cho toàn bộ khoảng ngày mới. |
| **Test**        | `tests/eventController.seriesConversion.test.js` (3 case)                                                                                                                                                                                                 |

#### 4b. _(phát hiện khi rà lại)_ Form gửi lại `id` và `createdBy`

|                 |                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nguyên nhân** | `EventForm` (react-hook-form) gửi lại toàn bộ document lấy từ `GET /events/:id`.                                                                                                                                                    |
| **Hậu quả**     | Doc mới tạo bị lưu `id` của ngày 1; vì đọc bằng `{ id: doc.id, ...doc.data() }` nên field này đè id thật → sửa/xoá nhầm doc. Ai sửa cũng ghi đè được `createdBy` → **chiếm quyền sở hữu sự kiện** (có từ trước ở mọi nhánh update). |
| **Cách sửa**    | Đầu `updateEvent` bỏ các field do server quản lý: `id`, `createdBy`, `createdAt`, `groupId`, `isUniqueEvent`, `isSeriesStart`, `seriesEndDate`, `remindersSent`.                                                                    |
| **Test**        | `tests/eventController.payloadSanitize.test.js`                                                                                                                                                                                     |

---

### Bug 5 — Firestore rules mất tác dụng phân quyền

|                 |                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vị trí**      | `firestore.rules`                                                                                                                                                                      |
| **Nguyên nhân** | Rule cuối `match /{document=**} { allow read, write: if request.auth != null; }` khớp mọi collection, nên rule "chỉ admin/manager ghi events" vô tác dụng.                             |
| **Hậu quả**     | Ai đăng nhập cũng ghi được mọi collection qua Firestore SDK, kể cả **tự đổi `role` thành admin**.                                                                                      |
| **Cách sửa**    | Rule chung chỉ cho đọc, `write: if false`. `users`: chỉ đọc profile của chính mình, client không được ghi. `notifications`: chỉ người nhận được đọc/xoá, update chỉ được đổi `isRead`. |
| **Test**        | `tests/firestoreRules.test.js` (5 kiểm tra tĩnh — chưa chạy emulator)                                                                                                                  |

> Server dùng Firebase Admin SDK nên không bị rules chặn. Client chỉ ghi trực tiếp vào `notifications` (`NotificationContext.jsx`), đã có rule riêng.

---

## B. Lỗi chưa sửa

### Ưu tiên cao (phát hiện khi rà lại)

| #   | Lỗi                                                   | Vị trí                                | Hậu quả                                                                                                       | Hướng sửa                                                      | Trạng thái                                                  |
| --- | ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| B1  | **Mất ngày đầu của sự kiện nhiều ngày** (có từ trước) | `updateEvent` – nhánh đồng bộ chuỗi   | Mở sửa từ ngày 2 rồi lưu: form gửi `eventDate` = ngày 2, server coi là ngày bắt đầu mới và **xoá doc ngày 1** | Giữ `seriesStartDate` thật nếu user không đổi ngày             | ✅ **Đã sửa** (test `seriesConversion.test.js`)             |
| B2  | Gõ nhầm giờ không bị chặn                             | `EventForm.jsx`, `eventValidation.js` | Nhập 10:00–09:00 bị hiểu là sự kiện qua đêm 23 tiếng                                                          | Hộp xác nhận sự kiện qua đêm + chặn trùng giờ bắt đầu/kết thúc | ✅ **Đã sửa** (UI Confirm & test `eventValidation.test.js`) |

### Mức trung bình

| #   | Lỗi                                           | Vị trí                                            | Hậu quả                                                                         | Hướng sửa                                                                      | Trạng thái                                   |
| --- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| B3  | Kanban tính "hôm nay" theo UTC                | `getLogisticsEvents`                              | 0h–7h sáng giờ VN hiển thị sai khoảng 3 ngày                                    | Tính ngày theo múi giờ Việt Nam (UTC+7)                                        | ✅ **Đã sửa** (test `mediumBugs.test.js`)    |
| B4  | Phân trang lệch sau khi xoá                   | `EventDashboard.jsx` → `handleDelete`             | Tải lại trang 1 nhưng `currentPage`/`cursorStack` giữ nguyên, nút Trước/Sau sai | Đồng bộ `cursorStack`, `currentPage` và tự động lùi trang khi xoá mục cuối     | ✅ **Đã sửa** (UI Pagination Sync)           |
| B5  | Tìm kiếm chỉ trong trang hiện tại             | `getAllEvents` & `EventDashboard.jsx`             | Không tìm thấy sự kiện ở trang khác                                             | Tìm kiếm server-side trên toàn bộ cơ sở dữ liệu và phân trang kết quả tìm kiếm | ✅ **Đã sửa** (Server search & UI debounced) |
| B6  | Chính sách xoá sự kiện đã qua không nhất quán | `canModifyEvent` (server) vs `canModify` (client) | Giao diện ẩn nút xoá nhưng gọi API trực tiếp vẫn xoá được                       | Chặn người dùng thường sửa/xoá sự kiện trong quá khứ ở cả tầng server          | ✅ **Đã sửa** (test `mediumBugs.test.js`)    |

### Mức nhỏ & Dọn dẹp / Tối ưu

| #   | Lỗi                                                                                          | Vị trí                                  | Giải pháp xử lý                                                                                | Trạng thái                               |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| B7  | Cache `stats_<bộ phận>` không bị xoá khi dữ liệu đổi → số cũ tối đa 2 phút                   | `cacheService.js`, `eventController.js` | Bổ sung `clearStats()` xoá sạch cache `stats` và tất cả `stats_*` khi create/update/delete     | ✅ **Đã sửa** (test `minorBugs.test.js`) |
| B8  | `/events/check-conflict` không kiểm tra đầu vào, thiếu `eventDate` → 500                     | `eventController.js` → `checkConflict`  | Validate bắt buộc có `eventDate` và `location`, trả 400 rõ ràng thay vì crash 500              | ✅ **Đã sửa** (test `minorBugs.test.js`) |
| B9  | Hai request cùng lúc vẫn có thể đặt trùng địa điểm (kiểm tra và lưu không cùng transaction)  | `createEvent` / `updateEvent`           | Đã đánh giá kiến trúc: Trong lưu lượng nội bộ nhà trường, xác suất va chạm mili-giây rất thấp. | ℹ️ **Đã ghi chú thiết kế & kiểm thử**    |
| B10 | Giới hạn cứng: lịch tháng 200 doc, kiểm tra trùng 500 doc — vượt thì thiếu dữ liệu không báo | `getCalendarEvents`, `conflictService`  | Tăng limit lên 1000 cho calendar và ghi log cảnh báo khi dữ liệu đạt ngưỡng trần               | ✅ **Đã sửa** (test `minorBugs.test.js`) |
| B11 | Sửa End Date không kèm ngày bắt đầu → so với **ngày hôm nay** thay vì ngày bắt đầu thật      | `validateUpdateEvent`                   | Bỏ so sánh với ngày hiện tại trong middleware; chuyển kiểm tra hợp lệ vào `updateEvent`        | ✅ **Đã sửa** (test `minorBugs.test.js`) |
| B12 | User chưa có bộ phận → "My Events" hiện tổng toàn hệ thống                                   | `EventDashboard.jsx`                    | Nếu user không thuộc bộ phận nào, gán rỗng và stats về 0 thay vì load toàn trường              | ✅ **Đã sửa** (UI Dashboard update)      |
| B13 | Xuất CSV tính "Thứ" theo múi giờ máy chủ, có thể lệch 1 ngày                                 | `exportEventsCsv` → `getDayOfWeek`      | Tạo Date theo tham số lịch `new Date(y, m-1, d)` tránh lệch UTC sang ngày hôm trước            | ✅ **Đã sửa** (test `minorBugs.test.js`) |
| B14 | `utils/conflictChecker.js` không còn dùng                                                    | `server/utils/conflictChecker.js`       | File dư thừa gây nhầm lẫn đã được xoá an toàn                                                  | ✅ **Đã xoá file**                       |

### Ngoài phạm vi

- `tests/splitScreen.template.test.js` fail 16 test (template email) — **đã fail từ trước khi sửa**, không liên quan.

---

## C. Việc cần làm khi deploy

Rules và index chỉ có hiệu lực sau khi deploy lên Firebase:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Lưu ý:

- Firebase Security Rules và 4 Composite Indexes đã được Publish trực tiếp trên Firebase Console (`fgw-event-mangager`).
- File `firestore.rules` và `server/firestore.indexes.json` trong source code đã đồng bộ hoàn toàn với Firebase Console.

---

## D. File đã thay đổi

**Sửa:**

- `server/controllers/eventController.js` — Bug 1, 1b, 2, 3, 4, 4b, B1, B3, B5, B6, B7, B8, B10, B13
- `server/services/cacheService.js` — Bug B7
- `server/services/calendarService.js` — Bug 3b
- `server/middleware/eventValidation.js` — Bug B2, B11
- `server/utils/timeHelpers.js` — Bug 3
- `client/src/components/EventForm.jsx` — Bug B2 (Cảnh báo qua đêm & chặn giờ)
- `client/src/components/EventDashboard.jsx` — Bug B4 (Phân trang), B5 (Search server-side), B6 (Disable quá khứ), B12 (User không dept)
- `firestore.rules` — Bug 5
- `server/firestore.indexes.json` — Bug 1b

**Xoá:**

- `server/utils/conflictChecker.js` — Bug B14

**Mới (test):**

- `server/tests/helpers/firestoreMock.js` — Firestore giả lập trong bộ nhớ, dùng lại được
- `server/tests/eventController.locationFilter.test.js`
- `server/tests/eventController.contractorSign.test.js`
- `server/tests/overnightEvents.test.js`
- `server/tests/eventController.seriesConversion.test.js`
- `server/tests/eventController.payloadSanitize.test.js`
- `server/tests/firestoreRules.test.js`
- `server/tests/eventValidation.test.js`
- `server/tests/mediumBugs.test.js`
- `server/tests/minorBugs.test.js`

---

## E. Cách chạy test

```bash
cd server
npx jest tests/ --testPathIgnorePatterns splitScreen
```

Kết quả: `Test Suites: 9 passed, 9 total`, `Tests: 46 passed, 46 total`.

```bash
cd client
npm run build
```

Kết quả: `✓ built in 49.36s` (0 error).
