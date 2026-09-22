const { GoogleGenAI, Type } = require('@google/genai');
const eventController = require('../controllers/eventController');
const analyticsController = require('../controllers/analyticsController');
const { resourcesCollection, eventsCollection, db } = require('../config/firebase');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ========== RESOURCE MATCHING ==========
const RESOURCE_ALIASES = {
    'loa': ['loa', 'âm thanh', 'speaker', 'sound'],
    'mic': ['mic', 'micro', 'microphone'],
    'led': ['led', 'màn hình led', 'màn chiếu', 'projector', 'screen'],
    'ban': ['bàn', 'table', 'desk'],
    'ghe': ['ghế', 'chair', 'seat', 'chỗ ngồi'],
    'tivi': ['tivi', 'tv', 'television'],
    'standee': ['standee', 'banner', 'backdrop'],
    'anhsang': ['ánh sáng', 'đèn', 'lighting', 'light'],
    'nuoc': ['nước', 'teabreak', 'tea break', 'nước suối', 'catering', 'coffee'],
};

async function getDynamicResources() {
    try {
        const snapshot = await resourcesCollection.get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error('Failed to load resources for AI:', e);
        return [];
    }
}

function matchResourceId(name, availableResources) {
    const lower = name.toLowerCase().trim();
    for (const res of availableResources) {
        const labelLower = res.label.toLowerCase();
        const idLower = res.id.toLowerCase();
        if (labelLower.includes(lower) || lower.includes(labelLower) || idLower.includes(lower) || lower.includes(idLower)) {
            return res.id;
        }
    }
    for (const [id, aliases] of Object.entries(RESOURCE_ALIASES)) {
        if (aliases.some(alias => lower.includes(alias) || alias.includes(lower))) {
            return id;
        }
    }
    return null;
}

// ========== SYSTEM INSTRUCTION ==========
const SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI thông minh của hệ thống Quản lý Sự kiện EventFlow.
Nhiệm vụ của bạn là giúp người dùng tạo sự kiện, tra cứu lịch, kiểm tra phòng trống, tìm liên hệ.
Luôn trả lời bằng Tiếng Việt, ngắn gọn, lịch sự và chuyên nghiệp. Thêm emoji phù hợp để sinh động hơn.

QUY TẮC TUYỆT ĐỐI (TRÁNH BỊA ĐẶT):
- KHÔNG BAO GIỜ tự bịa ra các tính năng, nút bấm, hay menu không có thật trên phần mềm (ví dụ: "Bấm nút Xuất CSV", "Vào trang Phân tích").
- Nếu người dùng hỏi cách làm một việc mà bạn không được lập trình để biết (hoặc không có tool hỗ trợ), hãy trả lời thành thật: "Hiện tại tôi chưa được lập trình để trả lời câu hỏi này" hoặc "Chức năng này hiện chưa có hoặc tôi chưa có quyền truy cập".

QUY TẮC TẠO SỰ KIỆN:
- Dùng hàm 'draftEvent' khi người dùng muốn tạo lịch/sự kiện mới.
- KHÔNG tự nói "đã tạo thành công" — chỉ tạo BẢN NHÁP. Hãy nói: "Tôi đã chuẩn bị xong thông tin, vui lòng kiểm tra biểu mẫu và bấm Lưu nhé."
- Nếu thiếu thông tin (Tên/Ngày), hỏi lại.
- CÁC THIẾT BỊ CÓ SẴN TRONG HỆ THỐNG: loa/âm thanh, mic/micro, màn hình LED/màn chiếu, bàn, ghế, tivi, standee/banner, ánh sáng/đèn, nước suối/teabreak.

QUY TẮC TRA CỨU & THỐNG KÊ:
- 'getStats': CHỈ cho số liệu nhanh (hôm nay, ngày mai, tuần này, đang diễn ra).
- 'searchEvents': Khi hỏi về sự kiện theo THÁNG, KHOẢNG THỜI GIAN, hoặc LIỆT KÊ danh sách.
- 'checkLocationAvailability': Khi hỏi phòng/địa điểm có trống không vào ngày/giờ cụ thể.
- 'findContact': Khi hỏi ai phụ trách, ai đăng ký sự kiện, hoặc liên hệ phòng ban.`;

// ========== TOOL DECLARATIONS ==========
const draftEventTool = {
    name: 'draftEvent',
    description: 'Tạo bản nháp sự kiện. Gọi khi người dùng muốn tạo lịch/sự kiện mới.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            eventName: { type: Type.STRING, description: 'Tên sự kiện. Bắt buộc.' },
            eventDate: { type: Type.STRING, description: 'Ngày diễn ra, YYYY-MM-DD. Bắt buộc.' },
            startTime: { type: Type.STRING, description: 'Giờ bắt đầu HH:mm. Mặc định 07:00 (sáng) hoặc 13:30 (chiều).' },
            endTime: { type: Type.STRING, description: 'Giờ kết thúc HH:mm. Mặc định 11:30 (sáng) hoặc 17:30 (chiều).' },
            location: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Mảng các địa điểm/phòng.' },
            department: { type: Type.STRING, description: 'Phòng ban tổ chức.' },
            content: { type: Type.STRING, description: 'Nội dung/mô tả sự kiện.' },
            setup: { type: Type.STRING, description: 'Yêu cầu setup hậu cần.' },
            facilities: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'Tên thiết bị' },
                        quantity: { type: Type.NUMBER, description: 'Số lượng. Mặc định 1.' }
                    },
                    required: ['name', 'quantity']
                },
                description: 'Danh sách thiết bị cần chuẩn bị.'
            },
        },
        required: ['eventName', 'eventDate', 'startTime', 'endTime']
    }
};

const getStatsTool = {
    name: 'getStats',
    description: 'Số liệu tổng quan nhanh: sự kiện hôm nay, ngày mai, tuần này, đang diễn ra. KHÔNG dùng cho tra cứu theo tháng.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            department: { type: Type.STRING, description: 'Phòng ban để lọc (không bắt buộc).' }
        }
    }
};

const searchEventsTool = {
    name: 'searchEvents',
    description: 'Tìm và liệt kê sự kiện trong khoảng thời gian. LUÔN dùng khi hỏi sự kiện theo tháng/tuần/khoảng ngày.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            startDate: { type: Type.STRING, description: 'Ngày bắt đầu YYYY-MM-DD. Bắt buộc.' },
            endDate: { type: Type.STRING, description: 'Ngày kết thúc YYYY-MM-DD. Bắt buộc.' },
            department: { type: Type.STRING, description: 'Phòng ban để lọc (không bắt buộc).' }
        },
        required: ['startDate', 'endDate']
    }
};

const checkLocationTool = {
    name: 'checkLocationAvailability',
    description: 'Kiểm tra một địa điểm/phòng có trống hay bị trùng lịch vào ngày và khung giờ cụ thể. Trả về danh sách sự kiện đang chiếm phòng đó (nếu có).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            location: { type: Type.STRING, description: 'Tên địa điểm/phòng cần kiểm tra. Bắt buộc.' },
            date: { type: Type.STRING, description: 'Ngày cần kiểm tra YYYY-MM-DD. Bắt buộc.' },
            startTime: { type: Type.STRING, description: 'Giờ bắt đầu HH:mm (không bắt buộc, nếu không có sẽ kiểm tra cả ngày).' },
            endTime: { type: Type.STRING, description: 'Giờ kết thúc HH:mm (không bắt buộc).' }
        },
        required: ['location', 'date']
    }
};

const findContactTool = {
    name: 'findContact',
    description: 'Tìm thông tin liên hệ: ai đăng ký/phụ trách một sự kiện cụ thể, hoặc các sự kiện của một phòng ban. Trả về tên sự kiện, email người đăng ký, phòng ban.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            eventName: { type: Type.STRING, description: 'Tên sự kiện cần tìm (tìm kiếm gần đúng). Không bắt buộc.' },
            department: { type: Type.STRING, description: 'Phòng ban cần tìm liên hệ. Không bắt buộc.' }
        }
    }
};

const tools = [{ functionDeclarations: [draftEventTool, getStatsTool, searchEventsTool, checkLocationTool, findContactTool] }];

// ========== TOOL HANDLERS ==========
async function handleDraftEvent(args, availableResources, userContext) {
    const facilitiesChecklist = {};
    if (args.facilities && Array.isArray(args.facilities)) {
        for (const item of args.facilities) {
            const resourceId = matchResourceId(item.name, availableResources);
            if (resourceId) {
                facilitiesChecklist[resourceId] = { checked: true, quantity: item.quantity || 1 };
            }
        }
        console.log('[AI Agent] Matched facilities:', facilitiesChecklist);
    }
    const { facilities, ...eventFields } = args;
    let finalDepartment = eventFields.department;
    if (!finalDepartment && userContext && userContext.department) {
        finalDepartment = userContext.department;
    }
    return {
        draftData: {
            ...eventFields,
            department: finalDepartment,
            facilitiesChecklist: Object.keys(facilitiesChecklist).length > 0 ? facilitiesChecklist : undefined
        },
        resultData: { status: 'success', message: 'Bản nháp đã được tạo. Hãy báo người dùng kiểm tra màn hình để lưu.' }
    };
}

async function handleGetStats(args) {
    const mockReq = { query: { department: args.department } };
    let capturedData = null;
    const mockRes = { json: (data) => { capturedData = data; return mockRes; } };
    const mockNext = (err) => { throw err; };
    await eventController.getStats(mockReq, mockRes, mockNext);
    return capturedData;
}

async function handleSearchEvents(args) {
    const { startDate, endDate, department: deptFilter } = args;
    console.log(`[AI Agent] searchEvents: ${startDate} -> ${endDate}, dept: ${deptFilter || 'all'}`);
    
    const snapshot = await eventsCollection
        .where('eventDate', '>=', startDate)
        .where('eventDate', '<=', endDate)
        .orderBy('eventDate', 'asc')
        .limit(100)
        .get();
    
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (deptFilter) {
        events = events.filter(e => e.department && e.department.toLowerCase().includes(deptFilter.toLowerCase()));
    }
    
    // Group by groupId and track full date range
    const groupedMap = new Map();
    events.forEach(e => {
        const key = e.groupId || e.id;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...e, _startDate: e.eventDate, _endDate: e.eventDate });
        } else {
            const existing = groupedMap.get(key);
            if (e.eventDate < existing._startDate) existing._startDate = e.eventDate;
            if (e.eventDate > existing._endDate) existing._endDate = e.eventDate;
        }
    });
    const uniqueEvents = Array.from(groupedMap.values());
    
    const eventList = uniqueEvents.map(e => {
        const isMultiDay = e._startDate !== e._endDate;
        return {
            eventName: e.eventName,
            eventDate: isMultiDay ? `${e._startDate} đến ${e._endDate}` : e.eventDate,
            isMultiDay,
            startTime: e.startTime || 'N/A',
            endTime: e.endTime || 'N/A',
            location: Array.isArray(e.location) ? e.location.join(', ') : (e.location || 'Chưa xác định'),
            department: e.department || 'Chưa xác định'
        };
    });
    
    console.log(`[AI Agent] searchEvents found ${uniqueEvents.length} unique events (${events.length} docs)`);
    return { totalFound: uniqueEvents.length, dateRange: { startDate, endDate }, events: eventList };
}

async function handleCheckLocation(args) {
    const { location, date, startTime, endTime } = args;
    console.log(`[AI Agent] checkLocation: "${location}" on ${date} ${startTime || ''}-${endTime || ''}`);
    
    // Query events on the given date (and adjacent days for cross-midnight)
    const snapshot = await eventsCollection
        .where('eventDate', '>=', date)
        .where('eventDate', '<=', date)
        .limit(200)
        .get();
    
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by location match (fuzzy)
    const locLower = location.toLowerCase();
    events = events.filter(e => {
        const locs = Array.isArray(e.location) ? e.location : [e.location || ''];
        return locs.some(l => l.toLowerCase().includes(locLower) || locLower.includes(l.toLowerCase()));
    });
    
    // If time specified, filter by time overlap
    if (startTime && endTime) {
        const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
        const reqStart = toMin(startTime);
        const reqEnd = toMin(endTime);
        events = events.filter(e => {
            if (!e.startTime || !e.endTime) return true; // can't determine, include as cautionary
            const eStart = toMin(e.startTime);
            const eEnd = toMin(e.endTime);
            return reqStart < eEnd && reqEnd > eStart; // overlap formula
        });
    }
    
    // Deduplicate by groupId
    const seen = new Set();
    const unique = events.filter(e => {
        const key = e.groupId || e.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    const conflicts = unique.map(e => ({
        eventName: e.eventName,
        startTime: e.startTime || 'N/A',
        endTime: e.endTime || 'N/A',
        department: e.department || 'N/A'
    }));
    
    const isAvailable = conflicts.length === 0;
    console.log(`[AI Agent] checkLocation: ${isAvailable ? 'AVAILABLE' : `${conflicts.length} conflicts found`}`);
    
    return {
        location,
        date,
        checkedTime: startTime && endTime ? `${startTime} - ${endTime}` : 'cả ngày',
        isAvailable,
        conflictCount: conflicts.length,
        conflicts: isAvailable ? [] : conflicts,
        message: isAvailable
            ? `Địa điểm "${location}" TRỐNG vào ngày ${date}${startTime ? ` khung giờ ${startTime}-${endTime}` : ''}.`
            : `Địa điểm "${location}" đã có ${conflicts.length} sự kiện trùng lịch.`
    };
}

async function handleFindContact(args) {
    const { eventName, department } = args;
    console.log(`[AI Agent] findContact: event="${eventName || 'N/A'}", dept="${department || 'N/A'}"`);
    
    let events = [];
    
    if (eventName) {
        // Search by event name (get recent 200 events and filter)
        const snapshot = await eventsCollection
            .where('isUniqueEvent', '==', true)
            .orderBy('eventDate', 'desc')
            .limit(200)
            .get();
        
        const nameLower = eventName.toLowerCase();
        events = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(e => e.eventName && e.eventName.toLowerCase().includes(nameLower));
    } else if (department) {
        // Search by department (upcoming events)
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await eventsCollection
            .where('isUniqueEvent', '==', true)
            .where('eventDate', '>=', today)
            .limit(100)
            .get();
        
        const deptLower = department.toLowerCase();
        events = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(e => e.department && e.department.toLowerCase().includes(deptLower));
    }
    
    const contacts = events.slice(0, 10).map(e => ({
        eventName: e.eventName,
        eventDate: e.eventDate,
        department: e.department || 'N/A',
        registrantEmail: e.registrantEmail || 'N/A',
        location: Array.isArray(e.location) ? e.location.join(', ') : (e.location || 'N/A')
    }));
    
    console.log(`[AI Agent] findContact found ${contacts.length} results`);
    return {
        totalFound: contacts.length,
        contacts,
        message: contacts.length > 0
            ? `Tìm thấy ${contacts.length} kết quả liên quan.`
            : 'Không tìm thấy kết quả phù hợp. Hãy thử từ khóa khác.'
    };
}

// ========== MAIN PROCESSOR ==========
exports.processChat = async (message, history, userContext) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY in environment variables.");
        }

        const availableResources = await getDynamicResources();
        const resourceNames = availableResources.map(r => r.label).join(', ');

        let finalMessage = message;
        if (userContext && userContext.department) {
            finalMessage = `[System: Người dùng hiện tại thuộc phòng ban "${userContext.department}". Hãy tự động gán phòng ban này vào sự kiện.]\n\n${message}`;
        }

        const now = new Date();
        const currentDateStr = now.toISOString().split('T')[0];
        const currentYear = now.getFullYear();

        const dynamicInstruction = SYSTEM_INSTRUCTION.replace(
            'CÁC THIẾT BỊ CÓ SẴN TRONG HỆ THỐNG: loa/âm thanh, mic/micro, màn hình LED/màn chiếu, bàn, ghế, tivi, standee/banner, ánh sáng/đèn, nước suối/teabreak.',
            `CÁC THIẾT BỊ CÓ SẴN TRONG HỆ THỐNG: ${resourceNames.length > 0 ? resourceNames : 'loa, mic, ghế, bàn'}`
        ) + `\n\nTHÔNG TIN THỜI GIAN:\n- Hôm nay: ${currentDateStr} (Năm ${currentYear}). Nếu không chỉ định năm, LUÔN dùng năm ${currentYear}.`;

        const chat = ai.chats.create({
            model: 'gemini-3.6-flash',
            config: {
                systemInstruction: dynamicInstruction,
                tools: tools,
                temperature: 0.2
            },
            history: history || []
        });

        let response = await chat.sendMessage({ message: finalMessage });
        let isDraftEvent = false;
        let draftData = null;

        // Loop to handle function calls
        while (response.functionCalls && response.functionCalls.length > 0) {
            const functionCall = response.functionCalls[0];
            const name = functionCall.name;
            const args = functionCall.args;
            let resultData = {};

            console.log(`[AI Agent] Function Called: ${name}`, args);

            try {
                if (name === 'draftEvent') {
                    const result = await handleDraftEvent(args, availableResources, userContext);
                    isDraftEvent = true;
                    draftData = result.draftData;
                    resultData = result.resultData;
                } else if (name === 'getStats') {
                    resultData = await handleGetStats(args);
                } else if (name === 'searchEvents') {
                    resultData = await handleSearchEvents(args);
                } else if (name === 'checkLocationAvailability') {
                    resultData = await handleCheckLocation(args);
                } else if (name === 'findContact') {
                    resultData = await handleFindContact(args);
                }
            } catch (err) {
                console.error(`[AI Agent] Tool Execution Error (${name}):`, err);
                resultData = { error: 'Lỗi hệ thống khi thực thi hàm.' };
            }

            response = await chat.sendMessage({
                message: {
                    role: 'user',
                    parts: [{
                        functionResponse: {
                            name: name,
                            response: resultData
                        }
                    }]
                }
            });
        }

        return {
            reply: response.text,
            type: isDraftEvent ? 'draft_event' : 'text',
            draftData: draftData
        };

    } catch (error) {
        console.error('[AI Agent] Chat Processing Error:', error);
        throw error;
    }
};
