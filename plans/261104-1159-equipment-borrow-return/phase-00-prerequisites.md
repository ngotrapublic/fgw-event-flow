# Phase 00 — Chuẩn bị

## Steps

1. `git checkout main && git pull && git checkout -b feat/equipment-borrow`
2. **Backup dữ liệu trước mọi thay đổi**: gọi `GET /api/backup` bằng tài khoản admin (xem [server/routes/backup.js](../../server/routes/backup.js)), lưu file JSON ra ngoài repo. Ghi đường dẫn file backup vào báo cáo phase. Không commit file backup.
3. Cài thư viện server:
   ```
   cd server && npm install express-rate-limit@^7 qrcode@^1
   ```
   Client **không** cài thêm gì.
4. Bổ sung `runTransaction` vào [server/tests/helpers/firestoreMock.js](../../server/tests/helpers/firestoreMock.js) — hiện mock không có, mọi test phase 01–03 cần nó:
   ```js
   // Trong db object của buildFirebaseMock:
   runTransaction: async (fn) => {
       // Serialise transactions so concurrent calls behave like Firestore retries
       const run = (db.__txChain || Promise.resolve()).then(async () => {
           const writes = [];
           const tx = {
               get: async (refOrQuery) => refOrQuery.get(),
               set: (ref, data, opts) => writes.push(() => ref.set(data, opts)),
               update: (ref, data) => writes.push(() => ref.update(data)),
               delete: (ref) => writes.push(() => ref.delete())
           };
           const result = await fn(tx);
           for (const w of writes) await w();
           return result;
       });
       db.__txChain = run.catch(() => {});
       return run;
   }
   ```
   Và export thêm `borrowRequestsCollection: db.collection('borrow_requests')`, `borrowOtpsCollection: db.collection('borrow_otps')` trong object trả về.
   Kiểm `ref.update` của mock có xử lý `__increment` không (hiện chỉ `set` xử lý). Nếu không, sửa `update` để áp dụng `__increment` giống `set`.

   **Đường dẫn lồng nhau:** code mượn trả query `where('borrower.phone', …)`, `where('borrower.uid', …)`, nhưng `matchesWhere` và `execute` của mock đọc `data[field]` → luôn `undefined`. Thêm helper và dùng nó ở cả `matchesWhere` lẫn phần sort:
   ```js
   // Resolve dotted Firestore field paths like 'borrower.phone'
   const getPath = (data, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
   ```
   Thêm test nhỏ trong `server/tests/firestoreMock.nested.test.js`: `where('a.b', '==', 1)` tìm đúng doc `{ a: { b: 1 } }`.
5. Chạy toàn bộ test cũ để có baseline: `cd server && npx jest`. Ghi kết quả (số pass/fail) vào báo cáo. Nếu có test cũ đang fail trước khi sửa, **ghi lại, không sửa**.

## Validation
- `npx jest` sau khi sửa mock: số test pass không giảm so với baseline.

## Báo reviewer
Đường dẫn backup, kết quả baseline test, diff `firestoreMock.js`, `package.json`, `package-lock.json`.
