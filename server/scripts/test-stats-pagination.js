// server/scripts/test-stats-pagination.js
const eventController = require('../controllers/eventController');
const { db } = require('../config/firebase');

async function runTests() {
    console.log("=== BẮT ĐẦU TEST PAGINATION & STATS ===");

    // Mock Express res object
    const res = {
        json: function(data) {
            this.finalData = data;
            return this;
        },
        status: function(code) {
            this.statusCode = code;
            return this;
        }
    };
    
    const next = (err) => {
        console.error("❌ Next() được gọi kèm lỗi:", err);
    };

    try {
        console.log("\n[TEST 1] Kểm tra getStats()...");
        const reqStats = {};
        await eventController.getStats(reqStats, res, next);
        
        if (res.finalData && res.finalData.today !== undefined) {
            console.log("✅ getStats trả về dữ liệu chuẩn:", res.finalData);
        } else {
            console.log("❌ getStats trả về sai định dạng:", res.finalData);
        }

        console.log("\n[TEST 2] Kểm tra getAllEvents() - Trang 1 (limit 9)...");
        const reqPage1 = { query: { limit: '9' } };
        await eventController.getAllEvents(reqPage1, res, next);
        
        let p1Data = res.finalData;
        if (p1Data && p1Data.events) {
            console.log(`✅ getAllEvents (Page 1) trả về ${p1Data.events.length} sự kiện.`);
            console.log(`   - total: ${p1Data.meta.total}`);
            console.log(`   - hasMore: ${p1Data.meta.hasMore}`);
            console.log(`   - lastId: ${p1Data.meta.lastId}`);
            
            if (p1Data.events.length > 9) {
                console.log("❌ LỖI: Vượt quá giới hạn limit (9)!");
            }
        } else {
            console.log("❌ getAllEvents (Page 1) trả về sai định dạng:", p1Data);
        }

        // Test 3: Pagination Trang 2
        if (p1Data && p1Data.meta && p1Data.meta.hasMore && p1Data.meta.lastId) {
            console.log("\n[TEST 3] Khớp Pagination lấy Trang 2...");
            const reqPage2 = { query: { limit: '9', lastDocId: p1Data.meta.lastId } };
            await eventController.getAllEvents(reqPage2, res, next);
            
            let p2Data = res.finalData;
            console.log(`✅ getAllEvents (Page 2) trả về ${p2Data.events.length} sự kiện.`);
            
            // Check for duplicates
            const p1Ids = new Set(p1Data.events.map(e => e.id));
            const hasDuplicate = p2Data.events.some(e => p1Ids.has(e.id));
            if (hasDuplicate) {
                console.log("❌ LỖI: Trang 2 bị trùng lặp sự kiện của Trang 1!");
            } else {
                console.log("✅ Không có sự kiện trùng lặp giữa 2 trang.");
            }
        } else {
            console.log("\n[SKIP TEST 3] DB ít hơn 9 sự kiện nên không có trang 2 để test.");
        }

        console.log("\n=== TẤT CẢ TEST ĐÃ HOÀN TẤT ===");

    } catch (err) {
        console.error("Lỗi kịch bản test:", err);
    }
    
    process.exit(0);
}

runTests();
