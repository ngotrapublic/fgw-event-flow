const admin = require('firebase-admin');
const path = require('path');
// Use the real .env file instead of placeholder
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

async function syncEventCounter() {
    console.log('[SYNC] Bắt đầu kiểm kê và đồng bộ Bảng Đếm (Metadata Counter)...');
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();
        
        const eventsSnapshot = await db.collection('events')
            .where('isUniqueEvent', '==', true)
            .get();
        
        const uniqueCount = eventsSnapshot.size;

        const statsRef = db.collection('metadata').doc('stats');
        await statsRef.set({ totalUniqueEvents: uniqueCount }, { merge: true });

        console.log(`[SYNC THÀNH CÔNG] Đã ghi nhận tổng cộng: ${uniqueCount} sự kiện logic lên Bảng Đen.`);
        process.exit(0);
    } catch (error) {
        console.error('[SYNC LỖI] Không thể đồng bộ:', error);
        process.exit(1);
    }
}

syncEventCounter();
