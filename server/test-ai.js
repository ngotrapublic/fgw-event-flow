require('dotenv').config({ path: './.env' });
const aiService = require('./services/aiService');

(async () => {
    try {
        const result = await aiService.processChat(
            "Tạo sự kiện Họp Giao Ban vào 8h sáng ngày 2026-09-01 tại Hội trường A. Cần chuẩn bị 2 loa, 3 mic, 40 ghế và nước suối cho 50 người",
            [],
            { department: "IT" }
        );
        console.log("=== RESULT ===");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("ERROR:", e.message);
    }
})();
