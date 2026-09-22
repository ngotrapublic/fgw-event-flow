const aiService = require('../services/aiService');

// In-Memory Rate Limiter Map: { userId: { count: number, resetAt: number } }
const rateLimitMap = new Map();
const DAILY_LIMIT = 20;

/**
 * Clean up expired rate limits periodically to avoid memory leaks
 */
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of rateLimitMap.entries()) {
        if (now > data.resetAt) {
            rateLimitMap.delete(userId);
        }
    }
}, 1000 * 60 * 60); // Run every hour

/**
 * Check if user exceeded rate limit
 * @param {string} userId 
 * @returns {boolean} true if allowed, false if blocked
 */
const checkRateLimit = (userId) => {
    const now = Date.now();
    let userData = rateLimitMap.get(userId);

    if (!userData || now > userData.resetAt) {
        // Reset at midnight (next day)
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        userData = { count: 0, resetAt: tomorrow.getTime() };
    }

    if (userData.count >= DAILY_LIMIT) {
        return false;
    }

    userData.count += 1;
    rateLimitMap.set(userId, userData);
    return true;
};

exports.chat = async (req, res, next) => {
    try {
        const { message, history, department } = req.body;
        const { uid, role } = req.user;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Rate Limiting Check
        if (!checkRateLimit(uid)) {
            return res.status(429).json({ 
                error: 'Bạn đã đạt giới hạn 20 câu hỏi AI trong hôm nay. Vui lòng quay lại vào ngày mai để tiếp tục sử dụng nhé!',
                type: 'text'
            });
        }

        // Pass context to AI
        const userContext = { uid, role, department };

        const result = await aiService.processChat(message, history, userContext);

        res.json({
            reply: result.reply,
            type: result.type,
            draftData: result.draftData || null
        });

    } catch (error) {
        console.error('[aiController] Chat Error:', error.message || error);
        console.error('[aiController] Full Stack:', error.stack);
        res.status(500).json({ 
            error: 'Có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.',
            debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};
