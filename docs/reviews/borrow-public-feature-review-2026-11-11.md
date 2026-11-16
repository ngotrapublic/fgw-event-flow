# Review độc lập: Mượn/trả thiết bị công khai

- **Ngày review:** 2026-11-11
- **Phạm vi:** Public borrow flow, guest/account access, token/OTP, Firestore transactions, reminder job, mobile UX, accessibility và test coverage
- **Stack:** React/Vite + Framer Motion, Node/Express, Firestore
- **Kết quả xác minh:** 71/71 test backend liên quan pass; frontend production build thành công
- **Ghi chú:** Không lặp lại M1/M2 đã biết. Không có file source nào được chỉnh sửa trong quá trình review.

## 1. Tóm tắt mức sẵn sàng

Tính năng **chưa nên đưa vào production công khai** trước khi xử lý hai rủi ro High: link xác nhận cũ có thể phát hành token mới vô thời hạn, và bearer token dài hạn đang đi qua URL rồi lưu trong `localStorage`.

Không thấy IDOR trực tiếp ở luồng báo trả: token được đối chiếu đúng với từng phiếu, và transaction duyệt phiếu bảo vệ kho khỏi âm tồn khi hai admin cùng duyệt. Các luồng chính có chất lượng test backend khá tốt, nhưng test hiện chưa bắt các race condition của reminder/OTP và chưa có test UI/accessibility.

Review được thực hiện theo boundary route → phân quyền → Firestore transaction → UI.

## 2. Bảng phát hiện

| Mức | Nhóm | File:dòng | Vấn đề | Kịch bản tái hiện | Cách sửa đề xuất |
|---|---|---|---|---|---|
| **High** | A | `server/controllers/borrow-public-controller.js:305-350` | `verifiedTokenHash` được giữ lại; mọi lần mở link xác nhận sau khi phiếu đã qua `unverified` đều gọi `issueReminderToken()` và cấp access token mới. Không kiểm tra TTL sau lần xác nhận đầu tiên. Cơ chế thu hồi bằng OTP vì thế có thể bị vô hiệu hóa. | Kẻ khác lưu hoặc được forward email xác nhận. Chủ phiếu dùng OTP làm token cũ mất hiệu lực. Kẻ kia mở lại link xác nhận cũ và nhận token mới tại dòng 327. | Verify token phải one-time. Khi trạng thái khác `unverified`, chỉ trả trạng thái công khai, tuyệt đối không mint access token. Để giải quyết UX máy mới của M1, dùng management-link nonce riêng, TTL ngắn, dùng một lần để đổi sang session cookie. |
| **High** | A | `server/services/borrow-email-service.js:92-99`, `:131-137`; `client/src/lib/borrow-token-store.js:10-30`; `server/controllers/borrow-public-controller.js:209-225` | Access token là bearer credential không TTL, xuất hiện trong `?t=`, rồi nằm lâu dài trong `localStorage`. Token chính `accessTokenHash` không bị xoay bởi reminder và không tự hết hạn. | URL nằm trong proxy/access log, lịch sử trình duyệt, ảnh chụp, email forward hoặc bị đọc khi có XSS. Người có token tiếp tục xem cả phiếu đã đóng vì `/my` không chỉ lọc phiếu mở. | Đổi sang **one-time URL code → HttpOnly Secure SameSite session cookie ngắn hạn**. Đặt TTL/revocation server-side, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`; thu hồi session khi OTP recovery hoặc phiếu đóng. |
| **Medium** | B | `server/jobs/borrow-reminder-job.js:132-145`, `:173-193`; `server/services/borrow-token-service.js:15-22` | Job ghi `dueSoonRemindedAt`/`overdueRemindedAt` trước khi gửi. SMTP lỗi làm due-soon mất lượt vĩnh viễn và overdue chờ thêm 24h. Nhiều instance có thể cùng gửi, đồng thời ghi đè `accessTokenHashes`; một email vừa gửi có thể chứa token đã bị instance khác làm mất. | Cho `sendDueSoon()` throw sau dòng 141: field đã tồn tại nên lần chạy sau bỏ qua. Chạy hai job instance trên cùng snapshot: cả hai thấy chưa nhắc và cùng gửi. | Dùng outbox hoặc transaction “claim lease”: `pending → sending → sent`; chỉ mark `sentAt` sau gửi thành công, failure có `nextRetryAt`. Cấp token và claim trong cùng transaction, có idempotency key theo `requestId + reminderType + window`. |
| **Medium** | A | `server/controllers/borrow-public-controller.js:539-570`; `server/middleware/rate-limiters.js:19-23`; `server/index.js:28-29` | Counter gửi OTP được read–modify–write ngoài transaction. Request đồng thời có thể cùng vượt qua cooldown/3 lần mỗi giờ, ghi đè mã và gửi nhiều mã khác nhau. Verify có giới hạn IP và 5 lần/mã, nhưng request OTP chủ yếu dựa IP + counter này. `trust proxy = 1` cũng cần kiểm tra server có luôn chỉ nhận traffic từ proxy tin cậy hay không. | Gửi 3–5 request OTP song song cho cùng SĐT; tất cả có thể đọc cùng `sendCount` cũ rồi cùng gửi email. Nếu port backend truy cập trực tiếp, cần kiểm tra khả năng giả `X-Forwarded-For`. | Transaction trên `borrow_otps/{phoneHash}` để kiểm tra và tăng counter nguyên tử. Thêm limiter theo HMAC(phone), khóa ngắn khi verify sai nhiều lần và cấu hình trusted proxy theo subnet/hạ tầng thực tế. |
| **Medium** | A/B | `server/middleware/rate-limiters.js:18`; `server/controllers/borrow-public-controller.js:181-199`, `:239-275` | User đăng nhập được skip create limiter và không có giới hạn số phiếu mở; giới hạn 3 phiếu chỉ áp dụng guest. Kiểm tra quota guest cũng không transaction nên 5 request song song có thể cùng thấy count bằng 0. | Một tài khoản nội bộ tạo hàng trăm phiếu `pending`, email và notification admin. Guest gửi 5 request đồng thời từ một IP, vượt `MAX_OPEN_PER_GUEST = 3`. | Áp quota theo UID cho tài khoản; giữ IP limiter với mức rộng hơn thay vì skip. Với guest, dùng counter document transaction hoặc unique reservation record theo email/phone HMAC. |
| **Medium** | B | `server/controllers/borrow-public-controller.js:115-155`; `server/services/borrow-transition-service.js:41-43`; `server/services/borrow-stock-service.js:31-75` | Tồn kho chỉ được giữ khi admin duyệt, không phải lúc gửi phiếu. Transaction duyệt ngăn âm kho, nhưng nhiều người vẫn có thể nhận thông báo “đã tạo phiếu” cho cùng món cuối; người duyệt sau gặp 409. | Hai người cùng thấy còn 1 máy chiếu và cùng tạo phiếu. Cả hai phiếu tồn tại; chỉ phiếu được duyệt đầu tiên giữ hàng. | Nếu nghiệp vụ cam kết hàng ngay khi đăng ký, tạo hold có TTL bằng transaction và giải phóng khi verify hết hạn/reject. Nếu không, UI/microcopy phải nói rõ “gửi yêu cầu không đồng nghĩa đã giữ thiết bị”. |
| **Medium** | B/C | `server/services/borrow-validation.js:53-74`; `client/src/components/borrow/BorrowForm.jsx:32-59`, `:697-705`; `client/src/components/borrow/BorrowRequestCard.jsx:82-90` | Server tính “ngày mai” theo Việt Nam, nhưng client chọn và render theo timezone thiết bị. `dueAt = 16:59:59Z` sẽ hiển thị sang ngày hôm sau ở UTC+8 trở lên. `getMaxDueDateString()` cộng một năm lịch trong khi server giới hạn đúng 365 ngày. | Phiếu hạn 12/11, mở trên thiết bị UTC+10: `new Date(dueAt).getDate()` có thể hiển thị 13/11. Quanh nửa đêm VN, min date client và server có thể lệch. | Public view nên trả `dueDate` dạng `YYYY-MM-DD`; render trực tiếp date-only hoặc cố định `timeZone: 'Asia/Ho_Chi_Minh'`. Client dùng cùng hàm “VN today + 1…365 ngày” với server. |
| **Medium** | C/D | `client/src/App.jsx:1-31`; `client/src/components/borrow/BorrowHome.jsx:240-355` | Màn đầu đặt marquee + bốn thống kê trước hai CTA chính. Đồng thời mọi route/admin screen đều static-import. Build đo được bundle chính **1,544 kB minified / 386.85 kB gzip**, dễ làm chậm lần mở đầu từ QR trên mạng di động. | Màn 360×640 có thể phải cuộn mới thấy CTA; cold load tải cả dashboard/admin dù người dùng chỉ cần `/borrow`. | Đưa hai CTA lên ngay dưới header; stats xuống sau. Dùng `React.lazy()` cho route, tối thiểu tách public borrow khỏi dashboard/admin. |
| **Medium** | C | `client/src/components/borrow/BorrowForm.jsx:581-621`, `:412-421` | `label` không có `htmlFor`, input không có `id/name/autocomplete`; mọi lỗi chỉ ở banner đầu form, không liên kết field, không `aria-live`, không focus field lỗi. Dữ liệu state được giữ khi lỗi — điểm này đang làm đúng. | Submit ở cuối form với email sai: người dùng mobile thấy banner trên đầu nhưng không biết/chưa được đưa tới field email. Screen reader không có accessible name đáng tin cậy. | Thêm `id`, `name`, `htmlFor`, `autocomplete="name email tel"`, `aria-invalid`, `aria-describedby`; error dưới từng field và focus field lỗi đầu tiên. |
| **Medium** | C | `client/src/components/borrow/BorrowReturn.jsx:29-89`, `:605-610` | OTP paste hoạt động, nhưng 6 ô đều không nhãn, thiếu `autocomplete="one-time-code"`. Backspace ở ô rỗng chỉ focus ô trước chứ không xóa chữ số trước. | Screen reader đọc sáu textbox không tên. Người dùng bấm Backspace ở ô 4 rỗng phải bấm thêm lần nữa mới xóa ô 3. | Tốt nhất dùng một input semantic có `inputMode="numeric"`, `pattern="[0-9]*"`, `autoComplete="one-time-code"` và vẽ sáu ô giả. Nếu giữ nhiều ô: `aria-label="Chữ số 1/6"`, xử lý paste ở container, Backspace vừa focus vừa xóa. |
| **Medium** | C | `client/src/components/borrow/BorrowReturn.jsx:671-738`; `client/src/components/borrow/BorrowHome.jsx:532-577` | Hai modal không có `role="dialog"`, `aria-modal`, focus trap, focus ban đầu/khôi phục, hoặc đóng bằng Esc. Nút ✕ của modal kho không có accessible label. | Mở modal bằng bàn phím rồi Tab: focus có thể chạy ra nội dung phía sau; Esc không đóng. | Dùng dialog component chuẩn hoặc native `<dialog>`, trap focus, Esc, restore trigger; đặt `aria-labelledby` và `aria-label="Đóng"`. |
| **Medium** | C | `client/src/components/borrow/BorrowHome.jsx:35-60`; `client/src/components/borrow/BorrowRequestCard.jsx:149-155`; `client/src/index.css:25-54` | Framer Motion, pulse, bounce và spin được dùng rộng nhưng không có `useReducedMotion` hay media query `prefers-reduced-motion`. `StatBox` còn là clickable `<div>`, không dùng được bằng bàn phím. | Bật Reduce Motion ở hệ điều hành: hover/tap/enter animation vẫn chạy. Tab không tới các ô thống kê để lọc. | Dùng `useReducedMotion()`, `motion-reduce:transform-none`, tắt animation trang trí; đổi `StatBox` thành `<button>`. |
| **Medium** | B/C | `server/controllers/borrow-public-controller.js:80-90`; `client/src/components/borrow/BorrowForm.jsx:470-484` | API loại bỏ hoàn toàn thiết bị hết hàng, nên nhánh UI disabled/out-of-stock thực tế không bao giờ chạy. Người dùng dễ tưởng thiết bị bị xóa khỏi danh mục. | Đặt `availableQty = 0`: thiết bị biến mất thay vì hiện “Hết hàng”. | Trả toàn bộ thiết bị public với `availableQty`, nhưng không trả `quantity` tổng nếu nhạy cảm; UI hiện card disabled, lý do rõ và không chỉ phụ thuộc opacity/màu. |
| **Medium** | C | `client/src/components/borrow/BorrowForm.jsx:93-105`, `:457-467`; `client/src/components/borrow/BorrowHome.jsx:89-96`, `:447-473` | Lỗi tải chỉ hiện toast; sau đó UI rơi vào empty state và nói “không có thiết bị” hoặc “chưa có phiếu”, dễ chẩn đoán sai lỗi mạng thành dữ liệu rỗng. | Tắt mạng khi mở form/home. Toast biến mất, màn hình còn lại báo dữ liệu rỗng. | Có state `loading/error/empty/success` riêng, error panel tồn tại với nút “Thử lại”; chỉ hiện empty khi request thành công. |
| **Low** | B/C | `client/src/components/borrow/BorrowRequestCard.jsx:96-115` | `Math.round()` làm trạng thái sát hạn mâu thuẫn: vừa quá hạn dưới 30 phút có thể hiện banner “Đã quá hạn” nhưng badge vẫn “Còn 1 giờ”. | `dueAt = now - 10 phút`: `diffHours` làm tròn thành 0. | So sánh bằng milliseconds trước; quá hạn dùng `Math.ceil(abs(diffMs)/day)`, còn hạn dùng `Math.ceil(diffMs/hour)`. |
| **Low** | A | `server/controllers/borrow-public-controller.js:14-39`, `:505-506` | Public view che email/SĐT tốt, nhưng vẫn trả tên đầy đủ, `studentId`, note và lý do cho mọi phiếu cũ mà token dài hạn truy cập được. `studentId` đặc biệt không cần cho luồng trả. | Token cũ bị lộ cho phép đọc lịch sử phiếu kèm tên/student ID và nội dung ghi chú. | Data minimization theo trạng thái và action; bỏ `studentId` khỏi public view nếu không phục vụ quyết định UI, hạn chế lịch sử/PII sau khi phiếu đóng. |
| **Low** | C | `client/src/components/borrow/BorrowRequestCard.jsx:189-190`; `client/src/components/borrow/BorrowHome.jsx:204-210` | Nhiều text 10–11px dùng `text-slate-400` (`#94a3b8`) trên trắng, tỷ lệ khoảng **2.56:1**, không đạt WCAG AA 4.5:1 cho chữ thường. | Các nhãn nhỏ “Người mượn”, metadata ngày tạo khó đọc trên điện thoại ngoài trời. | Tối thiểu `text-slate-600`, cỡ 12–14px; giữ slate-400 chỉ cho trang trí không mang thông tin. Font Be Vietnam Pro hiện hỗ trợ dấu tiếng Việt tốt. |
| **Low** | D | `client/src/components/borrow/BorrowForm.jsx:61-763`; `BorrowReturn.jsx:113-741`; `BorrowHome.jsx:63-581` | Ba component 582–764 dòng; lặp normalization SĐT, phân loại status, fetch/token cleanup và style. Không có test frontend trong `client/package.json`. | Sửa status hoặc luật SĐT ở một trang nhưng bỏ sót trang khác; UI regression không bị CI bắt. | Tách hook `useBorrowRequests`, `PhoneField`, `BorrowStatus`, `DueDatePicker`, `OtpInput`, dialog chuẩn; đưa normalization/date/status sang module dùng chung và thêm Vitest + Testing Library + axe. |

## 3. Các điểm đã kiểm và đang ổn

### IDOR và phân quyền

- Không tìm thấy đường IDOR trực tiếp đã chứng minh được.
- `requestReturn` đọc đúng `:id`, sau đó yêu cầu token khớp hash của chính document hoặc UID chủ phiếu tại `server/controllers/borrow-public-controller.js:669-705`.
- Token của phiếu khác không thể dùng để báo trả phiếu đang nhắm tới.
- Khi authenticated user gửi token của account khác, `/my` loại document có UID khác tại `borrow-public-controller.js:458-480`.

### Firestore query và kho

- `in` và `array-contains-any` nhận tối đa 10 hash phía client, thấp hơn giới hạn Firestore đang được dùng.
- Stock transaction re-read request và resource trước khi update.
- Test concurrent approval xác nhận hai phiếu tranh món cuối chỉ có một phiếu được duyệt, kho không âm.
- Tuy vậy, test đang dùng Firestore mock; vẫn cần emulator/integration test với SDK thật.

### Lỗi mạng và validation

- UI hiển thị chi tiết shortage từ response 409 và giữ nguyên dữ liệu form.
- Lỗi 502 có hướng dẫn kiểm tra email/thử lại.
- Note có giới hạn 500 ký tự ở cả client và server.
- Transition service chặn các cạnh trạng thái không hợp lệ và re-read trong transaction.

## 4. Sửa đề xuất cho hai mục High

### 4.1. Chặn mint token khi replay link xác nhận

```js
// verifyEmail: verify token chỉ dùng một lần
if (docData.status !== 'unverified') {
    return res.status(200).json({
        request: toPublicView(docData)
        // Không trả accessToken mới
    });
}

// Khi xác nhận lần đầu, không giữ một credential replay vĩnh viễn
patch: {
    verifyTokenHash: null,
    verifiedTokenHash: null
}
```

Đoạn guard trên là biện pháp chặn khẩn cấp. Giải pháp hoàn chỉnh cho UX máy mới là management nonce/session riêng, không tái sử dụng verify token.

### 4.2. One-time management code đổi sang cookie session

```js
// Email chứa one-time code, không chứa access token dài hạn.
// Đặt code trong fragment để không đi vào HTTP request/referrer.
const code = newToken();

await borrowLinkCodes.doc(hash(code)).set({
    requestId,
    expiresAt: Date.now() + 10 * 60_000,
    consumedAt: null
});

const manageUrl = `${appUrl}/borrow/manage#code=${encodeURIComponent(code)}`;

// POST /api/borrow/link/exchange
await db.runTransaction(async (tx) => {
    const snap = await tx.get(codeRef);
    const link = snap.data();

    if (!snap.exists || link.consumedAt || link.expiresAt <= Date.now()) {
        throw new HttpError(410, 'Liên kết đã hết hạn hoặc đã được sử dụng');
    }

    tx.update(codeRef, { consumedAt: Date.now() });
    tx.set(sessionRef, {
        requestId: link.requestId,
        expiresAt: Date.now() + 30 * 60_000
    });
});

res
    .set('Cache-Control', 'no-store')
    .cookie('__Host-borrow', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60_000
    })
    .sendStatus(204);
```

Trang landing nên yêu cầu người dùng bấm “Tiếp tục quản lý phiếu” trước khi exchange để email link scanner không vô tình tiêu thụ nonce.

Ngoài ra nên thêm cho các trang chứa link nhạy cảm:

```js
res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer'
});
```

Các header trên không thay thế việc loại bỏ bearer token khỏi query string, vì request URL ban đầu vẫn có thể đã được proxy ghi log.

## 5. Test nên bổ sung

### Security và token

1. `verify_replayed_token_must_not_mint_access_after_otp_revocation`
   - Xác nhận phiếu.
   - OTP recovery để thu hồi token cũ.
   - Gọi lại verify token cũ.
   - Assert không trả token mới và token cũ không mở được `/my`.

2. `management_link_code_is_single_use_and_expires`
   - Gửi hai exchange song song.
   - Assert đúng một request thành công, request còn lại trả 410.
   - Assert code hết TTL không đổi được session.

3. `closed_request_session_is_revoked_or_minimized`
   - Đóng phiếu.
   - Assert session cũ bị thu hồi hoặc response không còn PII không cần thiết.

### Reminder và concurrency

4. `reminder_send_failure_is_retried_without_marking_sent`
   - Cho SMTP throw.
   - Assert `sentAt` chưa set, `nextRetryAt` tồn tại.
   - Lần chạy sau gửi lại thành công.

5. `two_reminder_workers_claim_only_once`
   - Chạy hai job instance.
   - Assert một email, một notification và token trong email còn hợp lệ.

6. `concurrent_issueReminderToken_preserves_all_committed_hashes`
   - Cấp hai token song song.
   - Assert cả hai token hợp lệ, hoặc chỉ worker claim thành công được phép gửi.

### OTP và quota

7. `concurrent_otp_requests_respect_phone_hourly_limit`
   - Gửi năm request song song cùng SĐT.
   - Assert số email không vượt policy và chỉ một code xác định còn hiệu lực.

8. `concurrent_guest_creates_cannot_exceed_open_quota`
   - Tạo năm phiếu song song cùng email/SĐT.
   - Assert tối đa ba document mở.

9. `authenticated_user_open_request_quota_and_rate_limit`
   - Assert UID không thể tạo vô hạn và nhận 429 có hướng dẫn.

### Frontend, timezone và accessibility

10. `due_date_renders_same_calendar_day_in_utc_minus_8_and_plus_10`
    - Mock timezone.
    - Assert `dueDate` luôn hiển thị đúng ngày Việt Nam.

11. `borrow_form_and_otp_pass_axe`
    - Assert label/input association, dialog semantics, error announcement và OTP accessible name.

12. `otp_backspace_clears_previous_digit_and_full_paste_fills_all`
    - Assert paste `123456`.
    - Assert Backspace xóa chữ số trước và focus đúng ô.

13. `resource_fetch_failure_shows_retry_not_empty_inventory`
    - Cho API reject.
    - Assert error panel và nút retry.
    - Assert không hiện “không có thiết bị”.

14. `out_of_stock_resource_remains_visible_and_disabled`
    - API trả resource có `availableQty = 0`.
    - Assert card còn hiển thị, không chọn được và có text “Hết hàng”.

## 6. Top 10 cải tiến UI/UX theo tác động ÷ công sức

### 1. Đưa hành động chính lên đầu — tác động rất cao / công sức thấp

- **Trước:** marquee và bốn ô thống kê chiếm phần đầu.
- **Sau:** ngay dưới brand là “Mượn thiết bị” và “Tra cứu / Báo trả”; stats nằm sau phiếu cần xử lý.

### 2. Tách error khỏi empty state — cao / thấp

- **Trước:** lỗi mạng biến thành “không có thiết bị/phiếu”.
- **Sau:** panel lỗi tồn tại, giải thích ngắn và có “Thử lại”; empty chỉ xuất hiện sau response thành công.

### 3. Field error cạnh đúng field — cao / thấp–trung bình

- **Trước:** một banner lỗi ở đầu form.
- **Sau:** lỗi email/SĐT/ngày/thiết bị ngay dưới field, tự cuộn và focus field đầu tiên.

### 4. OTP semantic và hỗ trợ autofill — cao / trung bình

- **Trước:** sáu textbox không nhãn, Backspace hai bước.
- **Sau:** một input `one-time-code` có giao diện sáu ô; dán, autofill, screen reader và Backspace đều tự nhiên.

### 5. Ngày trả bất biến theo ngày Việt Nam — cao / thấp

- **Trước:** hiển thị phụ thuộc timezone máy.
- **Sau:** dùng `dueDate` date-only, hiển thị “Thứ N, dd/mm/yyyy · 23:59 giờ Việt Nam”.

### 6. Đưa “việc cần làm tiếp” lên đầu boarding pass — cao / thấp

- **Trước:** danh sách thiết bị đứng trước hạn trả và helper; phần trang trí chiếm nhiều chỗ.
- **Sau:** `Trạng thái → Việc cần làm → Hạn trả → CTA`, sau đó mới đến thiết bị và metadata.

### 7. Hiện thiết bị hết hàng — trung bình–cao / thấp

- **Trước:** thiết bị biến mất khỏi danh mục.
- **Sau:** giữ card disabled, nhãn chữ “Hết hàng”, không dùng opacity/màu làm tín hiệu duy nhất.

### 8. Vùng chạm tối thiểu 44px — trung bình / thấp

- **Trước:** nút ± là 32px, date/filter chip chỉ `py-1`.
- **Sau:** stepper 44×44, chip cao ít nhất 44px, khoảng cách đủ để không bấm nhầm.

### 9. Dialog và reduced motion chuẩn — trung bình / trung bình

- **Trước:** modal không trap focus/Esc; animation luôn chạy.
- **Sau:** dialog semantic, focus restore, Esc; tắt transform/pulse/bounce khi người dùng bật Reduce Motion.

### 10. Giảm mật độ neo-brutalism trên mobile — trung bình / thấp

- **Trước:** nhiều viền, bóng, gradient, chữ 9–11px và barcode trang trí cạnh tranh với thông tin.
- **Sau:** một cấp bóng chính, bỏ barcode/marquee không cần thiết trên màn nhỏ, chữ phụ ≥12px và slate-600 trở lên.

### Phác thảo màn đầu mobile

```text
┌──────────────────────────────┐
│ GEAR PASS                    │
│ Mượn / trả thiết bị          │
├──────────────────────────────┤
│ [  MƯỢN THIẾT BỊ MỚI       ]│
│ Chọn thiết bị · ngày trả     │
│                              │
│ [  TRA CỨU / BÁO TRẢ       ]│
│ Dùng SĐT và mã OTP           │
├──────────────────────────────┤
│ VIỆC BẠN CẦN LÀM             │
│ ┌ Chờ xác nhận email       ┐ │
│ │ Mở email để hoàn tất     │ │
│ │ [Gửi lại email]          │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ Phiếu đang mở · Lịch sử      │
│ Vị trí và giờ làm việc       │
└──────────────────────────────┘
```

## 7. Thứ tự fix đề xuất

### P0 — trước production

- [ ] Verify token one-time; chặn replay mint token.
- [ ] Thay bearer URL dài hạn bằng one-time management code + cookie session.
- [ ] Thêm TTL và revocation server-side cho session/token.
- [ ] Bổ sung test replay và single-use exchange.

### P1 — độ tin cậy và chống abuse

- [ ] Reminder outbox/claim transaction, retry khi email lỗi.
- [ ] OTP counter transaction và limiter theo phone HMAC.
- [ ] Quota cho account; quota guest nguyên tử.
- [ ] Chốt product policy về stock hold.
- [ ] Chuẩn hóa `dueDate` theo timezone Việt Nam.

### P2 — mobile UX và accessibility

- [ ] Đưa CTA lên đầu và lazy-load route.
- [ ] Error state riêng, field-level validation.
- [ ] OTP semantic/autofill.
- [ ] Dialog focus trap/Esc và reduced motion.
- [ ] Touch target ≥44px; hiện thiết bị hết hàng.
- [ ] Tăng contrast/cỡ chữ phụ.

### P3 — maintainability

- [ ] Tách các component trên 500 dòng.
- [ ] Gom logic phone/date/status dùng chung.
- [ ] Thêm Vitest + Testing Library + axe.
- [ ] Thêm Firestore Emulator integration tests.

## 8. Những gì chưa kiểm được

- Chưa chạy trên Firestore Emulator hoặc production Firestore thật; 71 test hiện dùng mock nên không xác nhận hành vi retry/index/transaction của SDK thực tế.
- Chưa kiểm tra cấu hình reverse proxy/CDN: access log có ghi query/Referer hay không, backend port có public hay không, và `trust proxy = 1` có đúng topology.
- Chưa kiểm tra SMTP/provider thật, email link scanner, forwarding policy và khả năng một lỗi gửi vẫn tạo email thành công.
- Chưa đo layout trực tiếp trên thiết bị 360–414px, bàn phím iOS/Android, VoiceOver/TalkBack hoặc trình duyệt timezone khác; nhận định UI dựa trên source.
- Chưa thấy CSP, log-redaction, retention policy cụ thể cho borrow PII và session/token trong môi trường triển khai.
- Chưa xác nhận product policy về việc “gửi phiếu” có đồng nghĩa giữ hàng hay chỉ giữ khi admin duyệt.
- Frontend build pass, nhưng có cảnh báo chunk lớn và dữ liệu Browserslist cũ; chưa đo LCP/INP trên mạng di động thật.

## 9. Kết quả lệnh xác minh

### Backend

```text
Test Suites: 4 passed, 4 total
Tests:       71 passed, 71 total
```

Các suite đã chạy:

- `tests/borrow-public.test.js`
- `tests/borrow-admin.test.js`
- `tests/borrow-reminder-job.test.js`
- `tests/borrow-stock.test.js`

### Frontend

```text
vite v5.4.21
✓ 4043 modules transformed
✓ built successfully

Main bundle:
index-*.js  1,544.30 kB minified / 386.85 kB gzip
```

Build có cảnh báo chunk lớn hơn 500 kB; đây là cơ sở cho khuyến nghị route-level code splitting.
