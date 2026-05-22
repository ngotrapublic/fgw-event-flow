# Brainstorm Summary: Lịch Calendar View Export (Excel)

## Problem Statement & Requirements
Người dùng muốn thay đổi định dạng của file xuất báo cáo ("Tháng này - Live report") trong phần Data Retention & Backup. 
- **Hiện tại:** Nút đang xuất ra một file CSV dạng danh sách truyền thống (từng dòng là từng sự kiện).
- **Yêu cầu mới:** Giữ nguyên giao diện nút bấm trên Web. Tuy nhiên, file tải về phải là file Excel (`.xlsx`) được định dạng dưới dạng **lưới lịch (Calendar grid)** giống với CalendarView trên Dashboard. Lưới này cần hiển thị rõ ngày tháng, sự kiện trong ngày và làm nổi bật màu sắc dựa trên bộ phận phụ trách.

## Evaluated Approaches

### Approach 1: Sử dụng thư viện `exceljs`
- **Chi tiết:** Backend sẽ tính toán số tuần trong tháng, vẽ ra một bảng lưới 7 cột (Thứ 2 - Chủ Nhật), tính toán toạ độ (Row/Col) của từng ngày, chèn các sự kiện vào đúng ô của ngày đó và áp dụng định dạng màu sắc (Background color, Font color).
- **Ưu điểm (Pros):** 
  - Cho phép can thiệp cực sâu vào định dạng (Format).
  - Có thể tái tạo chính xác trải nghiệm thị giác của CalendarView (màu sắc của từng bộ phận: Xanh cho Tuyển sinh, Tím cho Đào tạo...).
  - Hỗ trợ Wrap Text giúp một ô chứa nhiều sự kiện không bị tràn.
  - Cho phép tuỳ chỉnh độ rộng cột, chiều cao hàng cố định.
- **Nhược điểm (Cons):** Phức tạp trong logic code tạo file Excel vì phải xử lý ma trận toạ độ các ngày trong tháng.

### Approach 2: Sử dụng thư viện `xlsx` (SheetJS bản miễn phí)
- **Chi tiết:** Vẫn tính toán tạo ma trận các tuần và cột ngày, sau đó dùng hàm của `xlsx` chuyển ma trận 2D thành Excel.
- **Ưu điểm (Pros):** Tốc độ nhanh, code đơn giản, ít ngốn RAM của server.
- **Nhược điểm (Cons):** Không hỗ trợ đổ màu ô, kẻ viền tùy chỉnh hoặc thiết lập Wrap text tự động dễ dàng ở bản miễn phí. Kết quả chỉ là một lưới số liệu thô khan, không đáp ứng được yếu tố "nhìn giống CalendarView".

## Final Recommended Solution & Rationale
**Lựa chọn:** **Approach 1 (`exceljs`)**
- **Lý do:** Đây là cách duy nhất thỏa mãn yêu cầu "giống phần Calendar" của người dùng, đặc biệt là tính trực quan qua màu sắc để phân biệt bộ phận. Việc đánh đổi một chút phức tạp ở phía Backend là hoàn toàn xứng đáng với giá trị trải nghiệm mang lại cho end-user khi xem báo cáo (đặc biệt là Ban giám đốc/Người quản lý).

## Implementation Considerations & Risks
- **Xử lý Cell Height:** Các ngày có quá nhiều sự kiện có thể khiến ô Excel bị kéo quá dài, cần cài đặt tính năng Auto Fit Row Height hoặc quy định chiều cao tối đa.
- **Xử lý ngày của tháng cũ/mới:** Lưới lịch thường có 35-42 ô. Những ô thuộc tháng trước hoặc tháng sau (nhưng vẫn nằm trong tuần đầu/tuần cuối) cần được làm mờ (màu xám) và không hiển thị hoặc làm mờ sự kiện để tránh rối mắt.
- **Tốc độ xử lý:** Vì phải định dạng màu cho từng đoạn text nhỏ trong từng ô (Rich Text) và truy vấn toàn bộ sự kiện trong tháng, thời gian phản hồi API có thể chậm hơn so với xuất CSV.

## Success Metrics & Next Steps
- **Success Metrics:** File Excel tải xuống thành công, hiển thị đúng dạng lưới lịch 7 cột. Các sự kiện đổ vào đúng ngày và mang màu sắc khớp với bộ phận. Mở tốt trên cả MS Excel và Google Sheets.
- **Next Steps:** Cần người dùng phê duyệt phương án để tiến hành chạy lệnh `/plan` nhằm lên sơ đồ kỹ thuật chi tiết.
