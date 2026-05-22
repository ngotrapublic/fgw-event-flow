# Brainstorm Report: Tự động lọc Dashboard theo Bộ phận (Department-based Dashboard)

**Ngày tạo:** 22/05/2026
**Tình trạng:** Chờ chốt phương án

## 1. Vấn đề và Yêu cầu (Problem & Requirements)
- **Vấn đề:** Hiện tại "My Events" đang lọc theo email người tạo (cá nhân). Tuy nhiên, người dùng có nhu cầu quản lý chéo trong cùng bộ phận. 
- **Yêu cầu (Ràng buộc):**
  1. Giao diện Danh sách sự kiện: Phải có khả năng hiển thị toàn bộ sự kiện do bất kỳ ai trong cùng bộ phận tạo ra.
  2. Giao diện Stats (Số lượng Today, Tomorrow, Week): Cần tự động tính toán lại và CHỈ đếm các sự kiện thuộc bộ phận của User đó.
  3. Quyền thao tác: Mọi người trong bộ phận đều XEM được sự kiện của nhau, nhưng chỉ người tạo ra sự kiện mới có quyền SỬA/XÓA.

## 2. Phân tích quyền hạn (Permissions)
- May mắn thay, logic quyền SỬA/XÓA hiện tại của hệ thống đã được viết rất chuẩn xác: `isAdmin || (isOwner && !isPast)`. Tức là hệ thống vốn dĩ đã khóa quyền sửa/xóa nếu user không phải người tạo (`isOwner`). Việc chúng ta mở rộng cho họ XEM sự kiện của người khác trong bộ phận sẽ **không gây ra rủi ro bảo mật**.

## 3. Phân tích các hướng tiếp cận (Evaluated Approaches)

| Phương án | Chi tiết triển khai | Ưu điểm (Pros) | Nhược điểm (Cons) | Áp dụng Nguyên tắc |
|---|---|---|---|---|
| **1. Lọc trực tiếp từ Backend + Composite Index (Khuyên dùng)** | Sửa API `getStats` và `getAllEvents` để nhận tham số `?department=XYZ`. Backend sẽ truy vấn Database để lọc ngay từ nguồn, sau đó mới trả dữ liệu về Frontend. | Hiệu năng hoàn hảo. Khắc phục được 100% lỗi phân trang (luôn hiển thị đúng 9 items/trang). Các con số trên thẻ Stats luôn chính xác tuyệt đối. | Sẽ cần phải tạo thêm một Composite Index trên Firebase. Cần truy cập Console để lấy Link tạo. | **Chuẩn DRY & Robust** (Xử lý tập trung ở Server). |
| **2. Lọc giả lập trên Frontend (Kém tối ưu)** | Backend vẫn trả về toàn bộ dữ liệu. Frontend sẽ dùng hàm `.filter(e => e.department === user.department)` để giấu các sự kiện không phải của bộ phận đi. | Code cực kỳ nhanh, không cần can thiệp Database hay tạo Index trên Firebase. | Lỗi UI trầm trọng: Nếu API tải 9 sự kiện mới nhất, nhưng cả 9 sự kiện đều của bộ phận khác -> User sẽ thấy màn hình trống không, tưởng rằng không có sự kiện nào. | Vi phạm **KISS** (Trông có vẻ dễ nhưng sinh ra rất nhiều bug UI). |

## 4. Giải pháp đề xuất (Recommended Solution)
Lựa chọn **Cách 1: Lọc từ Backend**.
- Đổi tên bộ lọc "My Events" thành **"Phòng ban của tôi"**.
- Cập nhật hàm `fetchEvents` và `fetchStats` trên giao diện `EventDashboard.jsx` để gửi kèm biến `department: user.department` lên server.
- Cập nhật API `getStats` để lọc bỏ các sự kiện khác bộ phận trước khi cộng dồn con số đếm.

## 5. Rủi ro & Lưu ý triển khai
- **Cảnh báo Firebase Index:** Do Firestore yêu cầu index kép khi vừa `where('department')` vừa `orderBy('eventDate')`, hệ thống sẽ ném ra 1 lỗi yêu cầu tạo Index trong Console ở lần chạy đầu tiên. Kỹ sư cần click vào link báo lỗi đó để Firebase tự động xây dựng Index (mất khoảng 3 phút).
