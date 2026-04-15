# Chiến lược tối ưu hóa Firebase Quota cho hệ thống FGW Event Flow

## 1. Vấn đề (Problem Statement)
Hệ thống hiện tại đang sử dụng quá nhiều lượt đọc (Reads) từ Firebase Firestore do các tác vụ nền (Jobs) chạy quá dày đặc và các yêu cầu từ phía người dùng (Analytics/Dashboard) không được trạm trung chuyển dữ liệu (Server) xử lý hiệu quả. Với mục tiêu phục vụ 100-150 người dùng trên gói Free, cấu trúc hiện tại sẽ gây ra lỗi `RESOURCE_EXHAUSTED` liên tục.

## 2. Các giải pháp đã đánh giá

### Tiếp cận A: Tối ưu câu lệnh (Query Tuning)
- **Cơ chế:** Thêm limit, bỏ field thừa.
- **Đánh giá:** Chỉ là giải pháp tình thế, không giải quyết được gốc rễ khi số lượng người dùng tăng.

### Tiếp cận B: Bộ nhớ đệm Server (Server-Side Caching) - [ĐÃ CHỌN]
- **Cơ chế:** Server đóng vai trò "người đi chợ". Server lấy dữ liệu 1 lần, giữ trong RAM và chia sẻ cho tất cả người dùng.
- **Đánh giá:** Tối ưu nhất cho quy mô 150 người dùng. Giảm Reads từ mức hàng chục nghìn xuống mức vài trăm.

### Tiếp cận C: Tổng hợp dữ liệu chủ động (Materialized Aggregates)
- **Cơ chế:** Lưu kết quả tính toán sẵn vào một Document riêng.
- **Đánh giá:** Rất tiết kiệm Read nhưng dễ lỗi con số (Out of sync) và phức tạp khi bảo trì.

## 3. Giải pháp khuyến nghị (Final Solution)

### Chiến lược 1: Giảm tần suất Jobs (Batch Processing)
- **Reminder Job:** Chạy 30 phút/lần. Truy vấn chỉ nhắm vào ngày Hiện tại và Ngày mai.
- **Email Worker:** Chạy 5-10 phút/lần.

### Chiến lược 2: In-Memory Cache Service
- Xây dựng một service quản lý Cache ngay trên RAM server.
- **Metadata (Phòng ban/Vật tư):** Cache 30 phút.
- **Analytics Summary:** Cache 10 phút.

### Chiến lược 3: API Batching
- Gộp các yêu cầu lấy thông tin cấu hình vào 1 endpoint duy nhất `/api/v1/app-context`.

## 4. Dự báo hiệu quả (Success Metrics)
- **Lượt đọc Firestore:** Giảm ~85% so với hiện tại.
- **Tốc độ phản hồi:** Trang Dashboard và Analytics sẽ load gần như tức thì (vì lấy từ RAM).
- **Độ bền:** Hệ thống chạy ổn định 24/7 trên gói Spark (Free).
