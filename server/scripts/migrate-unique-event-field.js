/**
 * migrate-unique-event-field.js
 * 
 * One-time migration: thêm field `isUniqueEvent` vào toàn bộ events.
 * - isUniqueEvent: true  → sự kiện thường (không có groupId)
 * - isUniqueEvent: true  → sự kiện đầu tiên của chuỗi (isSeriesStart === true)
 * - isUniqueEvent: false → các ngày còn lại của chuỗi (day 2, 3, 4...)
 * 
 * Run: node scripts/migrate-unique-event-field.js
 */

const { db } = require('../config/firebase');

const BATCH_SIZE = 400;
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function migrate() {
    console.log(`\n${BOLD}${CYAN}--- MIGRATION: Thêm field isUniqueEvent ---${RESET}\n`);

    const snapshot = await db.collection('events').get();
    console.log(`Tổng cộng ${snapshot.size} documents cần được cập nhật...\n`);

    let trueCount = 0;
    let falseCount = 0;
    let batchOps = [];
    let batchIndex = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let isUniqueEvent;

        if (!data.groupId) {
            // Sự kiện thường (1 ngày, không có chuỗi) → Đại diện duy nhất
            isUniqueEvent = true;
            trueCount++;
        } else if (data.isSeriesStart === true) {
            // Ngày đầu tiên của chuỗi → Đại diện cho cả chuỗi
            isUniqueEvent = true;
            trueCount++;
        } else {
            // Ngày 2, 3, 4... của chuỗi → Không hiển thị trong danh sách
            isUniqueEvent = false;
            falseCount++;
        }

        batchOps.push({ ref: doc.ref, isUniqueEvent });

        // Commit theo batch 400 để không vượt Firestore limit
        if (batchOps.length >= BATCH_SIZE) {
            await commitBatch(batchOps, ++batchIndex);
            batchOps = [];
        }
    }

    // Commit phần còn lại
    if (batchOps.length > 0) {
        await commitBatch(batchOps, ++batchIndex);
    }

    console.log(`\n${BOLD}${GREEN}--- KẾT QUẢ MIGRATION ---${RESET}`);
    console.log(`  ${GREEN}✓ isUniqueEvent = true: ${trueCount} documents${RESET}`);
    console.log(`  ${YELLOW}• isUniqueEvent = false: ${falseCount} documents${RESET}`);
    console.log(`  Tổng: ${trueCount + falseCount}/${snapshot.size}\n`);
    console.log(`${BOLD}Migration hoàn tất! Giờ có thể deploy code mới.${RESET}\n`);
}

async function commitBatch(ops, batchIndex) {
    const batch = db.batch();
    ops.forEach(({ ref, isUniqueEvent }) => {
        batch.update(ref, { isUniqueEvent });
    });
    await batch.commit();
    console.log(`  Batch ${batchIndex}: Đã cập nhật ${ops.length} documents`);
}

migrate().catch(err => {
    console.error('Migration thất bại:', err);
    process.exit(1);
});
