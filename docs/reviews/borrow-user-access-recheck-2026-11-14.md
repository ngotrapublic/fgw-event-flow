# Re-check triển khai quyền truy cập và điều hướng Borrow

**Ngày kiểm tra:** 2026-11-14  
**Commit được kiểm tra:** `37be6a7`  
**Plan đối chiếu:** `docs/reviews/borrow-user-access-implementation-guide-2026-11-13.md`  
**Kết luận:** phần chức năng và phân quyền cốt lõi đã triển khai đúng. Không phát hiện lỗi High/Medium. Có ba điểm Low nên hoàn thiện để đóng toàn bộ checklist.

## 1. Những phần đã đạt

### Menu và information architecture

- `client/src/components/Sidebar.jsx:16-18` tạo section `Dịch vụ` và item **Mượn thiết bị của tôi** trỏ tới `/borrow` cho `user`, `manager`, `admin`.
- `client/src/components/Sidebar.jsx:24` đổi màn vận hành thành **Quản lý mượn trả**, trỏ tới `/equipment-loans`, chỉ cho `manager`, `admin`.
- Quyền được khai báo theo từng item và lọc tại `client/src/components/Sidebar.jsx:110-121`; section rỗng được loại bỏ.
- Visibility cũ của `Departments`, `Locations`, `Settings` được giữ nguyên.
- Test Sidebar chứng minh đúng ba role tại `client/src/components/__tests__/Sidebar.test.jsx`.

### Borrow portal cho account và guest

- `BorrowPortalHeader` phân biệt account/guest và cung cấp:
  - account: **Về Dashboard**;
  - guest: badge **Khách — không cần tài khoản** và link đăng nhập tùy chọn;
  - touch target tối thiểu 44 px cho các action.
- `BorrowHome` đã dùng header chung.
- `BorrowForm` và `BorrowReturn` đều có action Dashboard/Login.
- `BorrowerInfoSection` hiển thị đúng microcopy:
  - account: phiếu gắn với tài khoản;
  - guest: phải xác nhận email trước khi gửi tới bộ phận quản lý.
- User Guide đã mô tả riêng borrower portal và admin console cho từng role.

### Authorization

- Các route `/borrow*` vẫn public/self-service; không bị bọc `ProtectedRoute`.
- `/equipment-loans*` vẫn chỉ cho `admin`, `manager` tại `client/src/App.jsx:100-103`.
- Public API tiếp tục dùng public access hoặc `optionalAuth`.
- Tất cả `/api/borrow/admin/*` tiếp tục dùng `adminAuth = verifyToken + requireRole(['admin', 'manager'])` tại `server/routes/borrow.js:10,50-75`.
- Không có thay đổi schema, workflow hoặc nới quyền backend trong commit này.

## 2. Đối chiếu acceptance criteria

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| User tìm thấy cổng mượn từ dashboard | **Đạt** | Có menu `/borrow`. |
| User không thấy màn quản trị | **Đạt** | Test role user pass. |
| User không gọi được admin API | **Đạt** | Backend role tests pass. |
| Admin/manager thấy cả tự mượn và quản lý | **Đạt** | Sidebar tests pass. |
| Guest mở `/borrow` không cần account | **Đạt ở code** | Route public giữ nguyên; thiếu route-level UI test mới. |
| Guest được nhắc xác nhận email | **Đạt** | Có microcopy trong form. |
| Account biết phiếu gắn với tài khoản | **Đạt** | Có microcopy trong form. |
| Account có đường về dashboard | **Đạt trên Home/Form/Return** | Verify/Manage chưa áp dụng header chung. |
| Authorization không bị nới lỏng | **Đạt** | Route/API guard giữ nguyên. |
| Frontend test/lint/build xanh | **Đạt** | Xem mục 4. |

## 3. Điểm còn lại

### LOW-01 — Thiếu regression test cho các hành vi portal mới

Test mới hiện chỉ kiểm tra visibility/href của Sidebar cho ba role. Chưa có automated test cho:

- account thấy **Về Dashboard**;
- guest thấy **Khách — không cần tài khoản** và link đăng nhập;
- account form không có input tên/email guest;
- guest form có tên/email/SĐT và không bị redirect;
- `/borrow` public nhưng `/equipment-loans` chặn role `user` ở cấp React route.

Backend tests hiện có đã chứng minh middleware và cross-account isolation, nhưng không thay thế được route/component tests phía client.

**Nên bổ sung**

1. Test `BorrowPortalHeader` với `useAuth()` trả account và null.
2. Test `BorrowerInfoSection` cho account/guest.
3. Route test với `MemoryRouter` hoặc app test:
   - guest mở `/borrow`;
   - role `user` mở `/equipment-loans` nhận Unauthorized.
4. Chạy axe cho header mới hoặc trang `BorrowHome` hoàn chỉnh.

---

### LOW-02 — Header portal chưa được dùng nhất quán

- `BorrowPortalHeader` hiện chỉ được import và dùng bởi `BorrowHome`.
- `BorrowForm` và `BorrowReturn` lặp lại markup Dashboard/Login riêng.
- `BorrowVerify` và `BorrowManage` chưa có action Dashboard/Login.

Plan ghi việc áp dụng cho các trang con là tùy chọn nên đây không phải blocker. Tuy nhiên duplication làm các trang dễ lệch microcopy, responsive style hoặc accessibility khi sửa sau này.

**Nên sửa**

- Dùng `BorrowPortalHeader` cho `BorrowForm` và `BorrowReturn` với `backTo`, `title`, `subtitle`.
- Cân nhắc dùng cùng header cho `BorrowVerify` và `BorrowManage` để toàn bộ `/borrow*` có navigation nhất quán.
- Sau refactor, giữ mỗi trang chỉ truyền cấu hình thay vì copy markup.

---

### LOW-03 — Microcopy đăng nhập có thể làm guest hiểu nhầm về lịch sử cũ

Header đang dùng câu **“Đăng nhập để tự điền thông tin và xem lịch sử”**. Trong khi plan xác định việc đồng bộ lịch sử guest vào account là ngoài phạm vi; đăng nhập sau khi đã mượn dưới dạng guest không bảo đảm biến lịch sử guest cũ thành lịch sử account.

Để tránh overpromise, nên đổi thành một trong các câu:

- `Đăng nhập để tự điền thông tin và quản lý phiếu bằng tài khoản`;
- hoặc `Đăng nhập để các phiếu mới được lưu theo tài khoản`.

## 4. Kết quả kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Frontend Vitest | **PASS — 2 files, 10 tests** |
| Sidebar role tests | **PASS — 3/3** |
| Borrow UI + axe tests | **PASS — 7/7** |
| Frontend ESLint | **PASS — 0 error, 2 warning cũ ngoài Borrow** |
| Frontend production build | **PASS — 4.058 modules** |
| Backend Borrow authorization/ownership | **PASS — 3 suites, 79 tests** |
| `git diff --check` | Chỉ báo một blank line cuối file chưa commit trong `BorrowPortalHeader.jsx` |

Build vẫn cảnh báo main chunk khoảng 718 kB minified; Borrow routes tiếp tục được tách thành chunk riêng nên không phải regression của thay đổi này.

## 5. Working tree

Ngoài các report/file cá nhân chưa track, working tree có một thay đổi trong `client/src/components/borrow/BorrowPortalHeader.jsx`. Diff chỉ là thêm một dòng trống cuối file, không ảnh hưởng chức năng nhưng nên bỏ hoặc commit có chủ đích để working tree sạch.

## 6. Kết luận nghiệm thu

Có thể xem implementation **đã đạt yêu cầu chức năng chính và an toàn để tiếp tục tích hợp**. Không cần thay đổi backend cho plan này. Để đánh dấu hoàn tất 100%, nên ưu tiên:

1. Bổ sung test account/guest/header và route protection ở LOW-01.
2. Refactor dùng header chung ở LOW-02.
3. Điều chỉnh câu đăng nhập ở LOW-03.

