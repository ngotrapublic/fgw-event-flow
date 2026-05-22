# Brainstorm Report: Chọn Tháng Xuất Báo Cáo Lịch Excel

**Ngày tạo:** 21/05/2026
**Trạng thái:** Đã chốt phương án

## 1. Vấn đề và Yêu cầu (Problem & Requirements)
- **Vấn đề:** Tính năng "Xuất Lịch Excel" hiện tại đang fix cứng (hardcode) xuất dữ liệu của tháng hiện hành. Cấp quản lý có nhu cầu trích xuất lại báo cáo của các tháng cũ hoặc xem trước các tháng tới.
- **Yêu cầu (Ràng buộc):** 
  - Chỉ cho phép trích xuất các tháng nằm trong **Năm Hiện Tại**.
  - Giữ lại nút Tải nhanh "Tháng hiện hành".
  - Bổ sung tuỳ chọn "Tháng khác" một cách gọn gàng, chuyên nghiệp, giữ nguyên ngôn ngữ thiết kế Neubrutalism của trang Data Retention.

## 2. Phân tích các hướng tiếp cận (Evaluated Approaches)

| Phương án | Ưu điểm (Pros) | Nhược điểm (Cons) | Áp dụng Nguyên tắc |
|---|---|---|---|
| **1. Split Button (Khuyên dùng)** | Gọn gàng, rất chuyên nghiệp. Trải nghiệm nhanh với 2 nút: Tải Nhanh (Tháng này) và Nút Mở rộng (Chọn tháng 1->12). | Cần code thêm logic quản lý trạng thái Dropdown (đóng/mở) trên React. | Rất chuẩn **KISS** (Dễ dùng, ít thao tác). |
| **2. Native Select box** | Code cực nhanh, dùng thẻ `<select>` mặc định của trình duyệt web. | Kém thẩm mỹ, khó tuỳ biến màu sắc/viền để đồng bộ với theme Neubrutalism. | Vi phạm nguyên tắc Thẩm mỹ. |
| **3. Modal Dialog** | Hiển thị 12 ô vuông tháng khổng lồ trong 1 Popup xịn xò. | Cần tới 3-4 cú click chuột để tải file. Code dài dòng. | Vi phạm **YAGNI** (Quá phức tạp cho tính năng đơn giản). |

## 3. Giải pháp cuối cùng (Final Recommended Solution)
Dựa trên sự thống nhất với người dùng, hệ thống sẽ triển khai **Cách 1: Split Button (Nút Tách Trạng Thái)**.
- Giao diện tấm thẻ "Tháng Này (Live Report)" sẽ có 2 nút:
  - Một nút chính mang biểu tượng Download (như cũ) dùng để lập tức xuất file tháng này.
  - Một nút phụ mang biểu tượng Lịch (`Calendar` icon). Khi click vào, sẽ xổ xuống 1 Menu (Dropdown) tuyệt đẹp liệt kê các tháng từ Tháng 1 đến Tháng 12 của năm hiện tại. 
- Khi người dùng bấm vào 1 tháng bất kỳ trong Dropdown, file sẽ ngay lập tức được tải về.

## 4. Rủi ro & Lưu ý triển khai (Implementation Risks)
- **UI Overflow:** Khung Dropdown xổ ra phải được gắn class `absolute` và `z-index` cao (ví dụ: `z-50`) để không bị che khuất bởi các tấm thẻ Backup khác ở bên dưới.
- **Tính đóng/mở (Click-outside):** Cần đảm bảo khi người dùng mở Menu chọn tháng, nếu họ click ra ngoài vùng Menu thì Menu phải tự động đóng lại (sử dụng Hook `useRef` hoặc sự kiện `onBlur` nếu phù hợp, hoặc đơn giản nhất là dùng icon tắt).
- **Backend Sync:** Cập nhật hàm gọi API để truyền đúng tham số `?month=YYYY-MM`.

## 5. Tiêu chí thành công (Success Metrics)
- Người dùng có thể tải báo cáo của Tháng 3 ngay trong Tháng 5 chỉ với 2 click chuột (Mở menu -> Bấm Tháng 3).
- Nút bấm xổ ra đẹp, có viền đen bóng (shadow), hover chuyển màu tinh tế.
- File tải về có tên chính xác (VD: `Events_Calendar_2026-03.xlsx`).
