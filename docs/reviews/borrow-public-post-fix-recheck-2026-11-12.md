# Báo cáo re-check Borrow Public sau report final

**Ngày kiểm tra:** 2026-11-12  
**Branch/commit:** `feat/equipment-borrow` tại `330077d`  
**Report đối chiếu:** `docs/reviews/borrow-public-final-recheck-2026-11-11.md`  
**Phạm vi:** review code sau hai commit `0daa761`, `330077d`; chạy lại backend/frontend test, lint, build; thử Firestore Emulator; kiểm tra CI/remote; kiểm tra trực tiếp deployment `event.greenwichvietnam.edu.vn`.

## Kết luận

Các lỗi chính trong report trước đã được sửa đúng ở cấp code: env loader thống nhất, template production đúng biến, idempotency/OTP không còn lưu định danh thô và có thời hạn dọn dẹp, Firebase CLI đã được pin, full backend suite đã xanh. Tuy nhiên, **chưa thể đánh dấu hoàn tất/production-ready** vì còn:

- **1 blocker deployment:** production hiện chưa có API/artefact Borrow của branch này.
- **3 vấn đề Medium:** race khi khôi phục email idempotent, privacy headers không áp dụng cho HTML do thứ tự middleware, Emulator/CI chưa có một lượt chạy thành công.
- **2 vấn đề Low:** script deploy báo sai trạng thái port 5000 và account flow chưa khôi phục side effect sau crash.

## 1. Trạng thái các finding từ report trước

| Finding cũ | Trạng thái sau re-check | Bằng chứng |
|---|---|---|
| HIGH-RECHECK-01 — HTTPS deployment | **Đã đạt một phần, chưa đóng** | Port 80 redirect 301 sang HTTPS; port 443 trả 200 + HSTS; port 5000 không kết nối được. Tuy nhiên API Borrow production vẫn 404 và chưa thể kiểm tra cookie thật. Xem HIGH-POST-01. |
| MEDIUM-RECHECK-01 — env loader/template | **Đã sửa** | `server/config/load-env.js` load env trước validation; process-level test với `.env.production` pass; template có đúng các biến bắt buộc. |
| MEDIUM-RECHECK-02 — Emulator/pin/CI | **Đã sửa hạ tầng test, chưa có kết quả chạy** | `firebase-tools@15.35.0` đã pin và workflow dùng JDK 21. Local vẫn dừng trước test do Java 7; branch chưa có remote/CI run. Xem MEDIUM-POST-03. |
| MEDIUM-RECHECK-03 — idempotency PII/TTL | **Đã sửa** | Marker dùng `ownerHash`, `createdAt`/`expiresAt` là Firestore Timestamp, logic kiểm tra hết hạn và cleanup job đã có test. |
| MEDIUM-RECHECK-04 — full backend suite đỏ | **Đã sửa** | Lần chạy cuối: 18/18 suites, 189/189 tests pass. |
| LOW-RECHECK-01 — crash trước email | **Đã cải thiện nhưng chưa an toàn khi đồng thời** | Retry tuần tự gửi lại email thành công; concurrent retry/create vẫn có race. Xem MEDIUM-POST-01. |
| LOW-RECHECK-02 — OTP SHA(phone)/retention | **Đã sửa** | OTP document ID dùng HMAC và có `retainUntil` + cleanup. |

## 2. Vấn đề còn lại

### HIGH-POST-01 — Production chưa deploy tính năng Borrow của branch hiện tại

**Bằng chứng trực tiếp ngày 2026-11-12**

- `http://event.greenwichvietnam.edu.vn/borrow` trả `301` sang HTTPS.
- `https://event.greenwichvietnam.edu.vn/borrow` trả `200` và có `Strict-Transport-Security`.
- TCP port `5000` không truy cập được từ Internet — đây là kết quả đúng.
- `GET /api/borrow/resources` trả **404**.
- `POST /api/borrow/lookup/request` trả **404**.
- `origin/main` không có `server/routes/borrow.js`; branch `feat/equipment-borrow` hiện không có upstream remote.
- HTML production đang tham chiếu bundle `index-CjWISvGx.js`, khác bundle vừa build từ branch (`index-Ooz5KqxU.js`).

`/borrow` trả 200 ở đây chỉ là SPA fallback của bản production cũ, không chứng minh feature Borrow hoạt động. Vì API Borrow 404, người dùng không thể tải thiết bị, tạo phiếu, OTP hoặc quản lý phiếu trên production.

**Cách đóng finding**

1. Push branch/merge theo quy trình và deploy lại image được build từ đúng commit.
2. Xác nhận `GET /api/borrow/resources` không còn 404.
3. Chạy smoke test guest: tải danh sách → tạo phiếu → nhận email → verify → cookie `__Host-borrow` có `Secure; HttpOnly; SameSite=Lax; Path=/`.
4. Chạy smoke test account và OTP recovery.
5. Chạy lại `deploy/verify-https-deploy.sh` sau khi sửa LOW-POST-01.

---

### MEDIUM-POST-01 — Concurrent idempotent create/retry có thể gửi hai email và vô hiệu token trong email đầu

**Bằng chứng code**

- `server/controllers/borrow-public-controller.js:277-322`: khi marker đã tồn tại và `emailDispatchedAt` còn null, transaction luôn rotate token/link mới rồi trả `needsGuestVerifyDispatch: true`.
- Transaction không ghi trạng thái claim/lease để chỉ định duy nhất một worker/request được gửi email.
- `server/controllers/borrow-public-controller.js:360-370`: email được gửi ngoài transaction; `emailDispatchedAt` chỉ được ghi sau khi SMTP thành công và write này còn bị bỏ qua lỗi bằng `.catch(() => {})`.
- `server/controllers/borrow-public-controller.js:398-403`: create đầu tiên cũng có cùng cửa sổ thời gian giữa commit và đánh dấu đã gửi.
- Test tại `server/tests/borrow-public.test.js:1739-1777` chỉ kiểm tra một retry tuần tự, không kiểm tra hai request đồng thời.

**Kịch bản lỗi**

1. Request A commit phiếu/idempotency marker với `emailDispatchedAt = null`.
2. Trước khi A gửi email hoặc cập nhật timestamp, request B cùng `Idempotency-Key` đọc marker.
3. B rotate verify token và tạo management link mới; A và B đều gọi SMTP.
4. Người dùng có thể nhận hai email. Token verify trong email A có thể đã mất hiệu lực vì B đã ghi hash mới. Link cũ cũng không bị revoke trong transaction rotate, nên có thể tồn tại nhiều management link hợp lệ cho cùng phiếu.

Đây là race thực sự của thuật toán; unit test pass không loại trừ được vì Firestore mock hiện chỉ chạy kịch bản tuần tự.

**Cách sửa đề xuất**

- Ưu tiên ghi một outbox email bền vững trong cùng transaction tạo phiếu, có `deliveryId`, trạng thái, lease và retry; chỉ worker claim thành công mới được gửi.
- Nếu vẫn gửi đồng bộ, transaction recovery phải atomically claim `emailDispatchStatus/emailDispatchLeaseExpiresAt` và chỉ claimant được rotate token + gửi mail.
- Khi rotate management link, revoke toàn bộ link cũ của request trong cùng cơ chế nhất quán.
- Không bỏ qua lỗi cập nhật trạng thái delivery; phải để retry/outbox xử lý rõ ràng.
- Thêm Emulator test `concurrent_same_idempotency_key_sends_one_delivery_and_leaves_one_valid_verify_token`.

---

### MEDIUM-POST-02 — `Cache-Control: no-store` và `Referrer-Policy: no-referrer` không áp dụng cho trang Borrow

**Bằng chứng code và production**

- `server/index.js:80` đăng ký `express.static(...)` trước SPA fallback.
- Header riêng cho `/borrow` chỉ được set tại fallback `server/index.js:127-134`.
- Với `/borrow`, `/borrow/` và nested route, `express.static` phục vụ `index.html` trước nên fallback không chạy.
- Kiểm tra production trên `/borrow`, `/borrow/` và `/borrow/manage/test` đều trả:
  - `Cache-Control: public, max-age=0`
  - không có `Referrer-Policy`
- Chính script `deploy/verify-https-deploy.sh` cũng fail hai điều kiện này.

Verify URL từng chứa bearer token trong query trước khi frontend xóa token khỏi address bar. Việc HTML không có `no-store/no-referrer` làm giảm lớp bảo vệ privacy đã được thiết kế cho flow này.

**Cách sửa đề xuất**

Đăng ký middleware header **trước** `express.static`, ví dụ cho toàn bộ prefix `/borrow`, rồi mới serve static/fallback. Bổ sung process-level test cho ít nhất:

- `/borrow`
- `/borrow/verify?token=sensitive`
- `/borrow/manage`

Mỗi route phải có `Cache-Control: no-store` và `Referrer-Policy: no-referrer` khi request được nhận diện là HTTPS.

---

### MEDIUM-POST-03 — Emulator suite và CI workflow vẫn chưa có một lượt chạy thành công

**Những phần đã làm đúng**

- `firebase-tools` đã pin ở `15.35.0`.
- `.github/workflows/ci.yml` có job Node 22 + Temurin JDK 21 chạy `npm run test:emulator`.
- Workflow cũng chạy full backend test và frontend test/lint/build.

**Khoảng trống còn lại**

- Local `npm run test:emulator` dừng trước khi chạy test vì máy đang dùng Java `1.7.0_04`; Firebase CLI yêu cầu JDK 21+.
- `git ls-remote --heads origin feat/equipment-borrow` không trả branch.
- `gh run list --repo ngotrapublic/fgw-event-flow` trả `[]`; chưa có workflow run nào để xác nhận job thực sự xanh.

Do đó P3 Emulator integration vẫn chỉ mới có code/infrastructure, chưa có bằng chứng runtime. Push branch rồi chờ cả ba job CI pass; hoặc cài JDK 21 và chạy suite local trước khi deploy.

---

### LOW-POST-01 — Script deploy báo nhầm port 5000 đang mở khi kết nối thất bại

Tại `deploy/verify-https-deploy.sh:63`, khi `curl` không kết nối được, `-w '%{http_code}'` in `000` rồi nhánh `|| echo 'UNREACHABLE'` nối thêm chuỗi. Giá trị thực tế là `000UNREACHABLE`, trong khi điều kiện dòng 64 chỉ chấp nhận chính xác `000` hoặc `UNREACHABLE`.

Kết quả ngày 2026-11-12:

- `Test-NetConnection` xác nhận TCP 5000 **không mở**.
- Script lại in `[FAIL] Port 5000 is exposed externally (HTTP 000UNREACHABLE)`.

Nên kiểm tra exit code của `curl` riêng; mọi kết nối thất bại là pass, còn bất kỳ HTTP response nào từ port 5000 mới là fail.

---

### LOW-POST-02 — Account idempotent retry không khôi phục email/admin notification sau crash

Với account, request được commit ở trạng thái `pending`, sau đó mới gửi email và tạo notification tại `server/controllers/borrow-public-controller.js:424-452`. Nếu process chết ngay sau commit, retry cùng idempotency key đi vào nhánh return sớm `:360-384`; email account và admin notification không được chạy lại.

Phiếu vẫn tồn tại và admin có thể thấy trong danh sách nên đây không phải mất dữ liệu, nhưng notification side effect không đảm bảo. Có thể đóng bằng outbox chung với MEDIUM-POST-01 hoặc lưu trạng thái riêng cho từng side effect và retry idempotently.

## 3. Kết quả xác minh đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Full backend Jest | **PASS — 18 suites, 189 tests** |
| Process-level env/security test | **PASS — 7 tests** |
| Frontend Borrow Vitest/Testing Library/axe | **PASS — 1 file, 7 tests** |
| Frontend ESLint | **PASS — 0 error, 5 warning cũ ngoài Borrow** |
| Frontend production build | **PASS — 4.057 modules**; còn warning main chunk khoảng 718 kB |
| Firestore Emulator | **BLOCKED trước test** — local Java 7, CLI yêu cầu JDK 21+ |
| GitHub Actions | **CHƯA CHẠY** — remote chưa có branch/workflow run |
| HTTP → HTTPS | **PASS — 301** |
| HTTPS + HSTS | **PASS — 200 + HSTS** |
| Port 5000 public | **PASS — không kết nối được** |
| Borrow API production | **FAIL — 404** |
| Borrow privacy headers production | **FAIL — thiếu `no-store` và `no-referrer`** |

Lần full backend đầu tiên được chạy đồng thời với frontend build/test có một process-level startup timeout; chạy lại riêng test đó pass trong khoảng 12 giây và lần full suite kế tiếp pass toàn bộ. Vì vậy đây được xem là nhiễu tài nguyên của lượt audit, không phải regression sản phẩm.

## 4. Thứ tự xử lý đề xuất

1. Sửa MEDIUM-POST-01 và MEDIUM-POST-02 trước khi go-live.
2. Sửa LOW-POST-01 để script nghiệm thu không báo sai.
3. Push branch, để CI chạy xanh cả backend, Emulator và frontend; xử lý MEDIUM-POST-03.
4. Deploy đúng commit và thực hiện smoke test để đóng HIGH-POST-01.
5. Gộp LOW-POST-02 vào outbox/delivery state nếu triển khai giải pháp bền vững cho MEDIUM-POST-01.

## 5. Các giới hạn Low đã biết và chưa thay đổi

- Reminder email vẫn có semantics at-least-once nếu process chết sau khi SMTP nhận mail nhưng trước khi đánh dấu outbox hoàn tất.
- HTTP IP rate limiter vẫn memory-local theo instance; Firestore quota/counter tiếp tục là lớp bảo vệ dùng chung chính.

Hai điểm này đã được ghi nhận từ report trước và không phải regression mới của vòng fix hiện tại.

