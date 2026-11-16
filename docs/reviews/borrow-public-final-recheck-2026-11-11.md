# Báo cáo re-check Borrow Public sau vòng fix thứ hai

**Ngày kiểm tra:** 2026-11-11  
**Phạm vi:** kiểm tra hai commit `e4784e3` và `4c63e64`, đối chiếu toàn bộ finding trong `borrow-public-follow-up-audit-2026-11-11.md`, chạy test/lint/build và thử kết nối hạ tầng public.  
**Kết luận:** các lỗi logic/security trọng yếu trong report trước đã được sửa đúng ở cấp code. Tuy nhiên, **chưa thể xác nhận hoàn tất 100% hoặc production-ready** vì còn một blocker vận hành có điều kiện, ba vấn đề Medium và một số giới hạn Low.

## 1. Những finding cũ đã được xử lý đúng

| Finding cũ | Trạng thái | Bằng chứng chính |
|---|---|---|
| HIGH-01 — HTTPS/HMAC/trust proxy | **Đã sửa ở code** | `server/config/borrow-security.js` fail-fast với HTTP/secret yếu; cookie HTTPS không còn nhận cookie HTTP; Nginx example và Docker bind loopback đã có. Việc deploy thật chưa xác nhận, xem HIGH-RECHECK-01. |
| MEDIUM-01 — Cross-account làm cháy link | **Đã sửa** | Owner được kiểm tra trong transaction trước `consumedAt` tại `server/services/borrow-link-service.js:90-98`; regression test pass. |
| MEDIUM-02 — HMAC fallback không an toàn | **Đã sửa** | Production bắt buộc `BORROW_HMAC_SECRET` tối thiểu 32 byte và không fallback tại `server/config/borrow-security.js:15-47`. |
| MEDIUM-03 — Request/link không atomic | **Đã sửa** | Request, quota, link code và idempotency marker được commit cùng transaction tại `server/controllers/borrow-public-controller.js:253-283`; session failure sau email là non-fatal. |
| MEDIUM-04 — Thiếu Emulator suite | **Đã thêm code test** | Có `server/tests/emulator/borrow.emulator.test.js` và script `test:emulator`; nhưng suite chưa chạy được trong môi trường hiện tại, xem MEDIUM-RECHECK-02. |
| LOW-01 — Verify token còn trên URL | **Đã sửa** | `BorrowVerify.jsx` copy token rồi xóa query bằng `replaceState`/router replace; UI regression test pass. |
| LOW-02 — Hai write hoàn tất reminder không atomic | **Đã cải thiện** | Chuyển sang Firestore batch tại `server/jobs/borrow-reminder-job.js:145-160`. Crash window SMTP vẫn tồn tại và đã được document rõ. |
| LOW-03 — Rate limiter memory-local | **Chưa đổi, chấp nhận có điều kiện** | Firestore quota/counter vẫn là lớp bảo vệ chính; IP limiter tiếp tục nhân theo số instance. |

## 2. Vấn đề còn lại

### HIGH-RECHECK-01 — Chưa xác minh được deployment HTTPS thực tế

**Kết quả kiểm tra ngày 2026-11-11**

- `event.greenwichvietnam.edu.vn` phân giải DNS thành công.
- TCP port `80`: không kết nối được.
- TCP port `443`: không kết nối được.
- TCP port `5000`: không kết nối được — đây là kết quả đúng nếu backend đã được firewall/bind loopback.
- Cả HTTP và HTTPS đều không thể lấy response header từ môi trường kiểm tra.

**Đánh giá**

Code đã có fail-fast, HSTS middleware, Nginx example và URL HTTPS. Nhưng file cấu hình mẫu không chứng minh certificate/reverse proxy đang chạy trên server thật. Nếu domain này đáng lẽ đã public, port 80/443 đóng là blocker vận hành. Nếu hệ thống chưa deploy, mục này là bước nghiệm thu bắt buộc trước go-live.

**Tiêu chí đóng finding**

1. `curl -I http://event.greenwichvietnam.edu.vn/borrow` trả `301/308` sang HTTPS.
2. `curl -I https://event.greenwichvietnam.edu.vn/borrow` trả `200` và có `Strict-Transport-Security`.
3. Verify/create/exchange qua HTTPS phát cookie `__Host-borrow` với `Secure; HttpOnly; SameSite=Lax; Path=/`.
4. Port `5000` vẫn không truy cập được từ Internet.

---

### MEDIUM-RECHECK-01 — Cấu hình production theo file vẫn không nhất quán

**Bằng chứng**

- `server/index.js:4-18` chỉ load `.env` rồi chạy security validation.
- `server/config/firebase.js:5-11` mới load `.env.production`, nhưng module này chỉ được require sau security validation.
- Vì vậy, nếu vận hành bằng `server/.env.production`, các biến trong file đó không có mặt khi validation chạy; thậm chí `NODE_ENV` đặt bên trong file cũng chưa được đọc để chọn đúng môi trường.
- `server/.env.production.example:1-27` vẫn thiếu `APP_PUBLIC_URL`, `BORROW_HMAC_SECRET`, `TRUST_PROXY`, `ALLOWED_ORIGINS`; file còn dùng biến `CORS_ORIGIN` trong khi code đọc `ALLOWED_ORIGINS`.

Docker path dùng root `.env` hiện không gặp lỗi này, nhưng non-Docker/server-local deployment theo `.env.production.example` sẽ fail-fast hoặc load nhầm `.env.development`.

**Cách sửa đề xuất**

- Tạo một module load-env duy nhất, chọn `.env.production/.env.staging/.env.development` **trước mọi validation và trước khi require routes/services**.
- Hoặc bỏ cơ chế file theo môi trường và chỉ hỗ trợ environment variables/root `.env`, đồng thời xóa template gây hiểu nhầm.
- Cập nhật `server/.env.production.example` với đúng bốn biến bắt buộc và đổi `CORS_ORIGIN` thành `ALLOWED_ORIGINS`.
- Thêm process-level test khởi động app chỉ với một `.env.production` tạm và xác nhận đúng config được load.

---

### MEDIUM-RECHECK-02 — Emulator suite đã có nhưng chưa chạy được và chưa được pin/CI hóa

**Kết quả thực tế**

Lệnh `npm run test:emulator` chưa chạy được test nào. Firebase CLI `15.35.0` dừng trước khi khởi động Emulator vì máy hiện có Java `1.7.0_04`, trong khi CLI yêu cầu JDK 21 trở lên.

**Khoảng trống**

- `server/package.json:7` dùng `npx --yes firebase-tools`, vì vậy mỗi lần có thể tải một phiên bản CLI mới khác nhau.
- `firebase-tools` chưa được pin trong `devDependencies`/lockfile.
- Không thấy workflow CI nào chạy `npm run test:emulator`.
- Comment trong test ghi “JDK 17/21+”, nhưng CLI hiện được tải yêu cầu Java 21.

**Cách sửa đề xuất**

1. Cài JDK 21 cho local/CI hoặc chạy Emulator trong container có JDK 21.
2. Pin `firebase-tools` vào `devDependencies` và gọi binary local, tránh `npx --yes` tải latest.
3. Thêm CI job với Java 21 chạy `npm ci && npm run test:emulator`.
4. Chỉ đánh dấu P3 hoàn tất sau khi suite Emulator pass ít nhất một lần trong môi trường tái lập được.

---

### MEDIUM-RECHECK-03 — Idempotency record lưu PII thô và không thực sự hết hạn

**Bằng chứng**

- `server/controllers/borrow-public-controller.js:219-221` tạo `ownerScope` chứa UID hoặc `guest:<email>:<phone>`.
- `server/controllers/borrow-public-controller.js:274-280` lưu nguyên `ownerScope` vào `borrow_idempotency`.
- `expiresAt` được lưu dưới dạng number, không có TTL policy/cleanup job trong repo.
- Logic idempotent hit tại `:253-263` không kiểm tra `expiresAt`, nên marker được coi là hợp lệ vô thời hạn nếu không bị xóa thủ công.

**Tác động**

- Tạo thêm bản sao email và số điện thoại không cần thiết trong Firestore.
- Collection tăng vô hạn, trái với ý nghĩa `expiresAt` và tăng chi phí/retention risk.
- Một idempotency key cũ về mặt logic vẫn có hiệu lực mãi mãi.

**Cách sửa đề xuất**

- Không lưu raw `ownerScope`; chỉ cần request ID và request fingerprint đã HMAC/hash hoặc bỏ field này hoàn toàn.
- Lưu `expiresAt` bằng Firestore `Timestamp` và cấu hình TTL policy/scheduled cleanup.
- Trong transaction, chỉ chấp nhận idempotent hit khi marker chưa hết hạn; marker hết hạn phải được thay thế an toàn.
- Thêm test `expired_idempotency_key_creates_new_request_and_replaces_marker` và test không có email/phone thô trong document.

---

### MEDIUM-RECHECK-04 — Toàn bộ backend test suite vẫn đỏ

Lệnh `npm test -- --runInBand` cho kết quả:

- **15 suites pass, 3 suites fail**.
- **177 tests pass, 18 tests fail**.
- Các suite fail: `splitScreen.template.test.js`, `round2Bugs.test.js`, `eventController.payloadSanitize.test.js`.

Các lỗi này không thuộc Borrow và targeted Borrow suite vẫn pass 95/95. Tuy nhiên, nếu `npm test` là quality gate chung thì branch hiện chưa xanh và chưa nên merge/deploy mà không xác định các failure là baseline đã chấp nhận hay regression.

---

### LOW-RECHECK-01 — Crash sau DB commit nhưng trước gửi mail vẫn tạo trạng thái “deduplicated” chưa gửi email

Flow hiện tại commit request/link/idempotency trước, sau đó mới gửi email. Nếu process chết ngay sau transaction:

1. Client retry cùng `Idempotency-Key`.
2. Server thấy marker và trả request cũ với `deduplicated: true`.
3. Nhánh idempotent hit không gửi lại email.
4. Guest UI có thể nói kiểm tra email dù email đầu tiên chưa từng được gửi.

Guest vẫn có thể phục hồi nhờ session và nút resend/OTP, nên đây chưa phải mất dữ liệu. Cách bền vững hơn là ghi trạng thái delivery/outbox cùng transaction và để worker gửi/retry email, hoặc cho idempotent retry nhận biết `emailDispatchedAt` chưa có để tái tạo delivery an toàn.

---

### LOW-RECHECK-02 — OTP document vẫn dùng SHA-256 của số điện thoại và có thể tồn tại vô hạn khi không verify

`server/controllers/borrow-public-controller.js:664-665` và `:752-754` dùng `hash(phone)` làm document ID. OTP chỉ bị xóa khi verify đúng tại `:773`; OTP hết hạn nhưng không được verify không có cleanup/TTL.

Collection đã bị deny với client SDK nên rủi ro thấp hơn, nhưng SHA-256 của không gian SĐT nhỏ có thể bị enumerate nếu datastore bị lộ. Nên dùng `hmacKey('otp:' + phone)` nhất quán với rate limit/quota và thêm TTL cleanup cho OTP hết hạn.

## 3. Kết quả xác minh

| Kiểm tra | Kết quả |
|---|---|
| Targeted Borrow backend | **PASS — 6 suites, 95 tests** |
| Frontend Borrow Vitest/Testing Library/axe | **PASS — 1 file, 7 tests** |
| Frontend production build | **PASS — 4.057 modules** |
| ESLint | **PASS với 5 warning cũ ngoài Borrow, 0 error** |
| Full backend Jest | **FAIL — 3 suites/18 tests ngoài Borrow** |
| Firestore Emulator | **BLOCKED trước test — cần JDK 21** |
| Public HTTP/HTTPS | **Không kết nối được port 80/443 từ môi trường kiểm tra** |

Build vẫn cảnh báo main chunk khoảng 718 kB minified, nhưng Borrow routes tiếp tục được lazy-load thành chunk riêng và đây không phải blocker của tính năng Borrow.

## 4. Thứ tự xử lý đề xuất

1. Nếu domain đã được coi là live: xử lý/kiểm tra **HIGH-RECHECK-01** ngay.
2. Sửa config loader và `server/.env.production.example` ở **MEDIUM-RECHECK-01**.
3. Pin Firebase CLI, dùng JDK 21 và chạy Emulator suite thật ở **MEDIUM-RECHECK-02**.
4. Sửa retention/PII của idempotency marker ở **MEDIUM-RECHECK-03**.
5. Xác định baseline hoặc sửa full backend suite ở **MEDIUM-RECHECK-04**.
6. Sau đó xử lý hai mục Low nếu muốn hoàn thiện reliability/privacy.

## 5. Working tree khi kiểm tra

Năm file đang modified chỉ vì thêm một dòng trống cuối file:

- `deploy/nginx-borrow-tls.conf.example`
- `server/config/borrow-security.js`
- `server/jest.config.js`
- `server/jest.emulator.config.js`
- `server/tests/borrow-security.test.js`

Ngoài ra có các file report và một file `.docx` chưa track. Các trạng thái này không ảnh hưởng kết quả test nhưng nên dọn/commit có chủ đích để tránh đưa file ngoài phạm vi vào commit.
