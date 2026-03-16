# 🎮 Hướng Dẫn Xây Dựng Web/App với Gravity - Dành Cho Người Mới

> **Mức độ:** Người mới bắt đầu (Level 0 - ELI5)  
> **Giải thích:** Như nói chuyện với người chưa biết gì về lập trình  
> **Cập nhật:** 2026-01-14

---

## 🌟 Trước Khi Bắt Đầu

### Gravity là gì?

Hãy tưởng tượng bạn có một **người bạn siêu giỏi về lập trình** ngồi cạnh bạn 24/7. Bạn hỏi gì, người đó cũng giúp được. Đó chính là Gravity!

```
┌─────────────────────────────────────────────────────────┐
│                        BẠN                              │
│                         │                               │
│                         ▼                               │
│    ┌─────────────────────────────────────────────┐     │
│    │              GRAVITY                         │     │
│    │   (Người bạn siêu giỏi lập trình)           │     │
│    │                                              │     │
│    │   🧠 Skills = Kiến thức chuyên môn          │     │
│    │   🤖 Agents = Các chuyên gia                │     │
│    │   📋 Workflows = Quy trình làm việc         │     │
│    └─────────────────────────────────────────────┘     │
│                         │                               │
│                         ▼                               │
│                   WEB/APP HOÀN CHỈNH                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Phần 1: Hiểu Các Khái Niệm Cơ Bản

### 1.1 Workflow là gì?

**Ví dụ thực tế:** Khi bạn nấu ăn, bạn theo công thức từng bước:
1. Rửa rau
2. Cắt rau  
3. Xào rau
4. Nêm gia vị
5. Dọn ra đĩa

**Workflow trong lập trình cũng vậy!** Đó là các bước để hoàn thành một công việc.

```
Ví dụ Workflow "/plan":

Bước 1: Hiểu bạn muốn làm gì
    ↓
Bước 2: Nghiên cứu cách làm tốt nhất
    ↓
Bước 3: Viết ra kế hoạch chi tiết
    ↓
Bước 4: Đưa cho bạn xem và góp ý
```

### 1.2 Skill là gì?

**Ví dụ thực tế:** Một đầu bếp có nhiều kỹ năng:
- Kỹ năng làm món Việt
- Kỹ năng làm món Nhật
- Kỹ năng cắt tỉa hoa
- Kỹ năng làm bánh

**Skill trong Gravity cũng vậy!** Là các kiến thức chuyên môn:
- Skill làm giao diện đẹp (frontend-development)
- Skill làm database (databases)
- Skill sửa lỗi (debugging)

### 1.3 Agent là gì?

**Ví dụ thực tế:** Trong bệnh viện có nhiều bác sĩ chuyên khoa:
- Bác sĩ tim mạch
- Bác sĩ xương khớp
- Bác sĩ da liễu

**Agent trong Gravity là các "chuyên gia":**
- Planner = Chuyên gia lập kế hoạch
- Debugger = Chuyên gia sửa lỗi
- Designer = Chuyên gia thiết kế

---

## 🏗️ Phần 2: Quy Trình Xây Dựng Web/App Đúng Cách

### Bước Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│           QUY TRÌNH XÂY DỰNG WEB/APP                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1️⃣  LÊN Ý TƯỞNG         →  /brainstorm               │
│      (Muốn làm gì?)                                     │
│           ↓                                             │
│  2️⃣  LẬP KẾ HOẠCH        →  /plan                     │
│      (Làm như thế nào?)                                 │
│           ↓                                             │
│  3️⃣  THIẾT KẾ            →  /design                   │
│      (Trông như thế nào?)                               │
│           ↓                                             │
│  4️⃣  LÀM CODE            →  /develop                  │
│      (Viết code)                                        │
│           ↓                                             │
│  5️⃣  KIỂM TRA            →  /test                     │
│      (Chạy đúng không?)                                 │
│           ↓                                             │
│  6️⃣  SỬA LỖI             →  /debug                    │
│      (Sửa chỗ sai)                                      │
│           ↓                                             │
│  7️⃣  HOÀN THIỆN          →  /review + /docs           │
│      (Kiểm tra lần cuối)                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Phần 3: Ví Dụ Cụ Thể - Làm Website Bán Hàng

### Tình huống: 
Bạn muốn làm một website bán quần áo online

### Bước 1: Brainstorm - Lên ý tưởng 💡

**Bạn nói với Gravity:**
```
/brainstorm Tôi muốn làm website bán quần áo online. 
Giúp tôi nghĩ xem cần những gì?
```

**Gravity sẽ giúp bạn:**
```
Được rồi! Một website bán quần áo cần có:

📦 TRANG CHỦ
├── Banner giới thiệu
├── Sản phẩm nổi bật
└── Khuyến mãi

👕 TRANG SẢN PHẨM
├── Danh sách quần áo
├── Lọc theo: size, màu, giá
└── Xem chi tiết từng sản phẩm

🛒 GIỎ HÀNG
├── Thêm/xóa sản phẩm
├── Tính tổng tiền
└── Thanh toán

👤 TÀI KHOẢN
├── Đăng ký/Đăng nhập
├── Lịch sử đơn hàng
└── Thông tin cá nhân
```

### Bước 2: Plan - Lập kế hoạch 📋

**Bạn nói với Gravity:**
```
/plan Bây giờ hãy lập kế hoạch chi tiết để làm website 
bán quần áo này. Tôi là người mới, chưa biết nhiều.
```

**Gravity sẽ tạo kế hoạch như này:**
```
# 📋 KẾ HOẠCH LÀM WEBSITE BÁN QUẦN ÁO

## Tuần 1: Chuẩn bị
- [ ] Cài đặt công cụ cần thiết
- [ ] Tạo project mới
- [ ] Thiết kế giao diện cơ bản

## Tuần 2: Làm giao diện
- [ ] Trang chủ
- [ ] Trang danh sách sản phẩm
- [ ] Trang chi tiết sản phẩm

## Tuần 3: Làm tính năng
- [ ] Giỏ hàng
- [ ] Đăng ký/Đăng nhập
- [ ] Thanh toán

## Tuần 4: Hoàn thiện
- [ ] Test tất cả
- [ ] Sửa lỗi
- [ ] Đưa lên mạng
```

### Bước 3: Design - Thiết kế 🎨

**Bạn nói với Gravity:**
```
/design Thiết kế giao diện trang chủ cho website bán quần áo.
Tôi muốn style hiện đại, trẻ trung.
```

**Gravity sẽ:**
1. Mô tả chi tiết giao diện
2. Chọn màu sắc phù hợp
3. Chọn font chữ
4. Vẽ layout (bố cục)

```
🎨 THIẾT KẾ TRANG CHỦ

HEADER (Phần đầu)
┌─────────────────────────────────────────────┐
│  LOGO        Menu         🛒 Giỏ hàng  👤   │
└─────────────────────────────────────────────┘

BANNER (Ảnh lớn)
┌─────────────────────────────────────────────┐
│                                             │
│     "SALE MÙA HÈ - GIẢM 50%"               │
│                                             │
│         [XEM NGAY]                          │
│                                             │
└─────────────────────────────────────────────┘

SẢN PHẨM NỔI BẬT
┌──────────┐  ┌──────────┐  ┌──────────┐
│  👕      │  │  👗      │  │  👖      │
│  Áo     │  │  Váy     │  │  Quần    │
│  299k   │  │  459k    │  │  399k    │
└──────────┘  └──────────┘  └──────────┘

Màu sắc: 
- Chính: Hồng pastel (#FFB6C1)
- Phụ: Trắng (#FFFFFF)
- Text: Xám đậm (#333333)
```

### Bước 4: Develop - Viết code 💻

**Bạn nói với Gravity:**
```
/develop Bắt đầu làm trang chủ theo thiết kế đã có.
Giải thích từng bước cho tôi hiểu.
```

**Gravity sẽ viết code và giải thích:**

```html
<!-- 
  Đây là file HTML - giống như bộ xương của website
  Nó quyết định có những gì trên trang
-->

<!DOCTYPE html>
<html>
<head>
    <!-- Phần này như "não" của trang, chứa thông tin cài đặt -->
    <title>Shop Thời Trang</title>
</head>
<body>
    <!-- Phần này như "cơ thể", là nội dung người dùng nhìn thấy -->
    
    <!-- HEADER - Phần đầu trang, giống như biển hiệu cửa hàng -->
    <header>
        <img src="logo.png" alt="Logo"> 
        <nav>
            <a href="#">Trang chủ</a>
            <a href="#">Sản phẩm</a>
            <a href="#">Liên hệ</a>
        </nav>
    </header>
    
    <!-- BANNER - Ảnh quảng cáo lớn -->
    <section class="banner">
        <h1>SALE MÙA HÈ - GIẢM 50%</h1>
        <button>XEM NGAY</button>
    </section>
    
    <!-- SẢN PHẨM - Danh sách hàng bán -->
    <section class="products">
        <div class="product">
            <img src="ao.jpg">
            <h3>Áo thun nam</h3>
            <p>299,000đ</p>
        </div>
        <!-- Thêm nhiều sản phẩm khác... -->
    </section>
    
</body>
</html>
```

**Giải thích đơn giản:**
```
HTML giống như viết một bức thư:

<html>         = Mở đầu bức thư
<head>         = Phần tiêu đề (không ai thấy)
<body>         = Nội dung chính (mọi người đọc)
<header>       = Phần đầu trang
<section>      = Một phần/khu vực
<div>          = Một hộp chứa nội dung
<img>          = Ảnh
<h1>, <h2>...  = Tiêu đề (1 to nhất, 6 nhỏ nhất)
<p>            = Đoạn văn
<button>       = Nút bấm
</html>        = Kết thúc bức thư
```

### Bước 5: Test - Kiểm tra 🧪

**Bạn nói với Gravity:**
```
/test Kiểm tra xem trang chủ hoạt động đúng không.
Hướng dẫn tôi cách test.
```

**Gravity sẽ hướng dẫn:**
```
🧪 CÁCH KIỂM TRA TRANG WEB

1. MỞ TRANG WEB
   - Mở file index.html trong trình duyệt
   - Hoặc chạy: npm run dev
   
2. KIỂM TRA BẰNG MẮT
   ✓ Logo hiển thị đúng không?
   ✓ Menu có đủ các mục không?
   ✓ Banner hiện hình không?
   ✓ Sản phẩm hiển thị đúng không?
   
3. KIỂM TRA CHỨC NĂNG
   ✓ Click vào menu có chuyển trang không?
   ✓ Click nút "XEM NGAY" có hoạt động không?
   ✓ Click vào sản phẩm có vào trang chi tiết không?
   
4. KIỂM TRA TRÊN ĐIỆN THOẠI
   ✓ Trang có hiển thị đẹp trên điện thoại không?
   ✓ Có thể vuốt/scroll được không?
   ✓ Các nút có bấm được không?
```

### Bước 6: Debug - Sửa lỗi 🔧

**Khi bạn gặp lỗi, nói với Gravity:**
```
/debug Trang web của tôi bị lỗi: ảnh không hiển thị.
Đây là code của tôi: [paste code]
```

**Gravity sẽ giúp tìm và sửa:**
```
🔍 TÌM LỖI

Tôi thấy vấn đề rồi! Nhìn vào code của bạn:

❌ Code lỗi:
<img src="hinh.jpg">

Lỗi là: File "hinh.jpg" không tồn tại trong thư mục

✅ Cách sửa:
1. Kiểm tra xem file có trong thư mục không
2. Kiểm tra tên file có đúng không (phân biệt HOA/thường)
3. Kiểm tra đường dẫn có đúng không

Ví dụ đúng:
<img src="images/hinh.jpg">  ← nếu file nằm trong thư mục "images"

💡 Mẹo kiểm tra:
- Chuột phải vào ảnh > "Inspect"
- Xem phần Network trong DevTools
- Tìm ảnh có lỗi 404 (không tìm thấy)
```

### Bước 7: Hoàn thiện 🎉

**Bạn nói với Gravity:**
```
/review Kiểm tra lại toàn bộ code trước khi hoàn thành
/docs Tạo tài liệu hướng dẫn sử dụng website
```

---

## 🛠️ Phần 4: Các Trường Hợp Cụ Thể

### 📱 Trường Hợp 1: Làm App Di Động

**Tình huống:** Bạn muốn làm app ghi chú trên điện thoại

```
Bạn: /plan Tôi muốn làm app ghi chú trên điện thoại. 
Tôi chưa biết gì về lập trình mobile.

Gravity: 
Tuyệt! Để làm app di động, có 3 cách phổ biến:

🍎 CÁCH 1: React Native
- Làm 1 lần, chạy được cả iPhone và Android
- Dùng JavaScript (dễ học)
- Phù hợp cho người mới

📱 CÁCH 2: Flutter
- Làm 1 lần, chạy được cả 2 hệ điều hành
- Dùng Dart (hơi khó hơn)
- Giao diện rất đẹp

🔧 CÁCH 3: Native
- Làm riêng cho từng hệ điều hành
- Chuyên nghiệp nhất
- Khó nhất, mất thời gian nhất

👉 Khuyến nghị cho bạn: React Native vì dễ học!

Bạn muốn tôi lập kế hoạch chi tiết không?
```

### 🛒 Trường Hợp 2: Làm Tính Năng Giỏ Hàng

**Tình huống:** Website bán hàng cần có giỏ hàng

```
Bạn: /develop Làm tính năng giỏ hàng cho website bán quần áo.
Giải thích đơn giản cho tôi.

Gravity:
Được! Giỏ hàng giống như một túi mua sắm ảo.

🛒 GIỎI HÀNG CẦN LÀM GÌ?

1. THÊM SẢN PHẨM VÀO GIỎ
   Khi bạn click "Thêm vào giỏ":
   → Sản phẩm được lưu vào danh sách
   → Số lượng trong giỏ tăng lên
   
2. XEM GIỎ HÀNG
   Hiển thị:
   - Tên sản phẩm
   - Số lượng
   - Giá mỗi cái
   - Tổng tiền
   
3. SỬA ĐỔI GIỎ HÀNG
   - Tăng/giảm số lượng
   - Xóa sản phẩm
   
4. TÍNH TỔNG TIỀN
   Tổng = Giá1 × Số lượng1 + Giá2 × Số lượng2 + ...

📝 CODE ĐƠN GIẢN:

// Giỏ hàng = một danh sách rỗng
let gioHang = [];

// Thêm sản phẩm vào giỏ
function themVaoGio(sanPham) {
    gioHang.push(sanPham);  // push = thêm vào cuối danh sách
    capNhatGioHang();        // Cập nhật hiển thị
}

// Tính tổng tiền
function tinhTongTien() {
    let tong = 0;
    for (let sp of gioHang) {
        tong = tong + sp.gia;  // Cộng giá từng sản phẩm
    }
    return tong;
}
```

### 🔐 Trường Hợp 3: Làm Đăng Nhập/Đăng Ký

**Tình huống:** Cần làm hệ thống tài khoản người dùng

```
Bạn: /plan Làm tính năng đăng ký và đăng nhập cho website.
An toàn nhưng đơn giản.

Gravity:
Được! Đây là luồng hoạt động:

👤 ĐĂNG KÝ (Lần đầu dùng)
┌─────────────────────────────────────────┐
│  1. Người dùng nhập:                    │
│     - Email: abc@gmail.com              │
│     - Mật khẩu: ********                │
│     - Nhập lại mật khẩu: ********       │
│                                         │
│  2. Hệ thống kiểm tra:                  │
│     ✓ Email có đúng định dạng?          │
│     ✓ Mật khẩu đủ mạnh?                 │
│     ✓ 2 mật khẩu có giống nhau?         │
│     ✓ Email đã có người dùng chưa?      │
│                                         │
│  3. Nếu OK:                             │
│     → Lưu vào database                  │
│     → Gửi email xác nhận                │
│     → Chuyển đến trang đăng nhập        │
└─────────────────────────────────────────┘

🔑 ĐĂNG NHẬP (Lần sau)
┌─────────────────────────────────────────┐
│  1. Người dùng nhập:                    │
│     - Email: abc@gmail.com              │
│     - Mật khẩu: ********                │
│                                         │
│  2. Hệ thống kiểm tra:                  │
│     ✓ Email có trong hệ thống?          │
│     ✓ Mật khẩu có đúng?                 │
│                                         │
│  3. Nếu OK:                             │
│     → Cho vào trang chính               │
│     → Nhớ người dùng (Session/Cookie)   │
│                                         │
│  4. Nếu sai:                            │
│     → Thông báo "Sai email hoặc MK"     │
│     → Cho thử lại                       │
└─────────────────────────────────────────┘

🔒 BẢO MẬT:
- Mật khẩu phải được MÃ HÓA trước khi lưu
- Không bao giờ lưu mật khẩu dạng gốc
- Sử dụng HTTPS để truyền dữ liệu
```

### 🐛 Trường Hợp 4: Sửa Lỗi "Trang Trắng"

**Tình huống:** Website chỉ hiện trang trắng, không có gì

```
Bạn: /debug Website của tôi chỉ hiện trang trắng. 
Không có lỗi gì cả. Làm sao bây giờ?

Gravity:
Đừng lo! Trang trắng thường có nguyên nhân đơn giản.

🔍 KIỂM TRA TỪNG BƯỚC:

BƯỚC 1: Mở Console (bàn phím F12)
┌─────────────────────────────────────────┐
│  Xem có lỗi đỏ nào không?               │
│                                         │
│  ❌ Error: Uncaught TypeError...        │ ← Có lỗi!
│                                         │
│  Nếu có lỗi → Đọc thông báo lỗi         │
└─────────────────────────────────────────┘

BƯỚC 2: Kiểm tra HTML
┌─────────────────────────────────────────┐
│  Trong body có nội dung gì không?       │
│                                         │
│  <body>                                 │
│    <!-- Nếu trống = chưa có gì -->      │
│  </body>                                │
└─────────────────────────────────────────┘

BƯỚC 3: Kiểm tra CSS
┌─────────────────────────────────────────┐
│  Có thể nội dung bị ẩn:                 │
│                                         │
│  display: none;      ← Ẩn hoàn toàn     │
│  visibility: hidden; ← Ẩn nhưng còn chỗ│
│  opacity: 0;         ← Trong suốt      │
│  color: white;       ← Chữ trắng nền   │
│    background: white;  trắng = ko thấy │
└─────────────────────────────────────────┘

BƯỚC 4: Nguyên nhân thường gặp
┌─────────────────────────────────────────┐
│  ☑️ Quên đóng tag: <div> thiếu </div>   │
│  ☑️ Import sai đường dẫn                │
│  ☑️ JavaScript lỗi ở dòng đầu           │
│  ☑️ React/Vue chưa mount component      │
└─────────────────────────────────────────┘

Bạn có thể paste code để tôi xem cụ thể hơn không?
```

### 📊 Trường Hợp 5: Làm Dashboard Admin

**Tình huống:** Cần làm trang quản trị cho website

```
Bạn: /plan Làm trang admin để quản lý sản phẩm và đơn hàng.
Tôi muốn biết cần những gì.

Gravity:
Tuyệt! Trang Admin giống như "phòng điều khiển" của website.

🎛️ TRANG ADMIN CẦN CÓ:

1. SIDEBAR (Menu bên trái)
   ┌──────────────────┐
   │ 📊 Dashboard     │
   │ 👕 Sản phẩm      │
   │ 📦 Đơn hàng      │
   │ 👥 Khách hàng    │
   │ 📈 Thống kê      │
   │ ⚙️ Cài đặt       │
   └──────────────────┘

2. DASHBOARD (Trang chính)
   ┌────────────┬────────────┬────────────┐
   │ 💰 Doanh thu│ 📦 Đơn hàng│ 👥 Khách   │
   │ 50,000,000 │    127     │    89      │
   └────────────┴────────────┴────────────┘
   
   📈 Biểu đồ doanh thu theo tháng
   📋 Đơn hàng mới nhất

3. QUẢN LÝ SẢN PHẨM
   ┌─────┬────────────┬────────┬────────┬────────┐
   │ ID  │ Tên        │ Giá    │ Số lượng│ Hành động│
   ├─────┼────────────┼────────┼────────┼────────┤
   │ 1   │ Áo thun    │ 299k   │ 50     │ ✏️ 🗑️  │
   │ 2   │ Quần jeans │ 599k   │ 30     │ ✏️ 🗑️  │
   └─────┴────────────┴────────┴────────┴────────┘
   
   [+ Thêm sản phẩm mới]

4. QUẢN LÝ ĐƠN HÀNG
   - Xem danh sách đơn
   - Cập nhật trạng thái: Chờ xác nhận → Đang giao → Đã giao
   - In hóa đơn

Bạn muốn bắt đầu làm phần nào trước?
```

---

## 🎓 Phần 5: Học Theo Từng Cấp Độ

### Cấp độ 1: Người mới hoàn toàn 🌱

**Bạn nên:**
```
1. Bắt đầu với HTML + CSS
   /plan Tôi chưa biết gì, muốn học làm web đơn giản
   
2. Làm trang tĩnh (không có backend)
   - Trang giới thiệu bản thân
   - Trang blog cá nhân
   
3. Học JavaScript cơ bản
   /develop Giải thích JavaScript cho người mới
```

### Cấp độ 2: Biết cơ bản 🌿

**Bạn nên:**
```
1. Học framework (React/Vue)
   /plan Hướng dẫn học React từ đầu
   
2. Làm project có tính năng
   - Todo list
   - Ứng dụng thời tiết
   - Tính tiền
   
3. Kết nối với API
   /develop Cách gọi API để lấy dữ liệu
```

### Cấp độ 3: Có kinh nghiệm 🌳

**Bạn nên:**
```
1. Học backend (Node.js/Python)
   /plan Làm backend với Node.js và Express
   
2. Làm fullstack project
   - Website bán hàng hoàn chỉnh
   - Ứng dụng quản lý
   
3. Học database
   /database Thiết kế database cho website bán hàng
```

---

## 💡 Mẹo Sử Dụng Gravity Hiệu Quả

### Mẹo 1: Hỏi rõ ràng
```
❌ Kém: "Làm cho tôi website"

✅ Tốt: "Làm trang đăng nhập có 2 ô nhập email và mật khẩu, 
nút đăng nhập màu xanh, style hiện đại"
```

### Mẹo 2: Yêu cầu giải thích
```
Nếu chưa hiểu, hãy nói:
"Giải thích đơn giản hơn"
"Cho ví dụ thực tế"
"Giải thích như cho người mới"
```

### Mẹo 3: Làm từng bước
```
Đừng làm hết một lúc. Làm từng phần nhỏ:

1. /plan lập kế hoạch
   ↓ Xong thì...
2. /design thiết kế từng trang
   ↓ Xong thì...
3. /develop làm từng tính năng
   ↓ Xong thì...
4. /test kiểm tra từng phần
```

### Mẹo 4: Lưu lại những gì học được
```
/journal Hôm nay tôi học được cách làm...

Gravity sẽ tạo file ghi chép để bạn xem lại sau.
```

---

## 🆘 Khi Gặp Khó Khăn

### "Tôi không hiểu code này"
```
Paste code và nói:
"Giải thích từng dòng code này cho tôi hiểu"
```

### "Code không chạy"
```
/debug [paste lỗi]
"Đây là lỗi tôi gặp. Tìm và sửa giúp tôi"
```

### "Không biết bắt đầu từ đâu"
```
/plan [mô tả dự án]
"Hướng dẫn tôi làm từ đầu, từng bước một"
```

### "Muốn làm khác đi"
```
/brainstorm [ý tưởng]
"Có cách nào tốt hơn không?"
```

---

## 📝 Tổng Kết

```
┌─────────────────────────────────────────────────────────┐
│                  REMEMBER THIS!                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. /brainstorm → Nghĩ ý tưởng                         │
│  2. /plan      → Lập kế hoạch                          │
│  3. /design    → Thiết kế giao diện                    │
│  4. /develop   → Code                                   │
│  5. /test      → Kiểm tra                              │
│  6. /debug     → Sửa lỗi                               │
│  7. /review    → Xem lại                               │
│                                                         │
│  Không hiểu? → Hỏi Gravity giải thích đơn giản hơn!    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

*Tài liệu dành cho người mới bắt đầu*  
*Phong cách: Level 0 - ELI5*  
*Ngày tạo: 2026-01-14*
