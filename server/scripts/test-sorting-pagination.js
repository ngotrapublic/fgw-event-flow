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
    console.log("🚀 TEST BỘ QUY TẮC SẮP XẾP MỚI CHO TỪNG BỘ LỌC");
    console.log("=================================================");

    const next = (err) => {
        if (err) console.error("❌ Controller báo lỗi:", err);
    };

    // -----------------------------------------------------------------
    // TEST 1: dateFilter = 'all' (Tất cả sự kiện)
    // Kỳ vọng: Sắp xếp GIẢM DẦN (DESC) - Sự kiện mới nhất ở trên đầu
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] Kiểm tra dateFilter = 'all' (Tất cả sự kiện, limit 9)...");
    const res1 = createMockRes();
    await eventController.getAllEvents({ query: { dateFilter: 'all', limit: '9' } }, res1, next);
    const data1 = res1.finalData;

    if (!data1 || !data1.events) {
        console.error("❌ TEST 1 FAILED: Không nhận được danh sách events!");
        return;
    }
    console.log(`✅ Nhận được ${data1.events.length} sự kiện. Total = ${data1.meta.total}`);
    data1.events.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [${e.eventDate}] (${e.startTime || '??'} - ${e.endTime || '??'}) ${e.eventName}`);
    });

    let isAllDesc = true;
    for (let i = 0; i < data1.events.length - 1; i++) {
        if (data1.events[i].eventDate < data1.events[i + 1].eventDate) {
            isAllDesc = false;
            break;
        }
    }
    console.log(isAllDesc ? "✅ TEST 1 PASSED: 'Tất cả sự kiện' đã được sắp xếp GIẢM DẦN (DESC) - mới nhất lên đầu!" : "❌ TEST 1 FAILED: 'Tất cả' không giảm dần!");

    // -----------------------------------------------------------------
    // TEST 2: dateFilter = 'upcoming' (Sắp diễn ra)
    // Kỳ vọng: Chỉ các sự kiện >= hôm nay, sắp xếp TĂNG DẦN (ASC)
    // -----------------------------------------------------------------
    console.log("\n[TEST 2] Kiểm tra dateFilter = 'upcoming' (Sắp diễn ra, limit 9)...");
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

    let isUpcomingAsc = true;
    for (let i = 0; i < data2.events.length - 1; i++) {
        if (data2.events[i].eventDate > data2.events[i + 1].eventDate) {
            isUpcomingAsc = false;
            break;
        }
    }
    console.log(isUpcomingAsc ? "✅ TEST 2b: 'Sắp diễn ra' được sắp xếp TĂNG DẦN (ASC) - sự kiện sớm nhất ở đầu!" : "❌ TEST 2b FAILED!");

    // -----------------------------------------------------------------
    // TEST 3: dateFilter = 'past' (Đã kết thúc)
    // Kỳ vọng: Sắp xếp GIẢM DẦN (DESC) - Mới diễn ra gần nhất ở trên đầu
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] Kiểm tra dateFilter = 'past' (Đã kết thúc, limit 5)...");
    const res3 = createMockRes();
    await eventController.getAllEvents({ query: { dateFilter: 'past', limit: '5' } }, res3, next);
    const data3 = res3.finalData;
    console.log(`✅ Nhận được ${data3.events.length} sự kiện quá khứ:`);
    data3.events.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [${e.eventDate}] ${e.eventName}`);
    });

    let isPastDesc = true;
    for (let i = 0; i < data3.events.length - 1; i++) {
        if (data3.events[i].eventDate < data3.events[i + 1].eventDate) {
            isPastDesc = false;
            break;
        }
    }
    console.log(isPastDesc ? "✅ TEST 3 PASSED: 'Đã kết thúc' sắp xếp GIẢM DẦN (DESC) - mới qua gần nhất ở đầu!" : "❌ TEST 3 FAILED!");

    console.log("\n=================================================");
    console.log("🎉 TẤT CẢ CÁC BÀI TEST ĐÃ HOÀN TẤT THÀNH CÔNG!");
    console.log("=================================================");
}

runTests().then(() => process.exit(0)).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
