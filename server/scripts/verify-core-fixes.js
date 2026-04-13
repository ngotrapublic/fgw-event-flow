require('dotenv').config({ path: __dirname + '/../.env.development' });

// We must bypass missing env issues if testing locally
if (!process.env.FIREBASE_PRIVATE_KEY) {
    require('dotenv').config({ path: __dirname + '/../.env' });
}

const { db, eventsCollection } = require('../config/firebase');
const eventController = require('../controllers/eventController');
const { randomUUID } = require('crypto');

// ─── COLOR HELPERS ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, message) {
    if (condition) {
        passed++;
        console.log(`  ${GREEN}✓${RESET} ${testName}`);
    } else {
        failed++;
        console.log(`  ${RED}✗${RESET} ${testName}`);
        failures.push({ name: testName, message });
    }
}

// ─── MOCK OBJECTS ──────────────────────────────────────────────────
const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    res.download = (...args) => { res.args = args; return res; };
    res.send = (text) => { res.text = text; return res; };
    return res;
};

const DUMMY_UID = 'bot_qa_tester';

/**
 * START
 */
async function runTests() {
    console.log(`\n${BOLD}${CYAN}--- BẮT ĐẦU KIỂM ĐỊNH QA TỰ ĐỘNG ---${RESET}\n`);

    try {
        // GET INITIAL COUNTER
        const initialStatsDoc = await db.collection('metadata').doc('stats').get();
        const initialCount = initialStatsDoc.exists ? initialStatsDoc.data().totalUniqueEvents || 0 : 0;
        let finalGeneratedEventIdForDeletion = null;
        let finalGroupIdForDeletion = null;

        // ==========================================
        // TEST 1: HOT EXPORT LIMIT (QUOTA BLOCKER)
        // ==========================================
        console.log(`${BOLD}1. Kiểm định Live Export API (Chặn Quota)...${RESET}`);
        let req1 = { query: {} }; // No days parameter
        let res1 = mockRes();
        await eventController.exportEventsCsv(req1, res1);
        assert(res1.statusCode === 400, "API từ chối truy cập không giới hạn", 
            `Status was ${res1.statusCode}, expected 400`);
        assert(res1.data && res1.data.error && res1.data.error.includes('Missing ?days'), "Thông báo lỗi đúng chuẩn", 
            `Error message was: ${JSON.stringify(res1.data)}`);


        // ==========================================
        // TEST 2: METADATA COUNTER (CREATE SINGLE)
        // ==========================================
        console.log(`\n${BOLD}2. Kiểm định Metadata Counter (Tạo Đơn & Chuỗi)...${RESET}`);
        const singleEventReq = {
            user: { uid: DUMMY_UID, email: 'bot@test.com', role: 'admin' },
            body: {
                eventName: '[TEST_QA_BOT] Sự kiện Đơn',
                eventDate: '2027-01-01',
                eventEndDate: '2027-01-01',
                startTime: '08:00',
                endTime: '10:00',
                skipConflictCheck: true
            }
        };
        let resSingle = mockRes();
        // Since we override request handlers normally using next
        await eventController.createEvent(singleEventReq, resSingle, (err) => console.log('Mock Next:', err));
        
        let afterSingleStats = await db.collection('metadata').doc('stats').get();
        let afterSingleCount = afterSingleStats.data().totalUniqueEvents || 0;
        
        assert(afterSingleCount === initialCount + 1, "Tạo sự kiện Đơn (1 ngày) cộng chuẩn xác +1 vào Bảng đếm", `Expected ${initialCount + 1}, got ${afterSingleCount}`);
        
        // Grab the created doc ID to delete it
        if(resSingle.data && resSingle.data.id) {
           finalGeneratedEventIdForDeletion = resSingle.data.id;
        } else {
           // Fallback to manual db search
           const tSnap = await eventsCollection.where('eventName', '==', '[TEST_QA_BOT] Sự kiện Đơn').get();
           if(!tSnap.empty) finalGeneratedEventIdForDeletion = tSnap.docs[0].id;
        }

        // ==========================================
        // TEST 3: METADATA COUNTER (CREATE SERIES)
        // ==========================================
        const seriesReq = {
            user: { uid: DUMMY_UID, email: 'bot@test.com', role: 'admin' },
            body: {
                eventName: '[TEST_QA_BOT] Sự kiện Chuỗi Test Grouping',
                eventDate: '2027-10-01',
                eventEndDate: '2027-10-05',
                startTime: '08:00',
                endTime: '11:00',
                skipConflictCheck: true
            }
        };
        let resSeries = mockRes();
        await eventController.createEvent(seriesReq, resSeries, () => {});
        
        let afterSeriesStats = await db.collection('metadata').doc('stats').get();
        let afterSeriesCount = afterSeriesStats.data().totalUniqueEvents || 0;
        
        assert(afterSeriesCount === initialCount + 2, "Tạo sự kiện Chuỗi (5 ngày) cũng chỉ cộng chuẩn xác thêm +1 vào Bảng đếm", `Expected ${initialCount + 2}, got ${afterSeriesCount}`);

        const sSnap = await eventsCollection.where('eventName', '==', '[TEST_QA_BOT] Sự kiện Chuỗi Test Grouping').get();
        assert(sSnap.size === 5, "Database vật lý nhét đúng 5 tờ giấy con (Documents) cho sự kiện 5 ngày", `Expected 5, got ${sSnap.size}`);
        
        if(!sSnap.empty) {
            finalGroupIdForDeletion = sSnap.docs[0].data().groupId;
        }


        // ==========================================
        // TEST 4: CSV GROUPING LOGIC ISOLATION
        // ==========================================
        console.log(`\n${BOLD}3. Kiểm định Thuật toán Nhóm CSV (CSV Grouping)...${RESET}`);
        let baseDocs = sSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));
        // Apply manual snippet from our code 
        const groupedEventsMap = {};
        const groupedEventsList = [];
        baseDocs.forEach(e => {
            if (e.groupId) {
                if (!groupedEventsMap[e.groupId]) {
                    const copy = { ...e, startDateMap: e.eventDate, endDateMap: e.eventDate };
                    groupedEventsMap[e.groupId] = copy;
                    groupedEventsList.push(copy);
                } else {
                    const existing = groupedEventsMap[e.groupId];
                    if (e.eventDate < existing.startDateMap) existing.startDateMap = e.eventDate;
                    if (e.eventDate > existing.endDateMap) existing.endDateMap = e.eventDate;
                }
            } else {
                const copy = { ...e, startDateMap: e.eventDate, endDateMap: e.eventDate };
                groupedEventsList.push(copy);
            }
        });
        
        assert(groupedEventsList.length === 1, "Giao diện báo cáo quét 5 documents và co gọn thành đúng 1 Dòng (Row)", `Expected 1, got ${groupedEventsList.length}`);
        if(groupedEventsList.length === 1) {
            const ge = groupedEventsList[0];
            assert(ge.startDateMap === '2027-10-01' && ge.endDateMap === '2027-10-05', 
                "Cột Ngày Nhóm bắt chuẩn xác dải thời gian: Từ ngày mùng 1 đến ngày mùng 5", 
                `Got start=${ge.startDateMap}, end=${ge.endDateMap}`);
        }


        // ==========================================
        // TEST 5: DELETION AND COUNTER RESTORATION
        // ==========================================
        console.log(`\n${BOLD}4. Kiểm định Hàm Xóa (Clean Up & Metadata)...${RESET}`);
        if (finalGeneratedEventIdForDeletion) {
             let delReq = { params: { id: finalGeneratedEventIdForDeletion }, user: { uid: DUMMY_UID, role: 'admin' }, ip: '127.0.0.1' };
             let delRes = mockRes();
             await eventController.deleteEvent(delReq, delRes, () => {});
        }
        
        if (finalGroupIdForDeletion && sSnap.size > 0) {
             // Deleting by Group Id relies on hitting ANY single doc id in the group
             let delReq2 = { params: { id: sSnap.docs[0].id }, user: { uid: DUMMY_UID, role: 'admin' }, ip: '127.0.0.1' };
             let delRes2 = mockRes();
             await eventController.deleteEvent(delReq2, delRes2, () => {});
        }
        
        // Final sanity check
        let finalStats = await db.collection('metadata').doc('stats').get();
        let finalCount = finalStats.data().totalUniqueEvents || 0;
        
        assert(finalCount === initialCount, "Bảng đếm phục hồi chính xác sau khi Xóa toàn bộ dữ liệu Test", `Expected ${initialCount}, got ${finalCount}`);
        
        const finalSnap = await eventsCollection.where('eventName', '>=', '[TEST_QA_BOT]').get();
        assert(finalSnap.empty, "Dữ liệu vật lý rác đã được dập sạch", "Not empty");

    } catch (e) {
        console.error(e);
        failed++;
        failures.push({ name: 'Chương trình sụp đổ', message: e.message });
    }

    console.log(`\n${BOLD}--- TỔNG KẾT KẾT QUẢ ---${RESET}`);
    console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
    console.log(`  ${RED}Failed: ${failed}${RESET}`);

    if (failures.length > 0) {
        console.log(`\n  ${RED}[CHI TIẾT LỖI]${RESET}`);
        failures.forEach((f, i) => console.log(`  ${i+1}. ${f.name}\n      - ${f.message}`));
    }
    
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
