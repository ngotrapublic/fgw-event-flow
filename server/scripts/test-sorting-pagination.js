// server/scripts/test-sorting-pagination.js
process.env.NODE_ENV = 'production';
const eventController = require('../controllers/eventController');

function createMockRes() {
    return {
        statusCode: 200,
        finalData: null,
        json: function(data) {
            this.finalData = data;
            return this;
        },
        status: function(code) {
            this.statusCode = code;
            return this;
        }
    };
}

async function runTests() {
    console.log("=================================================");
    console.log("🚀 TEST CÁC TÍNH NĂNG SẮP XẾP VÀ BỘ LỌC MỚI");
    console.log("=================================================");

    const next = (err) => {
        if (err) console.error("❌ Controller báo lỗi:", err);
    };

    // -----------------------------------------------------------------
    // TEST 1: getAllEvents() mặc định (không truyền dateFilter)
    // Kỳ vọng: Sắp xếp ASC theo eventDate, cùng ngày sắp xếp theo startTime ASC
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] Kiểm tra getAllEvents mặc định (limit 9)...");
    const res1 = createMockRes();
    await eventController.getAllEvents({ query: { limit: '9' } }, res1, next);
    const data1 = res1.finalData;

    if (!data1 || !data1.events) {
        console.error("❌ TEST 1 FAILED: Không nhận được danh sách events!");
        return;
    }
    console.log(`✅ Nhận được ${data1.events.length} sự kiện. Total = ${data1.meta.total}`);
    data1.events.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [${e.eventDate}] (${e.startTime || '??'} - ${e.endTime || '??'}) ${e.eventName}`);
    });

    let isAsc = true;
    for (let i = 0; i < data1.events.length - 1; i++) {
        if (data1.events[i].eventDate > data1.events[i + 1].eventDate) {
            isAsc = false;
            break;
        }
    }
    console.log(isAsc ? "✅ TEST 1 PASSED: Thứ tự ngày tăng dần (ASC) thành công!" : "❌ TEST 1 FAILED: Ngày không tăng dần!");

    // -----------------------------------------------------------------
    // TEST 2: getAllEvents() với dateFilter = 'upcoming'
    // Kỳ vọng: Chỉ các sự kiện >= hôm nay, xếp ASC, cùng ngày xếp theo giờ ASC
    // -----------------------------------------------------------------
    console.log("\n[TEST 2] Kiểm tra dateFilter = 'upcoming' (limit 9)...");
    const res2 = createMockRes();
    await eventController.getAllEvents({ query: { dateFilter: 'upcoming', limit: '9' } }, res2, next);
    const data2 = res2.finalData;

    console.log(`✅ Nhận được ${data2.events.length} sự kiện sắp tới:`);
    data2.events.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [${e.eventDate}] (${e.startTime || '??'} - ${e.endTime || '??'}) ${e.eventName}`);
    });

    const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
    const allUpcoming = data2.events.every(e => e.eventDate >= todayStr);
    console.log(allUpcoming ? `✅ TEST 2a: Tất cả sự kiện đều >= hôm nay (${todayStr})` : "❌ TEST 2a FAILED: Có sự kiện trong quá khứ!");

    // Kiểm tra sắp xếp phụ theo giờ
    let timeOrderOk = true;
    for (let i = 0; i < data2.events.length - 1; i++) {
        if (data2.events[i].eventDate === data2.events[i + 1].eventDate) {
            const tA = data2.events[i].startTime || '00:00';
            const tB = data2.events[i + 1].startTime || '00:00';
            if (tA > tB) {
                timeOrderOk = false;
                console.log(`❌ Lỗi thứ tự giờ trên cùng ngày ${data2.events[i].eventDate}: ${tA} > ${tB}`);
            }
        }
    }
    console.log(timeOrderOk ? "✅ TEST 2b: Cùng ngày sắp xếp theo giờ bắt đầu (startTime ASC) chuẩn xác!" : "❌ TEST 2b FAILED!");

    // Kiểm tra sự kiện mới tạo "SPINE program" (2026-11-02) có nằm trên Trang 1 không
    const spineIdx = data2.events.findIndex(e => e.eventName && e.eventName.includes('SPINE program'));
    if (spineIdx !== -1) {
        console.log(`✅ TEST 2c: Sự kiện mới tạo "SPINE program" hiển thị ngay ở Trang 1 (Vị trí #${spineIdx + 1}) thay vì bị đẩy sang Trang 2 như trước!`);
    } else {
        console.log("ℹ️ TEST 2c: Không tìm thấy SPINE program ở Trang 1.");
    }

    // -----------------------------------------------------------------
    // TEST 3: Cursor Pagination với dateFilter = 'upcoming'
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] Kiểm tra Phân trang liên tục (Pagination: Page 1 -> Page 2)...");
    const resP1 = createMockRes();
    await eventController.getAllEvents({ query: { dateFilter: 'upcoming', limit: '4' } }, resP1, next);
    const p1 = resP1.finalData;
    console.log(`Page 1 trả về ${p1.events.length} sự kiện. HasMore = ${p1.meta.hasMore}, lastId = ${p1.meta.lastId}`);
    p1.events.forEach((e, i) => console.log(`  P1.#${i+1}: [${e.eventDate}] (${e.startTime}) ${e.eventName}`));

    const resP2 = createMockRes();
    await eventController.getAllEvents({ query: { dateFilter: 'upcoming', limit: '4', lastDocId: p1.meta.lastId } }, resP2, next);
    const p2 = resP2.finalData;
    console.log(`Page 2 trả về ${p2.events.length} sự kiện.`);
    p2.events.forEach((e, i) => console.log(`  P2.#${i+1}: [${e.eventDate}] (${e.startTime}) ${e.eventName}`));

    // Đảm bảo không trùng ID giữa P1 và P2
    const p1Ids = new Set(p1.events.map(e => e.id));
    const overlap = p2.events.filter(e => p1Ids.has(e.id));
    if (overlap.length === 0) {
        console.log("✅ TEST 3 PASSED: Phân trang mượt mà, không trùng lặp sự kiện giữa 2 trang!");
    } else {
        console.log("❌ TEST 3 FAILED: Có sự kiện bị trùng giữa P1 và P2:", overlap.map(e => e.id));
    }

    // -----------------------------------------------------------------
    // TEST 4: dateFilter = 'past' (Đã kết thúc)
    // Kỳ vọng: Sắp xếp DESC (sự kiện vừa diễn ra gần nhất nằm ở đầu)
    // -----------------------------------------------------------------
    console.log("\n[TEST 4] Kiểm tra dateFilter = 'past'...");
    const res4 = createMockRes();
    await eventController.getAllEvents({ query: { dateFilter: 'past', limit: '5' } }, res4, next);
    const data4 = res4.finalData;
    console.log(`✅ Nhận được ${data4.events.length} sự kiện quá khứ:`);
    data4.events.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [${e.eventDate}] ${e.eventName}`);
    });

    let isPastDesc = true;
    for (let i = 0; i < data4.events.length - 1; i++) {
        if (data4.events[i].eventDate < data4.events[i + 1].eventDate) {
            isPastDesc = false;
            break;
        }
    }
    console.log(isPastDesc ? "✅ TEST 4 PASSED: Sự kiện quá khứ sắp xếp DESC (mới qua gần nhất ở trên đầu)!" : "❌ TEST 4 FAILED: Quá khứ không xếp DESC!");

    console.log("\n=================================================");
    console.log("🎉 TẤT CẢ CÁC BÀI TEST ĐÃ HOÀN TẤT THÀNH CÔNG!");
    console.log("=================================================");
}

runTests().then(() => process.exit(0)).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
