# Báo cáo review Phase 02 — API công khai `/api/borrow`

- Plan: [phase-02-public-borrow-api.md](../261104-1159-equipment-borrow-return/phase-02-public-borrow-api.md)
- Branch: `feat/equipment-borrow` @ `ec54e71` feat(borrow): implement public borrow api endpoints, rate limiting, and email service
- Người review: Claude Code

| Lần | Thời điểm | Kết quả |
|---|---|---|
| 1 | 2026-11-06 10:05 | ⚠️ Đạt có điều kiện: code đúng plan, test pass. **Sửa M1, M2 và xác nhận M3 trước khi mở public** |
| 2 | 2026-11-06 11:06 | ⚠️ Kiểm server production (ảnh chụp người dùng gửi). M3 **đã ổn sẵn**, XFF + CORS đúng. Còn M1, M2, M4 + mới R1 (cần đo), L6, S1 (secret trong image, ngoài phạm vi phase) |

## Kết luận (lần 2) — kiểm server production `aptisnew`

Code không đổi (`ec54e71`). Lần này chỉ kiểm cấu hình server.

**Sửa sai của reviewer ở lần 1:**
- `10.25.1.3` là **DNS server** (dòng `Server/Address` của `nslookup`), không phải IP của domain. Domain `event.greenwichvietnam.edu.vn` trỏ về IP public `115.79.197.145`, NAT vào `aptisnew`.
- nginx và Docker chạy **cùng một máy** `aptisnew` (cả hai ảnh cùng prompt `root@aptisnew`; nginx `proxy_pass http://127.0.0.1:5000`).
- → Lời khuyên "Chốt M3" ở lần 1 (bind IP LAN + rule `DOCKER-USER`) **là sai, không được làm**: nó sẽ mở cổng 5000 ra LAN, đang an toàn thành không an toàn.

| Mục | Bằng chứng | Kết quả |
|---|---|---|
| M3 cổng 5000 | `docker ps`: `127.0.0.1:5000->5000/tcp`; `ss`: `127.0.0.1:5000` (docker-proxy); `curl http://192.168.1.21:5000/` không kết nối được; từ LAN `10.25.4.42` và IP public đều không vào được 5000 | ✅ **Đã an toàn**, không cần sửa |
| M5-4 nginx gửi IP thật | `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` + `X-Real-IP` | ✅ Đạt. Chuỗi `client → nginx → docker-proxy → app`: `trust proxy: 1` lấy đúng giá trị nginx ghi; client tự gắn XFF giả không có tác dụng |
| M5-2 CORS | Container: `ALLOWED_ORIGINS=…,http://event.greenwichvietnam.edu.vn,https://event.greenwichvietnam.edu.vn` | ✅ Đạt |
| M4 `APP_PUBLIC_URL` | `printenv APP_PUBLIC_URL` **không in gì** (2 dòng in ra là `ALLOWED_ORIGINS` và `NODE_ENV`) | ❌ Chưa có, xem M4 |
| R1 (mới) IP dùng chung | Chưa có số liệu | ❓ Cần đo, xem R1 |
| S1 (mới, ngoài phase) secret trong image | Image xuất ra `offline-deploy-bundle/antigravity_latest.tar` chứa `server/.env`, `.env.development`, `.env.staging` | ❌ Xem S1 |

## Kết luận (lần 1)

**Được sang phase 03.** Đủ 8 endpoint, đủ 15 test case của plan, không có test fail mới. Code không đụng tới `events`.

Đây là route công khai đầu tiên có ghi dữ liệu. Còn 2 lỗ hổng MEDIUM ở luồng OTP (M1, M2) và 2 điểm cấu hình Docker (M3 cổng 5000, M4 thiếu `APP_PUBLIC_URL` trong container). Không chặn phase 03, nhưng **phải xử lý trước khi deploy tính năng ra ngoài**.

| Hạng mục plan | Kết quả |
|---|---|
| §1 `.env.example`, `trust proxy`, mount route, warn thiếu `APP_PUBLIC_URL` | ✅ `trust proxy` ngay sau `const app`; route mount trước SPA fallback và `errorHandler` |
| §2 `optional-auth.js` | ✅ Không header → khách; Bearer sai → 401 (không lặng lẽ coi là khách) |
| §3 `rate-limiters.js` | ✅ Đủ 7 limiter, đúng số; `createLimiter` bỏ qua người có TK (đặt sau `optionalAuth` nên `skip` chạy đúng) |
| §4 `borrow-token-service.js` | ✅ Token 256-bit `base64url`, OTP `randomInt`, so sánh `timingSafeEqual` |
| §5 `borrow-validation.js` | ✅ Đủ quy tắc; gộp `resourceId` trùng, chặn tổng > `MAX_QTY` |
| §6 `borrow-email-service.js` | ✅ `escapeHtml` mọi giá trị người dùng; đủ 9 template; link có token chỉ ở `sendVerify` / `sendCreatedForAccount` |
| §7 8 endpoint | ✅ (lưu ý M1, M2, L1–L5) |
| §8 `getUidsByRoles` | ✅ Hàm mới, không sửa `getAdminUids` |
| `toPublicView` | ✅ Không trả `history`, `uid`, `*Hash`, `verifyExpiresAt`; email/SĐT đã che |
| Cách ly khỏi events | ✅ `grep eventsCollection\|eventController` trên toàn bộ file borrow → không có |

## 1. Kiểm chứng

| Kiểm | Kết quả |
|---|---|
| `npx jest` toàn bộ | 124 pass / 17 fail / 141; 13/15 suites. **0 test fail mới** so với baseline (17 fail cũ giữ nguyên) |
| `borrow-public.test.js` | 19/19: đủ 15 case plan + 3 case `optionalAuth` + 1 case `/resources` ẩn `quantity` |
| `APP_PUBLIC_URL` | Có trong `server/.env` (chỉ kiểm tên biến) |
| Curl sau nginx: 6 POST → lần 6 nhận 429, log hiện IP thật | ❓ Phần "6 POST → 429" cần deploy branch. Phần "log hiện IP thật" đo trước được, xem R1 |

## 2. Lỗi

### M1 MEDIUM — Đếm số lần nhập sai OTP không atomic, đoán song song vượt giới hạn 5 lần

[borrow-public-controller.js:514-533](../../server/controllers/borrow-public-controller.js#L514-L533): `verifyOtp` đọc `attempts`, so mã, rồi mới `update({ attempts: attempts + 1 })`, không trong transaction. Gửi N request đoán **cùng lúc** → tất cả cùng đọc `attempts = 0` → cả N lần đều được so mã. Test 12 chỉ thử tuần tự nên không bắt được.

Giới hạn còn lại là `otpVerifyLimiter` 20 lần / 15 phút **theo IP**. Kẻ tấn công có nhiều IP đoán được nhiều hơn hẳn 5 lần trong 10 phút OTP còn hạn. Đoán trúng → nhận `accessToken` mới của mọi phiếu đang mở của SĐT đó; token cũ của chủ phiếu mất hiệu lực, và kẻ tấn công báo trả giả được.

Sửa: bọc kiểm + tăng `attempts` trong `db.runTransaction`:
```js
const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(otpRef);
    const d = snap.exists ? snap.data() : null;
    if (!d || new Date(d.expiresAt).getTime() < Date.now() || (d.attempts || 0) >= LIMITS.OTP_MAX_ATTEMPTS) return 'invalid';
    if (!safeEqualHex(hash(String(code).trim()), d.codeHash)) {
        tx.update(otpRef, { attempts: (d.attempts || 0) + 1 });
        return 'invalid';
    }
    tx.delete(otpRef);
    return 'ok';
});
if (result !== 'ok') throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
```
Firestore retry transaction khi có ghi đồng thời → mỗi lần đoán thật sự được đếm. Mock đã có `runTransaction` chạy tuần tự nên test cũ vẫn chạy. Thêm 1 test: 6 request sai gửi bằng `Promise.all` → doc OTP có `attempts === 5`, lần đúng sau đó vẫn 400.

### M2 MEDIUM — `lookup/otp` lộ "SĐT này có phiếu đang mở" qua thời gian phản hồi

Plan yêu cầu response giống hệt nhau để không xác nhận SĐT có tồn tại. Body và status đã giống nhau, nhưng [dòng 486-492](../../server/controllers/borrow-public-controller.js#L486-L492) `await sendOtp(...)` qua SMTP (thường 1–3 giây) **chỉ khi có phiếu**. SĐT không có phiếu trả về ngay (vài chục ms). Đo thời gian phản hồi là biết SĐT nào đang mượn thiết bị.

Sửa: ghi OTP doc xong thì trả 200 ngay, gửi email không `await`:
```js
res.status(200).json(standardResponse);
Promise.allSettled(distinctEmails.map((e) => borrowEmailService.sendOtp(e, code)))
    .then((rs) => rs.filter((r) => r.status === 'rejected')
        .forEach((r) => console.error('[BORROW] Error sending OTP email:', r.reason?.message)));
```
Test 10 và 11 vẫn đúng nếu test chờ `setImmediate` / flush promise trước khi kiểm `sendOtp`.

### M3 ✅ (lần 2: production đã bind `127.0.0.1`, nginx cùng máy) — Cổng 5000 mở ra ngoài thì vượt được mọi rate limit

> Lần 2: không cần sửa gì trên server. Chỉ còn đồng bộ file compose trong repo (L6). Bảng 3 phương án dưới đây giữ lại để tham khảo; production đang ở dòng 1.

`trust proxy: 1` khiến Express lấy IP từ `X-Forwarded-For` (nginx gắn vào). [docker-compose.yml:10](../../docker-compose.yml#L10) map `"${PORT:-5000}:5000"`, tức bind `0.0.0.0`. Nếu cổng 5000 truy cập được từ Internet mà không qua nginx, kẻ tấn công tự đặt `X-Forwarded-For` ngẫu nhiên mỗi request → mỗi request được tính là một IP mới → **toàn bộ 7 limiter vô hiệu** (spam tạo phiếu, spam email, đoán OTP).

**Cập nhật: server chạy bằng Docker.** Firewall không đủ tin cậy: cổng Docker publish được ghi thẳng vào iptables, **đi vòng qua UFW/firewalld**, nên rule `ufw deny 5000` không có tác dụng. Phải sửa ở `docker-compose.yml`, tuỳ nginx chạy ở đâu:

| nginx chạy ở | Sửa `ports` |
|---|---|
| Trên host (cùng máy, ngoài Docker) | `- "127.0.0.1:${PORT:-5000}:5000"` |
| Trong container khác, cùng Docker network | Bỏ hẳn `ports`, nginx gọi `http://antigravity-app:5000` |
| Máy khác | Không bind `127.0.0.1` được (site sẽ chết). Giữ `ports`, chặn cổng 5000 bằng firewall của nhà cung cấp/router, chỉ mở cho IP nginx |

Kiểm sau khi sửa: từ máy khác gọi `http://<server-ip>:5000/api/borrow/resources` → phải **không kết nối được**; qua domain vẫn chạy.

### M4 MEDIUM — Trong Docker không có `APP_PUBLIC_URL`, khách không tạo được phiếu

`APP_PUBLIC_URL` mới chỉ có trong `server/.env`. Container lấy biến từ `env_file: .env` (**root**) và danh sách `environment`. Root `.env` chưa có biến này, và [firebase.js](../../server/config/firebase.js) chỉ đọc `server/.env` khi thiếu biến Firebase (trong Docker luôn có).

Hậu quả trên production: `sendVerify` ném lỗi thiếu URL → khách tạo phiếu nhận `502 'Không gửi được email…'` (L1), **100% phiếu khách thất bại**. Người có TK vẫn tạo được nhưng không có email.

Lần 2 xác nhận: `printenv APP_PUBLIC_URL` trong container không in gì. Container chạy `node server/index.js` từ `/usr/src/app` → `dotenv` ở `index.js` tìm `/usr/src/app/.env` (không có trong image); `firebase.js` chỉ đọc `server/.env` khi thiếu biến Firebase (không xảy ra). Nên `printenv` phản ánh đúng biến app thấy.

Sửa: thêm vào `/opt/fgw-event-flow/.env` trên `aptisnew` (domain thật, xem M5):
```
APP_PUBLIC_URL=https://event.greenwichvietnam.edu.vn
```
Production đang chạy bản `main` (chưa có tính năng mượn trả) nên thêm sớm cũng vô hại. Biến có hiệu lực khi container được **tạo lại** (`docker compose up -d`; `docker compose restart` không đọc lại `env_file`) — tức là lúc deploy branch này.

Kiểm sau khi deploy:
- `docker exec antigravity-app printenv APP_PUBLIC_URL` → ra đúng URL.
- `docker logs antigravity-app 2>&1 | grep "APP_PUBLIC_URL is not set"` → không có dòng nào.

### ~~Chốt M3 — nginx ở máy khác~~ (rút lại ở lần 2)

Lần 1 reviewer đọc nhầm `10.25.1.3` (DNS server) là máy nginx và khuyên bind cổng vào IP LAN + rule `DOCKER-USER`. **Sai — không làm.** nginx và app cùng máy `aptisnew`, production đã bind `127.0.0.1:5000`. Xem "Kết luận (lần 2)".

### L6 LOW — `docker-compose.yml` trong repo khác production

Repo: `"${PORT:-5000}:5000"` (bind mọi địa chỉ). Production đang bind `127.0.0.1:5000` → trên server hoặc file compose đã sửa tay, hoặc `.env` đặt `PORT=127.0.0.1:5000`. Deploy lần sau bằng file trong repo có thể **mở lại cổng 5000** mà không ai để ý.

Kiểm trên server (chỉ đọc):
```bash
cd /opt/fgw-event-flow && grep -n -A2 "ports:" docker-compose.yml && grep -n "^PORT=" .env
```
- Nếu compose trên server có `127.0.0.1:` → sửa repo cho giống: `- "127.0.0.1:${PORT:-5000}:5000"`.
- Nếu `.env` có `PORT=127.0.0.1:5000` → **giữ repo như cũ** (thêm `127.0.0.1:` sẽ thành `127.0.0.1:127.0.0.1:5000` và container không chạy); ghi chú cách này vào tài liệu deploy.

### R1 MEDIUM (cần đo) — Người dùng trong trường có thể dùng chung 1 IP → rate limit chặn nhầm

QR đặt tại quầy → phần lớn khách quét bằng **WiFi của trường**. DNS nội bộ trả IP public `115.79.197.145`, nên request từ LAN đi ra firewall rồi NAT ngược vào `aptisnew` (hairpin NAT). Nhiều firewall đổi IP nguồn thành IP của chính nó ở bước này. Khi đó nginx thấy **mọi máy trong trường cùng một IP**, và các limiter tính theo IP chặn cả trường:

| Limiter | Giới hạn chung cho cả trường nếu dùng chung IP |
|---|---|
| `createLimiter` | 5 phiếu khách / giờ |
| `otpIpLimiter` | 5 lần xin OTP / giờ |
| `borrowRead` | 120 request / 15 phút (mỗi lần mở trang gọi 2 API) |

Cách đo — reviewer đã gửi 1 request đánh dấu lúc **11:06:34** từ máy LAN `10.25.4.42`. Trên `aptisnew` chạy:
```bash
sudo grep -rh "review-probe=rp-claude-1793937994" /var/log/nginx/ | awk '{print $1}'
```
Rồi mở thêm từ điện thoại: `https://event.greenwichvietnam.edu.vn/?review-probe=wifi` (WiFi trường) và `?review-probe=4g` (4G), chạy `sudo grep -rh "review-probe=" /var/log/nginx/ | awk '{print $1, $7}'`.

| IP log được | Kết luận |
|---|---|
| `10.25.4.42` / IP riêng của điện thoại | Không có vấn đề, giữ giới hạn như plan |
| Cùng một IP cho mọi máy trong trường | Phải chỉnh trước khi mở tính năng. Đề xuất: nâng `createLimiter`, `otpIpLimiter`, `borrowRead` lên ~10 lần, vì chặn lạm dụng thật đã có giới hạn theo email/SĐT (`MAX_OPEN_PER_GUEST` = 3, OTP 3 lần/giờ/SĐT, sau M1 thì 5 lần đoán/mã). Người dùng quyết định số cụ thể |

### M5 MEDIUM — Domain trong plan sai; cần kiểm CORS và `X-Forwarded-For` trên nginx

Plan (do reviewer viết) ghi domain `event.greenwich-it.com`; domain thật là `event.greenwichvietnam.edu.vn`. Domain sai đã lan vào: `.env.example`, `server/.env.example`, `server/.env` (`APP_PUBLIC_URL`), fallback CORS ở [index.js:42](../../server/index.js#L42), mock trong `borrow-public.test.js`. `client/.env.production` (`VITE_API_URL=https://event.greenwich-it.com/api`) có từ trước phase này.

Cần làm (trạng thái lần 2: mục 1 ❌ chuyển M4; mục 2 ✅; mục 3 bỏ; mục 4 ✅; mục 5 ❌):
1. **`APP_PUBLIC_URL` = `https://event.greenwichvietnam.edu.vn`** (M4). Sai domain → link xác nhận / quản lý phiếu trong email trỏ sai chỗ.
2. **`ALLOWED_ORIGINS` trên server phải có `https://event.greenwichvietnam.edu.vn`.** Trang `/borrow` gửi `POST` (trình duyệt luôn kèm header `Origin`) → origin không có trong danh sách → CORS lỗi → khách không gửi được phiếu. Root `.env` trong repo chỉ có localhost; reviewer không thấy được `.env` trên server production.
3. **Kiểm `client/.env.production`**: nếu `event.greenwich-it.com` không còn dùng, đổi `VITE_API_URL` sang domain thật (hoặc `/api`) rồi build lại image.
4. **Kiểm config nginx** có dòng:
   ```nginx
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   ```
   Thiếu dòng này → `req.ip` luôn là IP của nginx → **mọi khách dùng chung 1 bộ đếm**: cả trường chỉ tạo được 5 phiếu khách/giờ, 5 lần xin OTP/giờ. Có dòng này thì `trust proxy: 1` lấy đúng IP thật, và client tự gắn XFF giả cũng không tác dụng (Express lấy giá trị nginx thêm vào cuối).
5. Sửa domain trong `.env.example`, `server/.env.example`, fallback CORS ở `index.js`, mock test cho khớp.

Đã sửa domain trong [phase-02 plan](../261104-1159-equipment-borrow-return/phase-02-public-borrow-api.md).

Ghi chú: `GET https://event.greenwichvietnam.edu.vn/api/borrow/resources` hiện trả 404 — đúng, vì branch chưa deploy.

**Kiểm từ bên ngoài (2026-11-06 10:50, từ máy LAN `10.25.4.42`):**

| Kiểm | Kết quả | Ảnh hưởng |
|---|---|---|
| Bundle client production | Gọi API bằng đường dẫn tương đối `"/api"`, không chứa domain | `client/.env.production` không ảnh hưởng production → **bỏ mục 3 của M5** |
| CORS preflight `Origin: https://event.greenwichvietnam.edu.vn` | `204`, `Access-Control-Allow-Origin` đúng domain | `ALLOWED_ORIGINS` production đã đúng → mục 2 của M5 **đạt** |
| ~~`10.25.1.3` (IP nội bộ của domain)~~ | ~~Cổng 80 trả 200, cổng 5000 đóng~~ | **Sửa lần 2:** `10.25.1.3` là DNS server (dòng `Server/Address` của `nslookup`), không liên quan app. Domain trỏ về `115.79.197.145` |
| `event.greenwich-it.com` | Vẫn phân giải (qua Cloudflare) | Domain cũ còn hoạt động; không ảnh hưởng tính năng (client gọi `/api` tương đối, email dùng `APP_PUBLIC_URL`) |

Lần 2 đã chốt M3, M4 và mục 4 của M5 bằng ảnh chụp từ `aptisnew` (xem "Kết luận (lần 2)").

### L1–L5 LOW (không chặn)

- **L1** — Thiếu `APP_PUBLIC_URL` thì khách nhận `502 'Không gửi được email…'` thay vì `503 'Chưa cấu hình APP_PUBLIC_URL'` như plan, vì lỗi bị `catch` chung với lỗi SMTP ([dòng 214-221](../../server/controllers/borrow-public-controller.js#L214-L221)). Admin dễ chẩn đoán sai. Sửa: gọi `getAppPublicUrl()` (hoặc kiểm `process.env.APP_PUBLIC_URL`) trước khi tạo doc.
- **L2** — `verifyEmail` thêm field `verifiedTokenHash` (ngoài schema phase 01) để gọi lại link vẫn trả 200 idempotent. Hợp lý; schema plan nên ghi thêm field này để phase 03–05 biết. Hai lần bấm link **đồng thời** thì lần sau nhận 409 thay vì 200 (do `transition` không có `expectFrom`); hiếm, chấp nhận được.
- **L3** — Tên field OTP lệch plan: `sendCount` / `windowStart` thay vì `sentCount` / `sentCountWindowStart`. Không phase nào khác đọc doc này → chỉ cần cập nhật schema plan cho khớp code.
- **L4** — `resendVerification`: đổi `verifyTokenHash` **trước** khi gửi mail. Gửi lỗi → link cũ đã mất hiệu lực, người dùng nhận 500. Nên gửi mail trước rồi mới `update`, hoặc bắt lỗi trả 502.
- **L5** — Thông báo admin: `{n} món` đếm số dòng thiết bị, không phải tổng số lượng; ngày hiện dạng `YYYY-MM-DD`, plan ghi `dd/MM`. Người có TK gửi được `name` khác tên trong profile (plan ghi lấy từ profile).

### S1 HIGH (ngoài phạm vi phase 02, có từ trước) — Image Docker chứa file secret

[.dockerignore](../../.dockerignore) có `.env` và `.env.*`, nhưng 2 pattern này **chỉ khớp ở thư mục gốc**. `COPY server/ ./server/` vẫn chép `server/.env*` vào image.

Bằng chứng (chỉ liệt kê tên file, không mở nội dung): `offline-deploy-bundle/antigravity_latest.tar` (~400 MB) chứa `/usr/src/app/server/.env`, `.env.development`, `.env.staging`. `server/.env` trên máy dev có private key service account Firebase (toàn quyền Firestore/Auth) và `GEMINI_API_KEY`. Ai có file tar là lấy được bằng `docker load` + `docker run … cat`.

- Thư mục `offline-deploy-bundle/` bị git ignore → không lên GitHub. Nhưng trong đó còn `.env` gốc và file `.rar` → **cả thư mục là tài liệu mật**.
- App **không đọc** các file này lúc chạy (xem M4: chạy từ `/usr/src/app`, biến lấy từ compose) → bỏ chúng khỏi image không làm hỏng gì.

Sửa:
1. Thêm vào `.dockerignore`:
   ```
   server/.env
   server/.env.*
   ```
   Không dùng `**/.env.*`: sẽ loại cả `client/.env.production` mà bước build Vite đang dùng → đổi URL API trong bundle client.
2. Trên `aptisnew`, kiểm image production hiện tại (chỉ in tên file):
   ```bash
   docker exec antigravity-app ls -a /usr/src/app/server | grep -i env
   ```
   Chỉ có `.env.example`, `.env.production.example` → image production sạch, chỉ file tar cũ bị lộ. Có `.env`/`.env.development`/`.env.staging`/`.env.production` → image production cũng chứa secret.
3. Build lại image, chạy lại lệnh ở bước 2 → không còn file `.env` thật.
4. Nếu file tar / `.rar` / thư mục `offline-deploy-bundle` **từng được chép ra ngoài** 2 máy này (USB, ổ chung, chat, email): đổi key service account Firebase, `GEMINI_API_KEY`, mật khẩu email. Xoá file tar cũ sau khi có image sạch. Hai việc này do người dùng quyết định.

Ghi chú: lần quét đầu reviewer báo nhầm "không có `.env` trong image" vì lệnh chưa giải nén layer gzip. Lần quét thứ hai (có kiểm chứng tìm thấy `server/index.js`) mới đúng.

## 3. Ghi chú cho phase sau

- Phase 03 `confirm-return`: xem lại [phase 01 report §4](review-261105-0947-phase-01-data-model-and-stock.md#4-ghi-chú-cho-phase-03). `items` lấy từ phiếu, `receivedQty` nguyên trong `0..qty`.
- Phase 03 job hết hạn xác nhận: phiếu `unverified` quá `verifyExpiresAt` → `expired`. `verifyEmail` hiện trả 410 cho trường hợp này, khớp với job.
- Phase 04 client gửi header `X-Borrow-Token` / `X-Borrow-Tokens`. CORS hiện không đặt `allowedHeaders` nên `cors` tự cho phép header client xin trong preflight. Ổn, không cần sửa.

## Việc cần làm

1. [→] **M1** — `verifyOtp` dùng transaction + test gửi song song. **Chuyển sang phase 03** ([phase-03 §4.1](../261104-1159-equipment-borrow-return/phase-03-admin-api-and-jobs.md)), theo yêu cầu người dùng 2026-11-07.
2. [→] **M2** — `lookup/otp` trả 200 trước, gửi email không `await`. **Chuyển sang phase 03 §4.2**.
3. [x] **M3** — Production đã bind `127.0.0.1:5000`, nginx cùng máy. ~~Bind IP LAN + rule `DOCKER-USER`~~ (lời khuyên sai của lần 1, không làm).
3a. [ ] **L6** — So `ports` trong `/opt/fgw-event-flow/docker-compose.yml` và `PORT` trong `.env` trên server, đồng bộ repo cho đúng.
3b. [ ] **M4** — Thêm `APP_PUBLIC_URL=https://event.greenwichvietnam.edu.vn` vào `/opt/fgw-event-flow/.env`; có hiệu lực khi deploy branch (`docker compose up -d`).
3c. [~] **M5** — ✅ `ALLOWED_ORIGINS`, ✅ nginx XFF. Còn: sửa domain trong `.env.example`, `server/.env.example`, fallback CORS ở `index.js`, mock test.
3d. [ ] **R1** — Grep log nginx theo marker (mục R1), thử thêm từ điện thoại WiFi trường + 4G. Cùng IP → chỉnh limiter trước khi mở tính năng.
3e. [ ] **S1** — Sửa `.dockerignore`, kiểm image production, build lại (mục S1).
4. [ ] Curl test sau nginx (plan §Validation): 6 POST tạo phiếu liên tiếp → lần 6 nhận 429; log hiện IP client thật.
5. [ ] (Tuỳ chọn) L1–L5; cập nhật schema plan cho L2, L3.
6. [ ] Chạy lại `npx jest`: ≥ 124 pass, không test fail mới.

## Câu hỏi chưa giải quyết

- ~~Server chạy bằng gì?~~ → Docker (người dùng xác nhận 2026-11-06).
- ~~nginx chạy ở đâu?~~ → Máy khác; domain `https://event.greenwichvietnam.edu.vn`.
- ~~IP LAN máy app, IP máy nginx?~~ → Cùng máy `aptisnew` (`192.168.1.21`), nginx gọi `127.0.0.1:5000`.
- ~~`event.greenwich-it.com` còn dùng không?~~ → Không ảnh hưởng tính năng; bỏ câu hỏi.
- R1: IP nào xuất hiện trong log nginx cho request đánh dấu (máy LAN, WiFi trường, 4G)? Quyết định có nâng limiter không.
- S1: file tar / thư mục `offline-deploy-bundle` từng được chép ra ngoài chưa? Quyết định có đổi key không.
- L6: production bind `127.0.0.1` bằng compose sửa tay hay `PORT` trong `.env`?
