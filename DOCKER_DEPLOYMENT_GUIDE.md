# 🐳 Antigravity — Hướng Dẫn Triển Khai Docker Production (Docker Deployment Guide)

Tài liệu này hướng dẫn chi tiết quy trình đóng gói, cấu hình môi trường và vận hành ứng dụng **Antigravity** trong môi trường Docker Production, sử dụng chiến lược **Single Docker Image** kết hợp **Docker Compose**.

---

## 📐 1. Tổng Quan Kiến Trúc (Architecture Overview)

Ứng dụng được đóng gói thành một Docker Image đơn nhất nhằm tối ưu chi phí hạ tầng và đơn giản hóa quy trình vận hành:

- **Multi-stage Build:**
  - **Stage 1 (Builder):** Sử dụng `node:18-alpine` để biên dịch React static files vào `dist/`.
  - **Stage 2 (Runtime):** Sử dụng `node:18-bullseye-slim` (Debian-based) tích hợp sẵn Google Chrome Stable & `dumb-init` cho Puppeteer xuất PDF/Excel.
- **Single Express Server (ADR-002):** Node.js Express phục vụ song song cả API endpoints (`/api/*`) và các file tĩnh React (`/`).
- **Storage Persistence (ADR-004):** Sử dụng Docker Named Volume `antigravity_exports` gắn vào `/usr/src/app/server/public/exports` để lưu vết các file xuất dữ liệu đêm.
- **Process Management (H-03):** Chạy dưới dạng non-root user (`node`) cùng với `dumb-init` quản lý PID 1 để bắt tín hiệu (`SIGTERM`, `SIGINT`) và dọn dẹp các tiến trình con Chrome (zombie processes).

---

## 🛠️ 2. Yêu Cầu Hạ Tầng (Prerequisites)

Hệ thống host cần cài đặt sẵn:
- **Docker Engine:** `v20.10.0` trở lên
- **Docker Compose:** `v2.0.0` trở lên (gói đi kèm Docker Desktop hoặc Docker CLI)

---

## ⚙️ 3. Cấu Hình Biến Môi Trường (.env)

Trước khi chạy container, copy file `.env.example` thành `.env` tại thư mục gốc dự án:

```bash
cp .env.example .env
```

### Chi tiết các biến môi trường:

| Biến Môi Trường | Loại | Mô Tả | Ví Dụ / Mặc Định |
| :--- | :--- | :--- | :--- |
| `PORT` | Cấu hình | Cổng Host mapped ra ngoài | `5000` |
| `NODE_ENV` | Cấu hình | Môi trường ứng dụng | `production` |
| `FIREBASE_PROJECT_ID` | **Bắt buộc** | Project ID của Firebase Firestore | `your-firebase-project-id` |
| `FIREBASE_CLIENT_EMAIL` | **Bắt buộc** | Email Service Account Firebase | `firebase-adminsdk-xxx@...` |
| `FIREBASE_PRIVATE_KEY` | **Bắt buộc** | Private Key của Firebase (bọc ngoặc đôi) | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `EMAIL_USER` | **Bắt buộc** | Email gửi thông báo tự động (SMTP) | `your-email@gmail.com` |
| `EMAIL_PASS` | **Bắt buộc** | Mật khẩu ứng dụng (App Password) | `xxxx-xxxx-xxxx-xxxx` |
| `ALLOWED_ORIGINS` | Cấu hình | Danh sách domain external được gọi API | `http://localhost:5000,http://localhost:5173` |

---

## 🚀 4. Các Bước Triển Khai Nhanh (Quick Start)

### Bước 1: Clone Repository & Tạo `.env`
```bash
cd antigravity
cp .env.example .env
# Chỉnh sửa .env và điền chính xác thông tin Firebase & SMTP
```

### Bước 2: Build & Khởi Chạy Container
```bash
docker compose up -d --build
```

### Bước 3: Kiểm Tra Trạng Thái
```bash
docker compose ps
```
Nếu thấy container `antigravity-app` hiển thị trạng thái `running (healthy)` là ứng dụng đã khởi chạy thành công!

TRUY CẬP ỨNG DỤNG TẠI: `http://localhost:5000` (hoặc IP của Server).

---

## 🔄 4.1. Quy Trình Cập Nhật Tự Động Khi Có Code Mới (Auto-Update Workflow)

Mỗi khi bạn có sự thay đổi về source code (frontend, backend, thêm package npm hoặc sửa logic):

### Lệnh cập nhật duy nhất:
```bash
docker compose up -d --build
```

**Cơ chế tự động của Dockerfile:**
1. **Auto Rebuild Frontend:** Dockerfile tự động build lại giao diện React mới nhất (`npm run build`) trong Stage 1 (Builder).
2. **Auto Bundle:** Tự động chép file build mới vào Express Server trong Stage 2 (Runtime).
3. **Zero Downtime / Safe Update:** Tự động dừng container cũ và chạy container mới. Dữ liệu đã lưu (`antigravity_exports` volume) và các cài đặt `.env` **hoàn toàn được giữ nguyên**, không bị mất!

---

## 🔍 5. Kiểm Tra Sức Khỏe & Giám Sát (Health Check & Monitoring)

- **Liveness Probe Endpoint:** `GET http://localhost:5000/health`
  - Đã được tích hợp sẵn vào `HEALTHCHECK` directive của Docker (ping mỗi 30 giây).
- **Xem Log Thời Gian Thực:**
  ```bash
  docker compose logs -f antigravity
  ```
- **Kiểm Tra Tài Nguyên Container:**
  ```bash
  docker stats antigravity-app
  ```

---

## 💾 6. Quản Lý Dữ Liệu Dài Hạn (Volume Persistence & Backup)

File CSV/Excel xuất hàng đêm được lưu trữ an toàn trong Docker Volume `antigravity_exports`. Dữ liệu sẽ **KHÔNG BỊ MẤT** kể cả khi rebuild hoặc xóa container.

### Sao lưu (Backup Volume):
```bash
docker run --rm -v antigravity_exports:/volume -v $(pwd):/backup ubuntu tar cvf /backup/antigravity_exports_backup.tar -C /volume .
```

### Phục hồi (Restore Volume):
```bash
docker run --rm -v antigravity_exports:/volume -v $(pwd):/backup ubuntu tar xvf /backup/antigravity_exports_backup.tar -C /volume
```

---

## 🛑 7. Tắt & Dọn Dẹp Ứng Dụng (Stop & Teardown)

- **Dừng Container (vẫn giữ dữ liệu volume):**
  ```bash
  docker compose down
  ```
- **Dừng Container & Xóa luôn Volume (CẨN THẬN):**
  ```bash
  docker compose down -v
  ```

---

## ❓ 8. Xử Lý Lỗi Thường Gặp (Troubleshooting)

### 1. Container crash báo lỗi Firebase Authentication
- **Nguyên nhân:** Biến `FIREBASE_PRIVATE_KEY` thiếu dấu xuống dòng `\n` hoặc sai thông tin `FIREBASE_CLIENT_EMAIL`.
- **Khắc phục:** Đảm bảo `FIREBASE_PRIVATE_KEY` được bọc trong cặp dấu ngoặc đôi `"..."` trong file `.env`.

### 2. Puppeteer crash OOM (Out Of Memory)
- **Nguyên nhân:** Server host bị thiếu RAM.
- **Khắc phục:** Đảm bảo Server host có tối thiểu **1.5GB - 2GB RAM** trống.

### 3. File `.sh` bị lỗi line endings trên Windows
- **Nguyên nhân:** Git checkout trên Windows tự chuyển đổi `LF` sang `CRLF`.
- **Khắc phục:** Dockerfile đã tự động chạy `sed -i 's/\r$//' entrypoint.sh` nên sự cố này đã được triệt tiêu hoàn toàn.

---
*Tài liệu được cập nhật tự động theo chuẩn Phase 4 Docker Deployment Bundle — Antigravity Engineering Team.*
