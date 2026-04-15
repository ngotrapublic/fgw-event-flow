# Báo Cáo Kiểm Tra Hệ Thống Chuyên Sâu (System Review Report)
> **Ngày thực hiện:** 13/04/2026
> **Mục tiêu:** Rà soát Hiệu suất, Bảo mật, Quota Database và Chất lượng Code.

## 1. Tổng quan Đánh giá (Overall Assessment)
Hệ thống Event Management hiện tại có kiến trúc tốt, chia tách rạch ròi Client/Server, sử dụng React (Vite) và Node.js + Firebase.
Các tính năng UI phong phú. Tuy nhiên, theo thời gian, một số vấn đề về **Database Fetching (Truy vấn CSDL)** và **Linting** đã xuất hiện, đặc biệt là các thói quen "Over-fetching" dẫn tới phung phí Quota Firebase.

---

## 2. Các Lỗi Nghiêm Trọng & Rủi Ro Cao (🔴 & 🟠)

### 🔴 Firebase Quota Exhaustion (Vừa khắc phục)
- **Vị trí:** `server/jobs/reminderJob.js` và `emailQueueWorker.js`
- **Mô tả:** Các background job được khởi tạo bằng `setInterval` nhưng lại quét toàn bộ Collection (`.get()`) hoặc chạy không có giới hạn ngắt thời gian, khiến Database cạn sạch 50k reads/ngày.
- **Tình trạng:** **Đã xử lý (Fixed)** - Đã gài `.where('eventDate', '>=', todayStr)` và giảm tần suất xuống 5 phút/lần.

### 🟠 Vấn đề N+1 Reads trong Xác thực (Auth)
- **Vị trí:** `server/middleware/authMiddleware.js` (Hàm `requireRole`)
- **Mô tả:** Mỗi khi có 1 API call cần kiểm tra quyền (Admin/User), middleware lại gọi `db.collection('users').doc(uid).get()`. Cứ tưởng tượng Dashboard có 4 thẻ thống kê + 1 bảng danh sách = 5 requests song song $\rightarrow$ 5 lần read DB vô nghĩa liên tục lặp lại.
- **Khuyến nghị Giải pháp:** 
  1. Dùng **Firebase Custom Claims** để nhét luôn Roles vào Auth Token.
  2. *Hoặc* đơn giản hơn là dùng thư viện `node-cache` (Memory Cache) để lưu tạm Role của Auth trong 15-30 phút.

---

## 3. Các Vấn đề Trung bình & Cảnh báo (🟡 & 🟢)

### 🟡 Mất cấu hình ESLint (Mã nguồn Frontend thiếu chuẩn)
- **Vị trí:** Client App
- **Mô tả:** Lệnh `npm run lint` tại thư mục `client` báo lỗi `ESLint couldn't find a configuration file`. Team dev hiện không có Rule kiểm tra code tĩnh (vd: thiếu dependency trong `useEffect`, sai định dạng hook).
- **Khuyến nghị:** Cần setup lại `eslint.config.js` để tự động check các file `.jsx`.

### 🟢 Thiếu kịch bản Test tự động (Tests pipeline)
- **Vị trí:** Server & Client `package.json`
- **Mô tả:** Có folder `tests` và các kịch bản chạy test bằng `node index.js`, nhưng chưa tích hợp chuẩn vào `npm test`.

---

## 4. Điểm Cộng Của Hệ Thống (Positive Observations)
- ✅ Phân trang (Pagination) ở Dashboard sử dụng con trỏ (`startAfter`) thay vì tải toàn bộ bảng, điều này rất tuyệt vời cho một App tương tác với Firestore.
- ✅ Tab `Timeline/Kanban` kết nối rất sạch sẽ, phân chia Component rạch ròi, giúp dễ debug khi gặp sự cố Data hôm nay.
- ✅ Cơ chế Listener `onSnapshot` ở Frontend có dùng `limit(100)`, đảm bảo không tạo độ trễ kết nối.

---

## 5. Khuyến Nghị Hành Động Tức Thì (Top 3 Actions)
Dưới đây là 3 việc cần làm trong Sprint tiếp theo để hệ thống "sạch nước cản":
1. **Fix AuthMiddleware N+1:** Cấu hình Cache Roles cho `authMiddleware.js` (ưu tiên cao, vì nó ngốn quota Firebase nhiều thứ 2 sau các Workers).
2. **Setup lại Linter:** Khởi tạo `eslint` cho dự án Client để tránh side-effect của React.
3. **Cài đặt Firebase Emulator:** Đội ngũ Dev nên tải Firebase Emulator để Code local không tiêu hao Quota thật của Production.
