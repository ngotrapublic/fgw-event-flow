# Equipment Borrow & Return — Implementation Plan

**Status:** ready for implementation
**Branch:** `feat/equipment-borrow` (tạo từ `main`)
**Implementer:** Antigravity agent · **Reviewer:** Claude Code (chỉ review, không viết code)

## Outcome

Trang công khai `/borrow` (truy cập qua QR dán ở kho) dùng chung cho người có và không có tài khoản: mượn thiết bị còn trong kho → admin/manager duyệt → giao → người mượn báo trả → admin/manager kiểm và chốt. Khách không bao giờ thấy sự kiện hay giao diện app.

## Quyết định đã chốt (KHÔNG thay đổi khi code)

| # | Quyết định |
|---|---|
| D1 | Một QR tĩnh ở kho trỏ tới `/borrow`, trang có 2 nút Mượn / Trả. Không gắn QR lên thiết bị |
| D2 | Khách điền tên, email, SĐT. Người có tài khoản: tên + email lấy từ profile, chỉ nhập SĐT |
| D3 | Khách **bắt buộc** bấm link xác nhận email; phiếu chỉ tới admin sau khi xác nhận. Người có tài khoản bỏ qua bước này |
| D4 | Không trả một phần. Người mượn báo trả cả phiếu; admin nhập số lượng thực nhận từng món |
| D5 | Người có tài khoản dùng chung trang `/borrow` |
| D6 | Nhận diện người trả theo thứ tự: token lưu trên điện thoại → link trong email → SĐT + OTP gửi về email |
| D7 | Admin chỉ chốt trả khi thiết bị đã ở kho; kho cộng lại **số thực nhận** |
| D8 | Không có mã 6 số khi giao/trả. Giao = admin bấm "Đã giao"; trả = người mượn báo trả → admin chốt |
| D9 | Phiếu không gắn sự kiện. Code mượn trả không đọc collection `events` |
| D10 | Người mượn tự chọn hạn trả, không có giới hạn nghiệp vụ (chỉ validate: sau hôm nay, ≤ 365 ngày, để chặn dữ liệu rác) |
| D11 | `admin` **và** `manager` đều được duyệt / giao / chốt trả |
| D12 | Server chạy sau nginx → `app.set('trust proxy', 1)` |

## Vòng đời phiếu

```
                 (khách)                (người có TK đi thẳng pending)
 unverified ──bấm link email──► pending ──duyệt──► approved ──đã giao──► handed_over ──báo trả──► return_pending
     │ quá 24h                    │                   │                     │                        │
     ▼                            ▼ từ chối           ▼ huỷ (không tới lấy) │ admin chốt trực tiếp   │ admin chốt
  expired                      rejected            cancelled                └──────────┬─────────────┘
                                                                                       ▼
                                                                       returned  |  returned_with_issue
```
- Kho **trừ** `availableQty` khi `pending → approved`; **cộng** toàn bộ khi `approved → cancelled`; **cộng `receivedQty`** khi chốt trả.
- `isOverdue` là **cờ** trên phiếu `handed_over`, không phải status.
- Trạng thái "mở" (đang chiếm chỗ của người mượn): `unverified, pending, approved, handed_over, return_pending`.

## Phases (làm tuần tự, mỗi phase 1 commit)

| Phase | Nội dung | Commit |
|---|---|---|
| [00](phase-00-prerequisites.md) | Branch, backup, cài thư viện, bổ sung mock test | `chore: prepare equipment borrow feature` |
| [01](phase-01-data-model-and-stock.md) | `availableQty`, collections, rules, index, service tồn kho, chặn lỗ hổng `/api/resources`, `/api/settings`, `/api/backup` | `feat(borrow): add stock tracking and borrow data model` |
| [02](phase-02-public-borrow-api.md) | API công khai: tạo phiếu, xác nhận email, tra phiếu, OTP, báo trả, rate-limit | `feat(borrow): add public borrow api` |
| [03](phase-03-admin-api-and-jobs.md) | API admin/manager, thông báo, job nhắc hạn | `feat(borrow): add admin borrow api and reminder job` |
| [04](phase-04-borrow-page-ui.md) | Trang `/borrow` mobile | `feat(borrow): add public borrow page` |
| [05](phase-05-admin-ui.md) | Trang quản lý `/equipment-loans`, sidebar, thông báo, in QR | `feat(borrow): add equipment loan management page` |

**Sau mỗi phase: dừng lại, báo reviewer.** Không gộp phase.

## Quy ước bắt buộc cho implementer

- Server CommonJS (`require`/`module.exports`), client ESM + JSX. Theo style file lân cận.
- File mới: kebab-case cho service/middleware/job/lib/test (`borrow-stock-service.js`); component React PascalCase (`BorrowForm.jsx`) như các component hiện có.
- Lỗi nghiệp vụ: ném `HttpError` (tạo ở phase 01) có `statusCode`; controller gọi `next(err)` để [errorHandler](../../server/middleware/errorHandler.js) xử lý. Không `res.status(500)` tự chế trong code mới.
- Mọi chuyển trạng thái đi qua **một** hàm `transition()` trong transaction (phase 01). Không update `status` ở chỗ khác.
- Không log token, OTP, SĐT hoặc email đầy đủ ra console.
- Test chạy bằng: `cd server && npx jest tests/<file>` (script `npm test` hiện là placeholder, **không sửa** nó trong phạm vi này).
- Mọi chuỗi người dùng nhập khi chèn vào HTML email phải qua `escapeHtml()`.
- Thời gian lưu ISO UTC (`new Date().toISOString()`); hiển thị theo `Asia/Ho_Chi_Minh`.

## Acceptance criteria (reviewer kiểm từng mục)

1. Tab ẩn danh mở `/borrow`: không có request tới `/api/events*`, không có sidebar/header app.
2. Chỉ thiết bị `availableQty > 0` hiện ra; không gửi được số lượng vượt `availableQty`.
3. Phiếu khách ở `unverified` cho tới khi bấm link; danh sách admin mặc định không có `unverified`/`expired`.
4. Hai request duyệt song song cho món cuối cùng → 1 thành công, 1 nhận `409`; `availableQty` không bao giờ âm.
5. Cùng trình duyệt quét lại QR → bấm Trả → phiếu đang mượn tự hiện, không phải nhập gì.
6. Trình duyệt khác: link trong email **hoặc** SĐT + OTP mở đúng phiếu. SĐT không tồn tại và SĐT tồn tại trả **cùng status code và cùng nội dung** response.
7. Chốt trả với `receivedQty` < `qty` → kho chỉ cộng `receivedQty`, phiếu `returned_with_issue`.
8. User đăng nhập thường đọc `borrow_requests` / `borrow_otps` qua Firestore SDK → permission denied.
9. Vượt rate-limit → `429`; log server có IP thật của client (không phải IP nginx).
10. User role `user` gọi `PUT /api/resources` → `403`; admin/manager sửa `quantity` → `availableQty` đổi theo delta.
11. Kênh email bị tắt trong Settings → khách tạo phiếu nhận `503` có thông báo rõ, không có phiếu "treo".
12. Manager thấy và dùng được trang `/equipment-loans`; user thường không thấy.
13. Toàn bộ test mới pass; test cũ trong `server/tests/` vẫn pass; `cd client && npm run build` thành công.

## Ngoài phạm vi

Gắn phiếu với sự kiện, QR trên thiết bị, trả một phần, Zalo/Telegram, ảnh tình trạng, sửa script `npm test`.

## Rollback

Mỗi phase 1 commit → `git revert <sha>`. Dữ liệu: backup ở phase 00. Field `availableQty` thừa không làm hỏng code cũ.
