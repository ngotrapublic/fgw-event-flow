# Báo cáo kiểm tra lại tính năng Borrow Public

**Ngày kiểm tra:** 2026-11-11  
**Phạm vi:** đối chiếu với `borrow-public-feature-review-2026-11-11.md`, kiểm tra code hiện tại, test backend/frontend, lint và production build.  
**Kết luận:** phần triển khai đã cải thiện rõ rệt và hoàn thành **17/18 đầu việc trong checklist gốc**. P0, P1 và P2 đã được xử lý ở mức chức năng; P3 còn thiếu Firestore Emulator integration test. Tuy nhiên, **chưa nên xác nhận production-ready** trước khi sửa mục High về HTTPS và các mục Medium dưới đây.

## 1. Các vấn đề còn lại

### HIGH-01 — Link production vẫn dùng HTTP, cookie phiên có thể không có `Secure`

**Bằng chứng**

- `server/.env:8` đặt `NODE_ENV=production`, nhưng `server/.env:35` đặt `APP_PUBLIC_URL=http://event.greenwichvietnam.edu.vn`.
- `server/.env.example:33` cũng dùng URL `http://`.
- `server/services/borrow-session-service.js:61-70` chỉ bật `secure` và dùng cookie `__Host-borrow` khi request được nhận diện là HTTPS; request HTTP dùng `borrow_session` không có `Secure`.
- `server/index.js:30-38` mặc định `trust proxy = 1` khi không có `TRUST_PROXY`; cấu hình hiện tại chưa khai báo biến này.

**Tác động**

- Link xác nhận có token trong query string có thể đi qua HTTP trước khi được redirect, làm lộ token trên mạng không tin cậy.
- Cookie session phát hành qua HTTP có thể bị nghe lén. `HttpOnly` chỉ chặn JavaScript đọc cookie, không mã hóa đường truyền.
- Nếu backend có thể được truy cập trực tiếp, mặc định tin một proxy hop có thể làm sai nhận diện IP/protocol và ảnh hưởng rate limit/cookie.

**Cách sửa đề xuất**

1. Đổi `APP_PUBLIC_URL` sang `https://event.greenwichvietnam.edu.vn` trong production và file example.
2. Ép HTTP redirect sang HTTPS ở reverse proxy trước khi request chứa token được ứng dụng xử lý; bật HSTS sau khi xác nhận toàn bộ domain chạy HTTPS.
3. Đặt `TRUST_PROXY` theo đúng IP/subnet proxy thực tế và firewall cổng backend khỏi truy cập trực tiếp.
4. Fail-fast khi `NODE_ENV=production` mà `APP_PUBLIC_URL` không phải HTTPS.
5. Trên request HTTPS, chỉ chấp nhận cookie `__Host-borrow`; không fallback sang `borrow_session` như tại `server/services/borrow-session-service.js:44-49`.

**Tiêu chí nghiệm thu**

- Mọi link email bắt đầu bằng `https://`.
- Response tạo/verify/exchange trên production phát `Set-Cookie: __Host-borrow=...; Secure; HttpOnly; SameSite=Lax; Path=/`.
- HTTP chỉ redirect và không chạy endpoint verify/exchange.
- Không thể truy cập trực tiếp cổng Node từ Internet.

---

### MEDIUM-01 — One-time link bị consume trước khi kiểm tra đúng tài khoản

**Bằng chứng**

- `server/controllers/borrow-public-controller.js:419` gọi `exchangeOneTimeLinkCode(code)`.
- `server/services/borrow-link-service.js:66` ghi `consumedAt` ngay trong transaction.
- Chỉ sau đó `server/controllers/borrow-public-controller.js:421-424` mới kiểm tra request có thuộc tài khoản đang đăng nhập hay không.

**Kịch bản lỗi**

Người dùng đang đăng nhập tài khoản B nhưng mở email link của tài khoản A trên cùng trình duyệt. API trả `403`, nhưng link của A đã bị consume; khi A thử lại, link đã hết hiệu lực.

**Cách sửa đề xuất**

- Truyền `viewerUid` vào `exchangeLinkCode` và kiểm tra owner **bên trong cùng Firestore transaction, trước khi** ghi `consumedAt`.
- Thêm test `cross_account_exchange_must_not_consume_code`:
  1. B exchange link của A và nhận `403`.
  2. A hoặc guest hợp lệ vẫn exchange chính code đó thành công đúng một lần.

---

### MEDIUM-02 — Thiếu secret HMAC riêng; production có thể rơi về key mặc định/có thể đoán

**Bằng chứng**

- `server/services/borrow-token-service.js:6-10` lần lượt fallback từ `BORROW_HMAC_SECRET` sang `JWT_SECRET`, `FIREBASE_PROJECT_ID`, rồi chuỗi cố định `borrow-hmac-default-key`.
- Các file môi trường hiện tại không khai báo `BORROW_HMAC_SECRET`.

**Tác động**

HMAC được dùng cho khóa quota/rate-limit của email và số điện thoại. Nếu dữ liệu Firestore bị lộ, key mặc định hoặc project ID công khai cho phép dò offline các giá trị có không gian nhỏ như SĐT; các môi trường cũng có thể dùng chung key ngoài ý muốn.

**Cách sửa đề xuất**

- Tạo `BORROW_HMAC_SECRET` ngẫu nhiên tối thiểu 32 byte cho từng môi trường, lưu trong secret manager.
- Không fallback sang project ID hoặc chuỗi mặc định ở production; fail-fast nếu thiếu.
- Chỉ thêm tên biến và hướng dẫn sinh secret vào `.env*.example`, không commit giá trị thật.

---

### MEDIUM-03 — Tạo request đã commit trước khi tạo link; lỗi giữa chừng để lại phiếu/quota mồ côi

**Bằng chứng**

- `server/controllers/borrow-public-controller.js:235-244` commit quota và `borrow_requests` trong transaction.
- `server/controllers/borrow-public-controller.js:254` mới tạo link code ở thao tác Firestore riêng.
- Với guest, email được gửi rồi `server/controllers/borrow-public-controller.js:272` mới cấp session cookie.

**Kịch bản lỗi**

- Nếu ghi `borrow_link_codes` lỗi, API trả 500 nhưng request và quota đã tồn tại; client retry có thể tạo phiếu trùng.
- Nếu email thành công nhưng cấp session lỗi, người dùng thấy request thất bại dù email/request đã tồn tại; retry cũng có thể tạo trùng.

**Cách sửa đề xuất**

- Sinh raw link code trước, nhưng ghi hash của code trong cùng transaction tạo request/quota.
- Dùng idempotency key cho create hoặc cơ chế tìm lại request vừa tạo khi client retry.
- Sau khi email đã thành công, xem việc cấp session là best-effort hoặc trả response thành công kèm đường phục hồi rõ ràng; không biến lỗi session thành tín hiệu “request chưa được tạo”.
- Thêm fault-injection tests cho lỗi ghi link code và lỗi tạo session sau khi email đã gửi.

---

### MEDIUM-04 — Chưa có Firestore Emulator integration tests

**Bằng chứng**

- Checklist gốc yêu cầu Firestore Emulator integration test.
- `server/tests/firestoreRules.test.js:1-5` tự ghi rõ đây chỉ là static regex test và semantics đầy đủ cần Emulator.
- `server/package.json` chưa có dependency/script chạy `@firebase/rules-unit-testing` hoặc Firestore Emulator.

**Tác động**

Mock hiện tại chưa xác nhận được hành vi transaction retry, query/index thật, security rules và các race condition trên SDK/Firestore thực.

**Tối thiểu cần thêm**

- Rules tests: client không đọc/ghi được `borrow_requests`, `borrow_otps`, `borrow_sessions`, `borrow_link_codes`, `borrow_quotas`, `borrow_reminder_outbox`.
- Transaction tests: concurrent guest/account quota, concurrent OTP counter, one-time link exchange.
- Query/index smoke tests cho các query được reminder job và public controller sử dụng.
- Một lệnh CI duy nhất khởi động emulator rồi chạy suite.

---

### LOW-01 — Verify token vẫn nằm trong address bar/history suốt vòng đời trang

`client/src/components/borrow/BorrowVerify.jsx:33-36` đọc `?token=...`, nhưng không xóa query string sau khi copy token. Trong khi đó, `BorrowManage.jsx:29-31` đã làm đúng bằng `history.replaceState` ngay sau khi đọc fragment.

Server đã giảm rủi ro bằng `Cache-Control: no-store`, `Referrer-Policy: no-referrer` và token one-time. Dù vậy, nên xóa query ngay sau khi đọc để tránh token lưu trong browser history, screenshot hoặc bị copy nhầm.

---

### LOW-02 — Reminder là at-least-once khi process chết đúng cửa sổ sau gửi mail

Lease/claim transaction hiện đã ngăn hai worker gửi đồng thời, và test multi-worker đang pass. Tuy nhiên email được gửi tại `server/jobs/borrow-reminder-job.js:321-326` rồi trạng thái mới được hoàn tất; `completeOutboxSlot` tại `:139-154` cũng cập nhật outbox/request bằng hai write riêng. Nếu process chết sau khi provider nhận email nhưng trước khi đánh dấu `sent`, lease hết hạn sẽ cho phép gửi lại.

Nếu yêu cầu nghiệp vụ là “không bao giờ gửi trùng”, cần dùng idempotency key/delivery ID được email provider hỗ trợ. Nếu provider không hỗ trợ, nên ghi rõ hệ thống bảo đảm **không gửi đồng thời**, nhưng vẫn có xác suất duplicate khi crash/retry.

---

### LOW-03 — HTTP rate limiter vẫn là memory-local

`express-rate-limit` hiện dùng store mặc định theo từng process. Firestore quota/counter đã bảo vệ các giới hạn quan trọng, nên đây không còn là lỗi chính. Tuy nhiên, IP limiter sẽ bị nhân theo số instance. Nếu cần giới hạn toàn cụm chính xác, chuyển store sang Redis hoặc datastore dùng chung.

## 2. Đối chiếu checklist gốc

| Nhóm | Kết quả | Ghi chú |
|---|---:|---|
| P0 — Security/session | **4/4** | Verify one-time, one-time management code, HttpOnly session có TTL/revocation và regression tests đã có. Vẫn phải xử lý cấu hình HTTPS ở HIGH-01 trước production. |
| P1 — Reliability/abuse | **5/5** | Outbox lease, OTP transaction, quota account/guest, stock policy và timezone Việt Nam đã được triển khai. Outbox còn crash window ở LOW-02. |
| P2 — Mobile UX/a11y | **5/5** | CTA/hierarchy, error states, OTP semantic, dialog/reduced motion, touch target/out-of-stock/contrast đều đã được xử lý. |
| P3 — Maintainability | **3/4** | Component chính đều dưới 500 dòng, logic dùng chung và Vitest/Testing Library/axe đã có; còn thiếu Firestore Emulator integration test. |
| **Tổng** | **17/18** | Chưa production-ready vì HIGH-01 và bốn mục Medium về correctness, hardening và độ tin cậy kiểm thử. |

### Các điểm đáng chú ý đã làm đúng

- Link quản lý dùng fragment `#code`, được xóa khỏi address bar trước khi exchange; không còn lưu bearer token vào `localStorage`.
- Verify token chỉ chuyển trạng thái một lần; replay và concurrent verify đã có test.
- OTP request/verify và quota được bảo vệ bằng Firestore transaction.
- Stock policy đã được chốt rõ: gửi yêu cầu chưa giữ kho; chỉ giữ khi admin duyệt (`BorrowStatus.jsx:22`, `GuestCreatedScreen.jsx:55`, `DueDatePicker.jsx:84`).
- Thiết bị hết hàng vẫn hiển thị nhưng disabled; fetch error có state và nút retry riêng.
- Các component chính hiện đều dưới 500 dòng: `BorrowForm` 484, `BorrowHome` 442, `BorrowReturn` 416, `BorrowRequestCard` 232.

## 3. Kết quả xác minh đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Backend Jest: public/admin/stock/reminder/rules | **PASS — 5 suites, 87 tests** |
| Frontend Vitest + Testing Library + axe | **PASS — 1 file, 5 tests** |
| Production build | **PASS — 4.057 modules** |
| ESLint | **Exit 0**, còn 5 warning không thuộc Borrow |

Production build vẫn cảnh báo main chunk khoảng 718 kB minified (195 kB gzip), nhưng các Borrow route đã được lazy-load thành chunk riêng khoảng 18–25 kB. Đây là cải thiện đúng hướng và không chặn checklist Borrow hiện tại.

## 4. Test còn nên bổ sung

1. `cross_account_exchange_must_not_consume_code`.
2. `create_link_failure_rolls_back_request_and_quota` hoặc transaction chung chứng minh không có trạng thái nửa vời.
3. `session_issue_failure_after_email_does_not_create_duplicate_on_retry`.
4. Firestore Emulator suite nêu ở MEDIUM-04.
5. `https_request_rejects_legacy_http_cookie`.
6. UI test xác nhận verify page xóa token khỏi URL ngay lập tức.
7. Test focus trap, Escape và restore focus của dialog; axe không tự chứng minh các hành vi này.

## 5. Thứ tự sửa đề xuất

1. **Trước deploy:** HIGH-01 (HTTPS, `TRUST_PROXY`, cookie policy).
2. **Correctness/security:** MEDIUM-01 và MEDIUM-02.
3. **Reliability:** MEDIUM-03.
4. **CI confidence:** MEDIUM-04.
5. Sau đó xử lý các mục Low nếu yêu cầu vận hành cần bảo đảm chặt hơn.

## 6. Trạng thái working tree khi kiểm tra

Ngoài file báo cáo, working tree đang có ba thay đổi chỉ là thêm dòng trống cuối file:

- `server/services/borrow-link-service.js`
- `server/services/borrow-quota-service.js`
- `server/services/borrow-session-service.js`

Các thay đổi này không ảnh hưởng chức năng, nhưng nên quyết định giữ hoặc loại bỏ trước khi commit để diff sạch.
