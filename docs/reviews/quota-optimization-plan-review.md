# Báo cáo Review: Kế hoạch Tối ưu Firebase Quota
**Ngày review:** 2026-04-15  
**Reviewer:** Code Reviewer Agent  
**Scope:** Implementation Plan "Tối ưu hóa Firebase Quota (Sustainability 150 Users)"

---

## Đánh giá tổng thể: 🟡 CÓ KHẢ NĂNG THỰC HIỆN, NHƯNG CẦN BỔ SUNG ĐÁNG KỂ

Bản kế hoạch đi đúng hướng (Server-side Caching + Job Tuning), nhưng còn **thiếu sót quan trọng** về phạm vi bao phủ và chi tiết kỹ thuật. Nếu chỉ thực hiện đúng theo bản kế hoạch hiện tại, hệ thống sẽ vẫn có thể bị vượt quota trong một số tình huống.

---

## 🔴 Critical (Phải sửa trước khi triển khai)

### C-1: Kế hoạch thiếu mục Reminder Job & Email Worker
**Vấn đề:** Bản kế hoạch v2 (sau khi cập nhật Smart Invalidation) đã **vô tình xóa mất** phần quan trọng nhất — giãn tần suất Reminder Job (5p → 30p) & Email Worker (60s → 5p). Hai thay đổi này chiếm **~70% hiệu quả tiết kiệm toàn bộ kế hoạch**.

**Tác hại nếu bỏ sót:** Reminder Job vẫn chạy 288 lần/ngày, Email Worker chạy 1.440 lần/ngày → Quota vẫn hết dù có thêm Cache.

**Đề xuất:** Bổ sung lại mục [MODIFY] `reminderJob.js` và `emailQueueWorker.js` vào bản kế hoạch.

---

### C-2: Thiếu Cache cho `getStats()` — API Dashboard Stats
**Vấn đề:** API `/api/events/stats` (`eventController.getStats`) chạy query `eventDate IN [8 ngày]` mỗi lần load Dashboard. Với 150 người mở Dashboard cùng lúc, đây sẽ là 150 query lớn, nhưng bản kế hoạch **không đề cập đến endpoint này**.

**Tác hại nếu bỏ sót:** Mỗi lần load EventDashboard sẽ vẫn tốn ~50-100 reads cho phần stats, không được cache.

**Đề xuất:** Bổ sung `getStats` vào danh sách các endpoint cần dùng CacheService (TTL 2 phút, invalidate khi có create/update/delete).

---

## 🟠 High (Nên sửa trước khi triển khai)

### H-1: Cache Stampede Risk (Hiện tượng "Đổ xô" vào Firebase)
**Vấn đề:** Khi cache bị invalidate, nếu 150 người cùng gửi request đồng thời (ví dụ sau khi vừa tạo sự kiện), server sẽ nhận 150 request cùng lúc, tất cả đều thấy "cache rỗng" → tất cả đều gọi Firestore cùng lúc → 150 query giống hệt nhau → Tốn gấp 150 lần.

**Đề xuất:** Thêm cơ chế "**Mutex / Promise Dedup**" vào CacheService: Nếu một request đã đang đi lấy dữ liệu từ Firestore, các request sau sẽ đợi request đầu tiên xong, rồi dùng chung kết quả. 

```js
// Ý tưởng:
if (this._pending[key]) return this._pending[key]; // Đợi request đang chạy
this._pending[key] = fetchFromFirestore();
const result = await this._pending[key];
delete this._pending[key];
return result;
```

---

### H-2: Export Job & Backup Controller chưa được đề cập  
**Vấn đề:**
- `exportJob.js` chạy `eventsCollection.get()` (TOÀN BỘ collection) lúc khởi động server.
- `backupController.js` cũng đọc **4 collection đầy đủ** khi user bấm Backup.

**Đề xuất:**
- Export Job: Thêm filter `.where('eventDate', '>=', đầu_năm)` để chỉ lấy events năm hiện tại.
- Backup Controller: Không cần cache (hiếm khi dùng), nhưng nên ghi log cảnh báo quota trước khi thực hiện.

---

### H-3: Import Controller — "Sát thủ Quota" tiềm ẩn
**Vấn đề:** `importController.getTemplate()` chạy **4 query song song**: locations, departments, users, resources — Mỗi lần tải template Excel.

**Đề xuất:** Dùng CacheService cho `getTemplate()` để tránh 4 reads mỗi lần.

---

## 🟡 Medium (Cần cải thiện)

### M-1: Thiếu hướng dẫn xử lý khi Cache invalidate nhưng Firestore chưa hết Quota
**Vấn đề:** Nếu user xóa cache (invalidate) nhưng Firebase đang bị RESOURCE_EXHAUSTED, server sẽ crash/trả lỗi 500 vì không lấy được dữ liệu mới.

**Đề xuất:** CacheService cần có cơ chế "**Stale-While-Revalidate**": Nếu fetch mới thất bại, trả về dữ liệu cũ (cache hết hạn) thay vì lỗi.

---

### M-2: Chưa invalidate cache khi thay đổi Metadata 
**Vấn đề:** Kế hoạch chỉ đề cập invalidate khi Tạo/Sửa/Xóa **sự kiện**. Nhưng nếu user thêm mới phòng ban, thêm địa điểm, hoặc thêm vật tư, cache metadata cũng cần được invalidate.

**Đề xuất:** Thêm `cacheService.invalidate('metadata')` vào:
- `departmentController.createDepartment`, `updateDepartment`, `deleteDepartment`
- `locationController.createLocation`, `updateLocation`, `deleteLocation`
- `resourceController.createResource`, `updateResource`, `deleteResource`

---

### M-3: ConflictService & Conflict Check khi tạo sự kiện
**Vấn đề:** `conflictService.checkConflict()` quét events 3 ngày (yesterday, today, tomorrow) mỗi lần tạo hoặc sửa sự kiện — tối đa 500 docs. Nếu người dùng nhập hàng loạt 10 sự kiện, mỗi sự kiện check conflict riêng → 5.000 reads.

**Đề xuất:** Xem xét cache "daily events" có TTL ngắn (1 phút) cho conflict check, hoặc batch conflict check cho import.

---

## 🟢 Low (Quan sát)

### L-1: Deptcontacts hardcoded trong analyticsController
Dữ liệu `deptContacts` (Line 347-352) đang được hardcode trực tiếp. Nên chuyển sang đọc từ database hoặc config file (tận dụng cache).

### L-2: RetentionService chạy ngay khi khởi động
`retentionService` tự chạy cleanup sau 1 phút khi server khởi động. Nếu server restart nhiều lần (dev mode), sẽ tốn quota không cần thiết.

---

## ✅ Quan sát tích cực (Positive Observations)
1. **Đúng hướng chiến lược:** Server-side caching + Smart Invalidation là phương pháp đúng đắn nhất cho quy mô 150 user trên gói Free.
2. **Metadata Counter đã có sẵn:** File `metadata/stats.totalUniqueEvents` đã tồn tại — có thể mở rộng để lưu thêm các chỉ số thống kê pre-computed.
3. **API Batching có tiềm năng lớn:** Gộp 3 API (dept/loc/res) thành 1 sẽ giảm latency cho user và giảm overhead kết nối HTTP.

---

## Recommended Actions (Top 3 ưu tiên)

1. **🔴 Bổ sung lại mục Reminder Job & Email Worker vào kế hoạch** — Nếu thiếu mảnh ghép này, anh sẽ vẫn bị hết quota hàng ngày bất chấp Cache.
2. **🔴 Thêm Cache cho `getStats()` endpoint** — Đây là API được gọi mỗi lần load Dashboard, ảnh hưởng trực tiếp đến 150 user.
3. **🟠 Thiết kế CacheService với Promise Dedup + Stale-While-Revalidate** — Bảo vệ server khỏi hiện tượng stampede và đảm bảo không bao giờ trả lỗi 500 cho user khi Firebase hết quota.
