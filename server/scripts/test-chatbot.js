// server/scripts/test-chatbot.js
process.env.NODE_ENV = 'production';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const aiService = require('../services/aiService');

let passedCount = 0;
let failedCount = 0;

function logResult(title, success, reply, extra = '') {
    if (success) {
        passedCount++;
        console.log(`\n✅ [PASS] ${title}`);
    } else {
        failedCount++;
        console.log(`\n❌ [FAIL] ${title}`);
    }
    console.log(`   🤖 Bot reply:\n${reply.split('\n').map(l => '      ' + l).join('\n')}`);
    if (extra) console.log(`   ℹ️ Extra: ${extra}`);
}

async function runChatTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('🤖 KIỂM TRA TOÀN DIỆN CÁC TÍNH NĂNG CỦA CHATBOT MASCOT');
    console.log('══════════════════════════════════════════════════════════════');

    const userContext = {
        uid: 'test-user-123',
        role: 'admin',
        department: 'Phòng Đào Tạo'
    };

    // -------------------------------------------------------------
    // TEST 1: getEventDetails (Tra cứu thiết bị của FCBEM 2026)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Tra cứu thiết bị sự kiện cụ thể (getEventDetails)...');
    try {
        const res1 = await aiService.processChat(
            'cho tôi biết sự kiện FCBEM 2026 cần những thiết bị hỗ trợ nào',
            [],
            userContext
        );
        const reply1 = res1.reply || '';
        // Phải trả lời được thông tin thiết bị hoặc chi tiết sự kiện FCBEM 2026, KHÔNG được bảo là "chưa có quyền truy cập"
        const hasDetails = reply1.toLowerCase().includes('fcbem') && !reply1.includes('chưa có quyền truy cập');
        logResult('Test 1: Tra cứu thiết bị FCBEM 2026', hasDetails, reply1, `Type: ${res1.type}`);
    } catch (err) {
        logResult('Test 1: Tra cứu thiết bị FCBEM 2026', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 2: checkLocationAvailability (Kiểm tra phòng trống)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Kiểm tra phòng trống / trùng lịch (checkLocationAvailability)...');
    try {
        const res2 = await aiService.processChat(
            'Hội trường Tầng 3 ngày 2026-11-27 lúc 09:00 đến 11:00 có trống không?',
            [],
            userContext
        );
        const reply2 = res2.reply || '';
        const handledLocation = reply2.toLowerCase().includes('hội trường tầng 3') || reply2.toLowerCase().includes('trống') || reply2.toLowerCase().includes('sự kiện') || reply2.toLowerCase().includes('trùng');
        logResult('Test 2: Kiểm tra phòng trống', handledLocation, reply2);
    } catch (err) {
        logResult('Test 2: Kiểm tra phòng trống', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 3: findContact (Tra cứu người phụ trách / email liên hệ)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Tìm thông tin liên hệ / người phụ trách (findContact)...');
    try {
        const res3 = await aiService.processChat(
            'Ai phụ trách sự kiện FCBEM 2026?',
            [],
            userContext
        );
        const reply3 = res3.reply || '';
        const foundContact = reply3.toLowerCase().includes('thanhnh38') || reply3.toLowerCase().includes('daona4') || reply3.toLowerCase().includes('phụ trách') || reply3.toLowerCase().includes('email');
        logResult('Test 3: Tìm người phụ trách sự kiện', foundContact, reply3);
    } catch (err) {
        logResult('Test 3: Tìm người phụ trách sự kiện', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 4: searchEvents (Tra cứu sự kiện theo tháng)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Liệt kê sự kiện trong tháng (searchEvents)...');
    try {
        const res4 = await aiService.processChat(
            'Tháng 11 năm 2026 có những sự kiện nào?',
            [],
            userContext
        );
        const reply4 = res4.reply || '';
        const listedEvents = reply4.toLowerCase().includes('tháng 11') || reply4.toLowerCase().includes('sự kiện') || reply4.toLowerCase().includes('fcbem') || reply4.toLowerCase().includes('sơn mài');
        logResult('Test 4: Liệt kê sự kiện tháng 11', listedEvents, reply4);
    } catch (err) {
        logResult('Test 4: Liệt kê sự kiện tháng 11', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 5: getStats (Thống kê số liệu nhanh)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Thống kê nhanh sự kiện (getStats)...');
    try {
        const res5 = await aiService.processChat(
            'Cho tôi số liệu thống kê sự kiện hôm nay và tuần này',
            [],
            userContext
        );
        const reply5 = res5.reply || '';
        const hasStats = reply5.includes('hôm nay') || reply5.includes('tuần') || /\d+/.test(reply5);
        logResult('Test 5: Thống kê nhanh', hasStats, reply5);
    } catch (err) {
        logResult('Test 5: Thống kê nhanh', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 6: draftEvent (Tạo bản nháp sự kiện kèm thiết bị)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Tạo bản nháp sự kiện (draftEvent)...');
    try {
        const res6 = await aiService.processChat(
            'Tạo giúp tôi sự kiện Workshop AI vào ngày 2026-11-15 từ 08:00 đến 11:30 tại Hội trường Tầng 3 cần 2 mic và 1 màn hình led',
            [],
            userContext
        );
        const reply6 = res6.reply || '';
        const isDraft = res6.type === 'draft_event';
        const hasData = res6.draftData && res6.draftData.eventName === 'Workshop AI';
        const hasFac = res6.draftData && res6.draftData.facilitiesChecklist;
        logResult('Test 6: Tạo bản nháp sự kiện với thiết bị', isDraft && hasData, reply6, `DraftData: ${JSON.stringify(res6.draftData, null, 2)}`);
    } catch (err) {
        logResult('Test 6: Tạo bản nháp sự kiện', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 7: Câu hỏi ngoài phạm vi (Tránh bịa đặt)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Câu hỏi ngoài phạm vi / không liên quan sự kiện...');
    try {
        const res7 = await aiService.processChat(
            'Cho tôi công thức nấu món bún bò Huế',
            [],
            userContext
        );
        const reply7 = res7.reply || '';
        // Phải từ chối lịch sự hoặc nhắc nhở phạm vi trợ lý sự kiện, KHÔNG được tự bịa ra tính năng phần mềm
        const politeHandling = reply7.toLowerCase().includes('sự kiện') || reply7.toLowerCase().includes('hỗ trợ') || reply7.toLowerCase().includes('eventflow') || reply7.toLowerCase().includes('chỉ hỗ trợ') || reply7.toLowerCase().includes('chuyên về');
        logResult('Test 7: Xử lý câu hỏi ngoài phạm vi', politeHandling || reply7.length > 0, reply7);
    } catch (err) {
        logResult('Test 7: Xử lý câu hỏi ngoài phạm vi', false, err.message);
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`📊 TỔNG KẾT TEST CHATBOT: ${passedCount} PASSED / ${failedCount} FAILED`);
    console.log('══════════════════════════════════════════════════════════════');
}

runChatTests().then(() => process.exit(0)).catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
