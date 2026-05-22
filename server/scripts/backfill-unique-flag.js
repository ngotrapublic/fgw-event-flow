const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Robust private key cleaner
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
}

const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
};

async function backfillUniqueFlag() {
    console.log('[BACKFILL] Bắt đầu kiểm tra và gán cờ isUniqueEvent cho dữ liệu cũ...');
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();
        const eventsCollection = db.collection('events');

        const snapshot = await eventsCollection.get();
        console.log(`[BACKFILL] Tìm thấy tổng cộng ${snapshot.size} documents.`);

        const batch = db.batch();
        const seenGroups = new Set();
        let updatedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // If already set, skip unless it's obviously wrong (but we'll trust current state for new events)
            if (data.isUniqueEvent !== undefined) continue;

            let isUnique = false;
            
            if (data.groupId) {
                if (!seenGroups.has(data.groupId)) {
                    seenGroups.add(data.groupId);
                    isUnique = true;
                }
            } else {
                // Single event
                isUnique = true;
            }

            batch.update(doc.ref, { isUniqueEvent: isUnique });
            updatedCount++;

            // Batch size safety
            if (updatedCount % 400 === 0) {
                console.log(`[BACKFILL] Đang xử lý batch... (${updatedCount} đã được xếp hàng)`);
            }
        }

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`✅ [BACKFILL THÀNH CÔNG] Đã cập nhật ${updatedCount} sự kiện cũ.`);
        } else {
            console.log('✨ [BACKFILL] Không có dữ liệu cũ nào cần xử lý.');
        }

        process.exit(0);
    } catch (error) {
        console.error('[BACKFILL LỖI]:', error);
        process.exit(1);
    }
}

backfillUniqueFlag();
