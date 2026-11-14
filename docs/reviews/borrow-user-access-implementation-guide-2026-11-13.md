# Hướng dẫn triển khai quyền truy cập và điều hướng Borrow

**Ngày:** 2026-11-13  
**Branch tham chiếu:** `feat/equipment-borrow`  
**Mục tiêu:** làm rõ trải nghiệm của user thường, khách không có tài khoản và admin/manager trong tính năng mượn trả thiết bị.

## 1. Quyết định sản phẩm

Hệ thống phải tiếp tục có **hai bề mặt tách biệt**:

1. **Cổng người mượn — `/borrow`**
   - Dùng cho user đã đăng nhập và người không có tài khoản.
   - Chỉ hiển thị phiếu thuộc quyền truy cập của chính người đó.
   - Cho phép đăng ký mượn, theo dõi phiếu và báo trả.

2. **Màn hình vận hành — `/equipment-loans`**
   - Chỉ dành cho `admin` và `manager`.
   - Cho phép xem phiếu của tất cả người mượn, duyệt, từ chối, giao thiết bị và xác nhận trả.

**User role `user` cần thấy tính năng mượn thiết bị**, nhưng phải được dẫn tới `/borrow`, không phải `/equipment-loans`.

## 2. Trạng thái code hiện tại

### Phần đã đúng

- `client/src/App.jsx` khai báo toàn bộ `/borrow*` là public route.
- `/equipment-loans` và `/equipment-loans/qr` được bảo vệ bởi `ProtectedRoute` với role `admin`, `manager`.
- Public API dùng `optionalAuth`: có tài khoản thì gắn phiếu với UID; không có tài khoản thì chạy guest flow.
- Toàn bộ `/api/borrow/admin/*` yêu cầu `verifyToken + requireRole(['admin', 'manager'])`.
- `GET /api/borrow/my` chỉ trả phiếu theo authenticated UID hoặc các request ID có trong guest HttpOnly session.
- Guest có thể phục hồi quyền truy cập phiếu đang mở bằng số điện thoại + OTP gửi tới email đăng ký.

### Khoảng trống UX cần sửa

`client/src/components/Sidebar.jsx` hiện đặt `Equipment Loans` trong section `Management`, rồi ẩn toàn bộ section này với role `user`. Vì vậy:

- User thường không thấy đường dẫn nào tới `/borrow` sau khi đăng nhập.
- User có thể truy cập `/borrow` bằng URL trực tiếp, nhưng khó phát hiện tính năng.
- Tên `Equipment Loans` hiện mô tả chưa rõ đây là màn hình quản trị, dễ tạo cảm giác toàn bộ tính năng chỉ dành cho admin.

## 3. Ma trận quyền chính thức

| Khả năng | Guest | User | Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Mở `/borrow` | Có | Có | Có | Có |
| Xem danh sách thiết bị có thể đăng ký | Có | Có | Có | Có |
| Tạo phiếu mượn | Có | Có | Có | Có |
| Xem phiếu của chính mình | Có, bằng session/OTP | Có, theo UID | Có, theo UID | Có, theo UID |
| Xem lịch sử phiếu đã đóng của bản thân | Không bảo đảm trong guest flow hiện tại | Có | Có | Có |
| Báo trả phiếu của chính mình | Có | Có | Có | Có |
| Mở `/equipment-loans` | Không | Không | Có | Có |
| Xem phiếu của người khác | Không | Không | Có | Có |
| Duyệt/từ chối/giao/chốt trả | Không | Không | Có | Có |
| In QR trạm mượn | Không | Không | Có | Có |
| Quản lý cấu hình hệ thống | Không | Không | Theo quyền hiện có | Có |

> Quyền hiển thị menu chỉ là UX. Backend middleware vẫn là hàng rào authorization bắt buộc.

## 4. Luồng người dùng mong muốn

```mermaid
flowchart TD
    A[Người cần mượn thiết bị] --> B{Có tài khoản EventFlow?}
    B -->|Có| C[Đăng nhập]
    C --> D[Mở Mượn thiết bị của tôi]
    D --> E[/borrow]
    B -->|Không| F[Quét QR hoặc mở link public]
    F --> E
    E --> G{Đã đăng nhập?}
    G -->|Có| H[Tự điền danh tính từ tài khoản]
    H --> I[Tạo phiếu pending ngay]
    G -->|Không| J[Nhập tên, email, SĐT]
    J --> K[Xác nhận email]
    K --> I
    I --> L[Admin/Manager xử lý tại /equipment-loans]
```

## 5. Thay đổi frontend cần triển khai

### 5.1. Tách hai menu theo mục đích

Sửa `client/src/components/Sidebar.jsx`.

#### Menu dành cho mọi user đã đăng nhập

Thêm một section hoặc item luôn hiển thị:

- Label: **Mượn thiết bị của tôi**
- Route: `/borrow`
- Icon: `Package`, `PackageOpen` hoặc icon phù hợp.
- Audience: `user`, `manager`, `admin`.

Nên đặt item trong section `Dịch vụ` hoặc `Cá nhân`, không đặt trong `Management`.

#### Menu vận hành

Đổi item hiện tại:

- Từ: `Equipment Loans`
- Thành: **Quản lý mượn trả**
- Route giữ nguyên: `/equipment-loans`
- Audience: chỉ `admin`, `manager`.

#### Cách cấu trúc đề xuất

Không nên tiếp tục ẩn cả section dựa vào tên section. Khai báo quyền trên từng item để dễ mở rộng:

```jsx
const SIDEBAR_ITEMS = [
    {
        section: 'Dịch vụ',
        items: [
            {
                icon: Package,
                label: 'Mượn thiết bị của tôi',
                to: '/borrow',
                roles: ['user', 'manager', 'admin']
            }
        ]
    },
    {
        section: 'Management',
        items: [
            {
                icon: ClipboardList,
                label: 'Quản lý mượn trả',
                to: '/equipment-loans',
                roles: ['manager', 'admin']
            }
        ]
    }
];
```

Khi render:

1. Lọc từng item theo `roles`.
2. Bỏ section nếu sau khi lọc không còn item.
3. Không dùng tên section làm quy tắc authorization.
4. Giữ nguyên visibility hiện tại của các item không thuộc Borrow; không nhân tiện mở thêm
   `Departments`, `Locations`, `Settings` hoặc chức năng khác cho role mới.

### 5.2. Bổ sung đường quay lại dashboard trên Borrow portal

`/borrow` nằm ngoài dashboard `Layout`. Khi user đăng nhập đi từ sidebar sang Borrow portal, họ cần đường quay lại rõ ràng.

Sửa `client/src/components/borrow/BorrowHome.jsx`:

- Nếu `user` tồn tại: hiển thị action **Về Dashboard** dẫn tới `/`.
- Nếu không có `user`: có thể hiển thị link phụ **Đăng nhập** dẫn tới `/login`, kèm microcopy “Không bắt buộc”.
- Không tự động ép guest sang trang đăng nhập.
- Không làm CTA đăng nhập nổi bật hơn CTA “Mượn thiết bị”.

Có thể áp dụng cùng header/action này cho:

- `/borrow/new`
- `/borrow/return`
- `/borrow/verify`
- `/borrow/manage`

Nếu tránh lặp code, tách một component nhỏ như `BorrowPortalHeader`.

### 5.3. Microcopy cần thống nhất

| Ngữ cảnh | Nội dung đề xuất |
|---|---|
| Sidebar user | `Mượn thiết bị của tôi` |
| Sidebar admin/manager | `Quản lý mượn trả` |
| Guest badge | `Khách — không cần tài khoản` |
| Guest login link | `Đăng nhập để tự điền thông tin và xem lịch sử` |
| Account form | `Phiếu này sẽ được gắn với tài khoản của bạn` |
| Guest form | `Bạn sẽ xác nhận email trước khi phiếu được gửi tới bộ phận quản lý` |

Không dùng cùng một label cho borrower portal và admin console.

## 6. Hành vi theo loại người dùng

### 6.1. User đã đăng nhập

Khi mở `/borrow/new`:

- Backend nhận Bearer token thông qua Axios interceptor.
- `borrowerType` phải là `account`.
- Tên/email lấy từ tài khoản, không cho client giả mạo borrower khác.
- User vẫn nhập/cập nhật số điện thoại phục vụ liên hệ.
- Phiếu chuyển thẳng sang `pending`; không yêu cầu xác nhận email guest.
- `/borrow` tải phiếu theo `borrower.uid`, bao gồm lịch sử trong giới hạn hiện có.

### 6.2. Guest không có tài khoản

Guest phải tiếp tục truy cập trực tiếp `/borrow` qua QR hoặc URL:

1. Nhập tên, email, số điện thoại.
2. Gửi yêu cầu mượn.
3. Phiếu ở trạng thái `unverified`.
4. Bấm link xác nhận email để chuyển sang `pending`.
5. Nhận HttpOnly session để xem và thao tác trên phiếu được cấp quyền.
6. Nếu mất session hoặc đổi thiết bị, dùng SĐT + OTP gửi tới email đăng ký để tìm phiếu đang mở.

Guest không được:

- Thấy dashboard EventFlow.
- Thấy danh sách sự kiện hoặc người dùng.
- Thấy phiếu không thuộc session/OTP của mình.
- Truy cập API hoặc UI quản trị.

### 6.3. Admin/Manager

Admin và manager có hai vai trò độc lập:

- Khi tự mượn: dùng `/borrow` giống user thường; phiếu gắn với UID của họ.
- Khi vận hành kho: dùng `/equipment-loans` để xử lý phiếu của người khác.

Không nên tự động chuyển admin từ `/borrow` sang `/equipment-loans`; admin vẫn có thể là người mượn.

## 7. Backend và authorization

### Không cần thay đổi quyền route chính

Giữ nguyên:

- Public/self-service routes sử dụng public access hoặc `optionalAuth`.
- Admin routes sử dụng `verifyToken + requireRole(['admin', 'manager'])`.
- `/equipment-loans*` sử dụng `ProtectedRoute` cho `admin`, `manager`.
- `/borrow*` không bọc `ProtectedRoute`.

### Các quy tắc không được phá vỡ

1. User role `user` gọi `/api/borrow/admin/*` phải nhận `403`.
2. Guest không có session/OTP hợp lệ không được đọc hoặc báo trả phiếu.
3. User đã đăng nhập chỉ đọc/báo trả phiếu có `borrower.uid === req.user.uid`.
4. Không tin `role`, UID hoặc email do request body gửi lên.
5. Việc ẩn menu không được xem là biện pháp bảo mật.

## 8. File dự kiến thay đổi

### Bắt buộc

- `client/src/components/Sidebar.jsx`
  - Thêm item borrower portal cho mọi role.
  - Đổi tên item quản trị.
  - Lọc quyền theo item thay vì tên section.

- `client/src/components/borrow/BorrowHome.jsx`
  - Thêm đường quay lại dashboard cho account.
  - Thêm đăng nhập tùy chọn cho guest nếu phù hợp UI.

### Nên làm

- `client/src/components/borrow/BorrowPortalHeader.jsx` — component dùng chung nếu header xuất hiện trên nhiều trang.
- `client/src/components/UserGuideModal.jsx` — giải thích hai luồng borrower/admin.
- `client/src/components/borrow/__tests__/borrow.test.jsx` — kiểm tra hành vi account/guest trên portal.
- Một test mới cho Sidebar, ví dụ `client/src/components/__tests__/Sidebar.test.jsx`.

### Không dự kiến thay đổi

- Schema Firestore.
- Trạng thái workflow mượn trả.
- API admin.
- Cơ chế email verify/session/OTP.

Nếu phải sửa các phần này thì cần review phạm vi lại trước khi code.

## 9. Test bắt buộc

### Navigation và role visibility

1. Role `user`:
   - Thấy `Mượn thiết bị của tôi`.
   - Không thấy `Quản lý mượn trả`.
   - Click item mở `/borrow`.

2. Role `manager`:
   - Thấy cả hai item.
   - Hai item dẫn tới hai route khác nhau.

3. Role `admin`:
   - Thấy cả hai item.

4. Không đăng nhập:
   - Mở trực tiếp `/borrow` không bị redirect tới `/login`.
   - Không thể mở dashboard/protected route.

### Borrow portal

5. Account mở `/borrow/new`:
   - Thấy danh tính từ account.
   - Không thấy input sửa tên/email guest.
   - Có input số điện thoại.

6. Guest mở `/borrow/new`:
   - Thấy input tên, email, số điện thoại.
   - Không bị ép đăng nhập.

7. Account thấy nút/link `Về Dashboard`; guest thấy đăng nhập là lựa chọn phụ.

### Authorization regression

8. User role `user` truy cập `/equipment-loans` thủ công → Unauthorized.
9. User role `user` gọi một endpoint `/api/borrow/admin/*` → `403`.
10. Guest A không đọc hoặc báo trả được phiếu của Guest B.
11. Account A không đọc hoặc báo trả được phiếu của Account B.

### Responsive và accessibility

12. Kiểm tra ở chiều rộng 360 px:
    - Menu/CTA không tràn ngang.
    - Action Dashboard/Login có touch target tối thiểu 44×44 px.
13. Link/menu mới có accessible name rõ ràng.
14. Focus keyboard nhìn thấy được.
15. `axe` không phát sinh violation mới.

## 10. Tiêu chí nghiệm thu

- [ ] User role `user` phát hiện được cổng mượn thiết bị từ dashboard mà không cần biết URL.
- [ ] User role `user` không thấy và không truy cập được màn quản trị mượn trả.
- [ ] Admin/manager thấy rõ hai lựa chọn: tự mượn và quản lý phiếu.
- [ ] Guest truy cập bằng QR mà không cần tạo tài khoản.
- [ ] Guest được thông báo rõ phải xác nhận email.
- [ ] Account được thông báo rõ phiếu gắn với tài khoản.
- [ ] Có đường quay lại dashboard cho account từ Borrow portal.
- [ ] Backend authorization không bị nới lỏng.
- [ ] Test role visibility và authorization regression đều pass.
- [ ] Frontend test, lint và production build đều pass.

## 11. Thứ tự triển khai đề xuất

1. Refactor cấu hình Sidebar sang quyền theo từng item.
2. Thêm `Mượn thiết bị của tôi` và đổi tên menu quản trị.
3. Thêm navigation Dashboard/Login trong Borrow portal.
4. Cập nhật microcopy và User Guide.
5. Viết test visibility cho ba role.
6. Chạy Borrow UI tests, toàn bộ frontend tests, lint và build.
7. Chạy backend authorization regression tests để bảo đảm không vô tình nới quyền.

## 12. Ngoài phạm vi tài liệu này

- Bắt buộc toàn bộ người mượn phải có tài khoản.
- Đồng bộ guest history vào account sau khi đăng nhập.
- Cho guest xem toàn bộ lịch sử phiếu đã đóng.
- Thêm role mới như `borrow_operator` hoặc `warehouse_staff`.
- Thay đổi quy trình duyệt/giao/trả hoặc chính sách giữ tồn kho.

Nếu sau này cần nhân viên kho chỉ quản lý mượn trả nhưng không có các quyền manager khác, nên thêm capability/role riêng thay vì tiếp tục mở rộng role `manager`.

