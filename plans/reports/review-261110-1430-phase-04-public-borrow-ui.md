# Báo cáo review Phase 04 — Trang công khai `/borrow`

- Plan: [phase-04-borrow-page-ui.md](../261104-1159-equipment-borrow-return/phase-04-borrow-page-ui.md)
- Branch: `feat/equipment-borrow`
- Người review: Claude Code

| Lần | Thời điểm | Kết quả |
|---|---|---|
| 1 | 2026-11-10 14:30 | ⚠️ Không có lỗi chặn. 1 lỗi trung bình (M1), 1 điểm nên sửa (M2) |

## Kết luận (lần 1)

**Gần đạt.** Luồng chính (tạo phiếu, xác nhận email, danh sách phiếu, báo trả, tra cứu SĐT) viết đúng và khớp API phase 02. Link "Quản lý" trong email cũng đúng: `sendVerify` và `sendCreatedForAccount` truyền `accessToken` vào `manageUrl` ([borrow-email-service.js:99](../../server/services/borrow-email-service.js) và [:137](../../server/services/borrow-email-service.js)).

Một lỗ hổng còn lại: mở lại link xác nhận sau khi phiếu đã được xác nhận thì không lưu được token, nên về `/borrow` sẽ không thấy phiếu.

**Giới hạn:** chỉ đọc code, chưa chạy `cd client && npm run build` và chưa test trên điện thoại thật.

## Lỗi

### M1 — Mở lại link xác nhận không lưu được token

[borrow-public-controller.js:316-318](../../server/controllers/borrow-public-controller.js): khi phiếu đã qua trạng thái `unverified`, `verify` trả `{ request }` và **không có `accessToken`**.

`BorrowVerify.jsx:32-34` chỉ lưu token khi response có `accessToken`. Lần bấm đầu thì ổn. Lần bấm lại trên cùng máy, hoặc mở link trên máy khác sau khi đã xác nhận, thì không có gì được lưu, và về `/borrow` sẽ trống phiếu. Đúng kịch bản "quét lại QR /borrow → phiếu tự hiện" trong mục Validation của phase 04.

**Cách xử lý:** ở nhánh idempotent, server phát một `accessToken` mới (token cũ chỉ lưu dạng hash, không lấy lại được) và trả kèm trong response. Client không cần sửa.

### M2 — Email trên thẻ phiếu bị che một phần

[borrow-public-controller.js:22](../../server/controllers/borrow-public-controller.js): `toPublicView` chạy `maskEmail` trước khi trả về. `BorrowRequestCard.jsx:195-198` in thẳng `request.borrower.email`, nên thẻ hiện dạng `n***@gmail.com`.

Không sai về bảo mật, nhưng dễ bị hiểu là dữ liệu lỗi.

**Cách xử lý:** bỏ dòng hiện email trên thẻ (tên là đủ), hoặc thêm chữ nhỏ "đã che một phần".

## Đã kiểm và không phải lỗi

- **Hạn trả:** `borrow-validation.js:73` tính `dueAt = ${dueDate}T16:59:59.000Z`, tức 23:59 giờ Việt Nam. Không bị lệch UTC như lo ngại.
- **Link "Quản lý":** `sendVerify` và `sendCreatedForAccount` truyền `accessToken` vào `manageUrl`, khớp với `accessTokenHash` mà `GET /my` kiểm tra.

## Đã kiểm và thấy đúng

- 5 route `/borrow*` gắn trong `App.jsx:44-49`, ngoài `<Layout>`.
- `borrow.js` khớp đủ 8 endpoint phase 02, header `X-Borrow-Token` và `X-Borrow-Tokens` đúng cách server đọc ở `findMatchingToken`.
- Form: có tài khoản chỉ hỏi SĐT, khách hỏi đủ tên/email/SĐT; số lượng không vượt `availableQty`; thiết bị hết hàng bị khoá; ngày trả từ ngày mai tới 1 năm; ghi chú ≤ 500 ký tự.
- Lỗi 502, 409 (kèm `details.shortages`), 409 báo trả đều có thông báo riêng.
- `BorrowReturn` có confirm modal trước khi báo trả, gộp token tra cứu với token localStorage khi gọi trả — cần thiết vì server yêu cầu token khớp `accessTokenHash`.
- `AuthContext.jsx:65` xoá token khi đăng xuất, tránh máy dùng chung lộ phiếu.
- Token store chỉ giữ chuỗi token, tối đa 10, đúng plan.

## Việc cần làm

1. [x] **M1** — nhánh verify idempotent (cũng như lần verify đầu & race 409) cấp thêm token phụ qua `issueReminderToken` vào `accessTokenHashes` (giữ nguyên `accessTokenHash` gốc và `manageUrl` trong email) và trả kèm `accessToken` trong response. Có test `8` & `8b` trong `borrow-public.test.js`.
2. [x] **M2** — đã bỏ dòng email bị che (`n***@gmail.com`) trên thẻ phiếu ở `BorrowRequestCard.jsx`, chỉ giữ tên người mượn cho gọn và tránh hiểu nhầm dữ liệu lỗi.
3. [x] Chạy `cd client && npm run lint` (0 errors) và `cd client && npm run build` (build thành công). Backend borrow tests: `4/4` suites, `68/68` tests pass.
4. [ ] Test trên điện thoại thật theo mục Validation của phase 04 (khách tạo phiếu, bấm xác nhận, bấm Quản lý trên trình duyệt khác, tra cứu SĐT, báo trả).

## Câu hỏi chưa giải quyết

- ~~`manageUrl` ở email nhắc sắp hạn/quá hạn thiếu `?t=`.~~ **Đã sửa (10/11/2026):** job gọi `issueReminderToken` (borrow-token-service.js) cấp token mới, lưu hash vào `accessTokenHashes` (tối đa 5), token gốc giữ nguyên. `GET /my`, báo trả, gửi lại xác nhận chấp nhận cả hai loại. Tra cứu OTP thu hồi token nhắc hạn. `toAdminView` ẩn `*Hashes`. Test: 3 suite, 51/51 pass (thêm test 9, 13b, 13c).
