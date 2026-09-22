# Research Report: Gemini AI Integration for MERN Stack (Updated Aug 2026)

**Summary:** Đánh giá kiến trúc tối ưu để tích hợp Gemini AI vào ứng dụng Node.js/React với Function Calling. Cập nhật thông tin mới nhất về SDK, model availability, và pricing.

## ⚠️ Critical Updates (Aug 2026)

### SDK Migration
| Package | Status | Notes |
|---|---|---|
| `@google/generative-ai` | ❌ **LEGACY** | Không còn được phát triển tính năng mới |
| `@google/genai` | ✅ **RECOMMENDED** | Unified SDK mới, hỗ trợ cả Gemini Developer API và Vertex AI |

### Model Availability
| Model | Status |
|---|---|
| `gemini-1.5-flash` | ❌ Deprecated |
| `gemini-2.0-flash` | ❌ Shutdown ngày 01/06/2026 |
| `gemini-3-flash` | ✅ Available, Free tier |
| `gemini-3.1-flash-lite` | ✅ Available, Free tier |
| `gemini-3.7-flash` | ✅ Available, Paid introductory pricing |

### Pricing (Gemini 3.7 Flash — tham khảo)
- Input: $0.75 / 1M tokens
- Output: $3.75 / 1M tokens
- Free tier: 10-15 RPM, 1,000-1,500 RPD

> **Billing Trap Warning:** Nếu bật billing trên Google Cloud project để tăng quota, free tier SẼ BIẾN MẤT cho project đó. Nên dùng 2 project riêng biệt: 1 free (dev) + 1 paid (production).

## Key Findings

### 1. Function Calling Pattern (với `@google/genai`)
```javascript
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chat = ai.chats.create({
  model: 'gemini-3-flash',
  config: {
    tools: [{ functionDeclarations: [...] }],
    systemInstruction: '...'
  },
  history: previousMessages
});

const response = await chat.sendMessage({ message: userInput });

// Handle function calls
if (response.functionCalls?.length > 0) {
  // Execute function, send results back
}
```

### 2. Security — Server-Side Only
- API Key **PHẢI** nằm ở server (Node.js `.env`)
- Frontend chỉ gọi `/api/ai/chat` qua authenticated API
- Dùng `verifyToken` middleware hiện có

### 3. Không cần LangChain / Vector DB
- Dữ liệu là structured (Firestore documents), không phải unstructured text
- Function Calling trực tiếp đủ mạnh cho mọi use case
- Tuân thủ YAGNI & KISS

## Architecture Recommendation

**Backend Agentic with Function Calling** — AI sẽ gọi trực tiếp các hàm nghiệp vụ hiện có (getStats, getAnalyticsSummary) thông qua tool declarations. Frontend chỉ là UI chat widget.

## References
- [Google GenAI SDK (npm)](https://www.npmjs.com/package/@google/genai)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Function Calling Guide](https://ai.google.dev/gemini-api/docs/function-calling)
