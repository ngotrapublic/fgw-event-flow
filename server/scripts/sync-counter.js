const { db } = require('../config/firebase');

async function syncEventCounter() {
    console.log('[SYNC] Bắt đầu kiểm kê và đồng bộ Bảng Đếm (Metadata Counter)...');
    try {
        const eventsSnapshot = await db.collection('events').get();
        const seenGroups = new Set();
        let uniqueCount = 0;

        eventsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.groupId) {
                if (!seenGroups.has(data.groupId)) {
                    seenGroups.add(data.groupId);
                    uniqueCount++;
                }
            } else {
                uniqueCount++;
            }
        });

        const statsRef = db.collection('metadata').doc('stats');
        await statsRef.set({ totalUniqueEvents: uniqueCount }, { merge: true });

        console.log(`[SYNC THÀNH CÔNG] Đã ghi nhận tổng cộng: ${uniqueCount} sự kiện logic lên Bảng Đen.`);
    } catch (error) {
        console.error('[SYNC LỖI] Không thể đồng bộ:', error);
    }
}

syncEventCounter();
