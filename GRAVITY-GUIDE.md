# 🚀 Hướng Dẫn Sử Dụng Gravity AI Assistant

> **Phiên bản:** 1.0.0  
> **Cập nhật:** 2026-01-14  
> **Dự án:** Gravity-Test

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Workflows (Quy Trình Làm Việc)](#1-workflows-quy-trình-làm-việc)
3. [Agents (Các Agent Chuyên Biệt)](#2-agents-các-agent-chuyên-biệt)
4. [Skills (Kỹ Năng)](#3-skills-kỹ-năng)
5. [Rules (Quy Tắc Phát Triển)](#4-rules-quy-tắc-phát-triển)
6. [Output Styles (Phong Cách Giao Tiếp)](#5-output-styles-phong-cách-giao-tiếp)
7. [Docs (Tài Liệu Dự Án)](#6-docs-tài-liệu-dự-án)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

Dự án này được trang bị đầy đủ các công cụ AI để hỗ trợ phát triển phần mềm:

| Thành phần | Số lượng | Đường dẫn | Mục đích |
|------------|----------|-----------|----------|
| **Workflows** | 17 | `.agent/workflows/` | Quy trình làm việc có cấu trúc |
| **Agents** | 17 | `.gemini/agents/` | Hướng dẫn chuyên sâu cho từng vai trò |
| **Skills** | 37 | `.gemini/skills/` | Kiến thức chuyên môn về công nghệ |
| **Rules** | 4 | `.gemini/rules/` | Quy tắc phát triển cốt lõi |
| **Output Styles** | 6 | `.gemini/output-styles/` | Điều chỉnh cách AI giao tiếp |
| **Docs** | 5+ | `docs/` | Template tài liệu dự án |

---

## 1. Workflows (Quy Trình Làm Việc)

### 📍 Vị trí: `.agent/workflows/`

Workflows là các quy trình làm việc được định nghĩa sẵn. Bạn có thể gọi chúng bằng **slash command**.

### Danh sách Workflows

| Slash Command | Mô tả | Khi nào dùng |
|---------------|-------|--------------|
| `/plan` | Lập kế hoạch implementation | Trước khi bắt đầu tính năng mới |
| `/develop` | Phát triển fullstack | Khi implement features |
| `/debug` | Debug và sửa lỗi | Khi gặp bugs hoặc errors |
| `/review` | Review code | Trước khi merge code |
| `/test` | Viết và chạy tests | Sau khi implement xong |
| `/design` | Thiết kế UI/UX | Khi tạo giao diện mới |
| `/database` | Quản lý database | Schema, migrations, queries |
| `/git` | Quản lý version control | Branching, commits, merges |
| `/docs` | Quản lý documentation | Tạo/cập nhật tài liệu |
| `/project` | Quản lý project | Task management, priorities |
| `/research` | Nghiên cứu công nghệ | Tìm hiểu giải pháp mới |
| `/brainstorm` | Brainstorm ý tưởng | Khám phá possibilities |
| `/scout` | Khám phá codebase | Hiểu kiến trúc dự án |
| `/scout-external` | Khám phá external resources | Tìm hiểu APIs, libraries |
| `/copywrite` | Viết nội dung | Marketing, UI copy |
| `/journal` | Viết development journal | Ghi chép học hỏi |
| `/mcp` | Quản lý MCP servers | Cấu hình MCP |

### Cách Sử Dụng

```
# Cú pháp cơ bản
/[workflow-name] [mô tả task]

# Ví dụ thực tế
/plan thêm tính năng đăng nhập OAuth2 với Google
/debug lỗi không load được danh sách users
/review kiểm tra code trong file UserService.ts
/test viết unit tests cho AuthController
```

### Ví dụ Chi Tiết

#### Ví dụ 1: Lập kế hoạch tính năng mới
```
/plan Tôi cần thêm tính năng notification realtime cho app. 
Yêu cầu:
- Push notification trên mobile
- In-app notification
- Email notification
- Có thể tuỳ chỉnh loại notification
```

Gravity sẽ:
1. Đọc workflow `/plan`
2. Tham khảo agent `planner.md`
3. Nghiên cứu codebase hiện tại
4. Tạo implementation plan chi tiết

#### Ví dụ 2: Debug một vấn đề
```
/debug Khi login với email admin@example.com, hệ thống trả về lỗi 500.
Stack trace:
TypeError: Cannot read property 'id' of undefined
    at AuthService.authenticate (auth.service.ts:45)
```

Gravity sẽ:
1. Phân tích error message
2. Trace code flow
3. Tìm root cause
4. Đề xuất fix

### Turbo Mode

Một số workflow hỗ trợ **turbo mode** - tự động chạy commands mà không cần approval:

```markdown
# Trong workflow file, thêm annotation:
// turbo
npm run test

// turbo-all  ← Áp dụng cho TẤT CẢ commands
```

---

## 2. Agents (Các Agent Chuyên Biệt)

### 📍 Vị trí: `.gemini/agents/`

Agents là các file hướng dẫn chi tiết cho từng vai trò chuyên biệt. Mỗi agent có kiến thức sâu về lĩnh vực của mình.

### Danh sách Agents

| Agent | File | Chuyên môn |
|-------|------|------------|
| **Planner** | `planner.md` | Lập kế hoạch, thiết kế kiến trúc |
| **Fullstack Developer** | `fullstack-developer.md` | Frontend + Backend development |
| **Debugger** | `debugger.md` | Phân tích và fix bugs |
| **Code Reviewer** | `code-reviewer.md` | Review code quality |
| **Tester** | `tester.md` | Viết và chạy tests |
| **UI/UX Designer** | `ui-ux-designer.md` | Thiết kế giao diện |
| **Database Admin** | `database-admin.md` | Quản lý database |
| **Git Manager** | `git-manager.md` | Version control |
| **Docs Manager** | `docs-manager.md` | Documentation |
| **Project Manager** | `project-manager.md` | Project coordination |
| **Researcher** | `researcher.md` | Nghiên cứu công nghệ |
| **Brainstormer** | `brainstormer.md` | Ideation, creativity |
| **Scout** | `scout.md` | Codebase exploration |
| **Scout External** | `scout-external.md` | External resources |
| **Copywriter** | `copywriter.md` | Content writing |
| **Journal Writer** | `journal-writer.md` | Development journal |
| **MCP Manager** | `mcp-manager.md` | MCP configuration |

### Cách Sử Dụng

```
# Cách 1: Tự động qua Workflow (khuyến nghị)
/plan thêm tính năng X
# → Gravity tự động sử dụng Planner agent

# Cách 2: Yêu cầu trực tiếp
Hãy đọc file .gemini/agents/ui-ux-designer.md và thiết kế 
giao diện trang login theo hướng dẫn trong đó.

# Cách 3: Kết hợp nhiều agents
Đầu tiên dùng Planner để lập kế hoạch, sau đó chuyển sang 
Fullstack Developer để implement.
```

### Đặc điểm của mỗi Agent

#### Planner Agent
- Sử dụng **mental models**: Decomposition, Working Backwards, 5 Whys
- Tuân thủ YAGNI, KISS, DRY
- Output: Implementation plan với YAML frontmatter

#### Fullstack Developer Agent
- Strict file ownership
- Parallel execution safety
- Quality assurance checklist

#### UI/UX Designer Agent
- Modern design principles
- Accessibility (WCAG)
- Micro-animations, responsiveness

---

## 3. Skills (Kỹ Năng)

### 📍 Vị trí: `.gemini/skills/`

Skills là các module kiến thức chuyên sâu về công nghệ, framework, hoặc domain cụ thể.

### Danh sách Skills (37 skills)

#### 🎨 Creative & Design
| Skill | Mô tả |
|-------|-------|
| `ai-artist` | Generative art với p5.js |
| `ai-multimodal` | Xử lý images, videos, documents |
| `frontend-design` | UI design principles |
| `ui-styling` | CSS, styling techniques |
| `ui-ux-pro-max` | Advanced UI/UX patterns |

#### 💻 Development
| Skill | Mô tả |
|-------|-------|
| `frontend-development` | React, TypeScript, modern patterns |
| `backend-development` | Node.js, APIs, server-side |
| `mobile-development` | Mobile app development |
| `web-frameworks` | Next.js, Vite, frameworks |
| `threejs` | 3D graphics with Three.js |

#### 🗄️ Database & Auth
| Skill | Mô tả |
|-------|-------|
| `databases` | Database design, queries |
| `better-auth` | Authentication patterns |

#### 🔧 DevOps & Tools
| Skill | Mô tả |
|-------|-------|
| `devops` | CI/CD, deployment |
| `chrome-devtools` | Browser debugging |
| `media-processing` | FFmpeg, ImageMagick |
| `repomix` | Repository analysis |
| `mcp-builder` | Build MCP servers |
| `mcp-management` | Manage MCP configs |

#### 🧠 Problem Solving
| Skill | Mô tả |
|-------|-------|
| `debugging` | Debugging techniques |
| `code-review` | Code review practices |
| `problem-solving` | Problem-solving frameworks |
| `sequential-thinking` | Step-by-step analysis |
| `brainstorming` | Ideation techniques |

#### 📚 Planning & Docs
| Skill | Mô tả |
|-------|-------|
| `planning` | Project planning |
| `plans-kanban` | Kanban board management |
| `research` | Research methodologies |
| `docs-seeker` | Find documentation |
| `document-skills` | Create documents (PDF, DOCX, etc.) |
| `context-engineering` | Context management for AI |

#### 🛒 Specific Domains
| Skill | Mô tả |
|-------|-------|
| `shopify` | Shopify development |
| `payment-integration` | Payment gateways |
| `google-adk-python` | Google ADK for Python |
| `mermaidjs-v11` | Mermaid diagrams |
| `markdown-novel-viewer` | Markdown novel viewer |

#### 🔧 Meta Skills
| Skill | Mô tả |
|-------|-------|
| `skill-creator` | Create new skills |
| `template-skill` | Skill template |
| `common` | Common utilities |

### Cách Sử Dụng

```
# Cách 1: Gravity tự động detect và load skill phù hợp
Tạo một React component với TanStack Query và MUI
# → Gravity tự động load: frontend-development skill

# Cách 2: Yêu cầu skill cụ thể
Sử dụng skill ui-ux-pro-max để thiết kế dashboard

# Cách 3: Xem nội dung skill
Hãy đọc file .gemini/skills/databases/SKILL.md và cho tôi biết 
best practices cho database design
```

### Cấu trúc một Skill

```
.gemini/skills/[skill-name]/
├── SKILL.md              ← File chính (bắt buộc)
├── resources/            ← Tài liệu bổ sung
│   ├── guide-1.md
│   └── guide-2.md
├── scripts/              ← Scripts hỗ trợ
└── examples/             ← Ví dụ tham khảo
```

---

## 4. Rules (Quy Tắc Phát Triển)

### 📍 Vị trí: `.gemini/rules/`

Rules định nghĩa các nguyên tắc và quy tắc phát triển cốt lõi.

### Danh sách Rules

| File | Nội dung |
|------|----------|
| `development-rules.md` | Quy tắc phát triển chính |
| `primary-workflow.md` | Workflow chính của dự án |
| `orchestration-protocol.md` | Protocol điều phối agents |
| `documentation-management.md` | Quy tắc quản lý docs |

### Nội dung chính của Development Rules

#### Nguyên tắc cốt lõi (The Holy Trinity)

```
┌─────────────────────────────────────────────────────────┐
│                    HOLY TRINITY                          │
├─────────────────────────────────────────────────────────┤
│  YAGNI     │  You Aren't Gonna Need It                  │
│            │  → Không over-engineering                   │
│            │  → Chỉ implement khi cần                    │
├────────────┼────────────────────────────────────────────┤
│  KISS      │  Keep It Simple, Stupid                    │
│            │  → Chọn giải pháp đơn giản                  │
│            │  → Clarity > Cleverness                     │
├────────────┼────────────────────────────────────────────┤
│  DRY       │  Don't Repeat Yourself                     │
│            │  → Không duplicate code                     │
│            │  → Extract common logic                     │
└────────────┴────────────────────────────────────────────┘
```

#### Quy tắc File

- **File naming**: kebab-case, descriptive names
- **File size**: Tối đa 200 dòng code
- **Structure**: Component-based organization

#### Quy tắc Code Quality

- Không syntax errors
- Try-catch error handling
- Security standards
- Code review sau mỗi implementation

#### Pre-commit Rules

- ✅ Run linting
- ✅ Run tests
- ✅ No secrets in code
- ✅ Conventional commit messages
- ❌ Không commit .env files

### Cách Áp Dụng

```
# Rules được áp dụng tự động khi Gravity làm việc

# Hoặc yêu cầu cụ thể:
Hãy review code theo quy tắc trong .gemini/rules/development-rules.md
```

---

## 5. Output Styles (Phong Cách Giao Tiếp)

### 📍 Vị trí: `.gemini/output-styles/`

Output Styles cho phép điều chỉnh cách Gravity giao tiếp dựa trên experience level của bạn.

### 6 Levels

| Level | File | Dành cho | Đặc điểm |
|-------|------|----------|----------|
| **0** | `coding-level-0-eli5.md` | Người mới bắt đầu | Giải thích như cho trẻ 5 tuổi |
| **1** | `coding-level-1-junior.md` | Junior (0-2 năm) | Chi tiết, step-by-step, nhiều ví dụ |
| **2** | `coding-level-2-mid.md` | Mid-level (2-5 năm) | Balance giữa giải thích và code |
| **3** | `coding-level-3-senior.md` | Senior (5-8 năm) | Trade-offs, production-ready |
| **4** | `coding-level-4-lead.md` | Tech Lead (8+ năm) | Strategic, team impact, architecture |
| **5** | `coding-level-5-god.md` | Expert | Code only, minimal text |

### Chi tiết từng Level

#### Level 0: ELI5 (Explain Like I'm 5)
```
Đặc điểm:
- Sử dụng analogies đời thường
- Không dùng thuật ngữ kỹ thuật
- Nhiều hình ảnh minh hoạ
- Step-by-step cực kỳ chi tiết

Ví dụ output:
"API giống như người bồi bàn ở nhà hàng. Bạn (app) gọi món, 
bồi bàn (API) mang yêu cầu vào bếp (server), rồi mang đồ ăn 
(data) ra cho bạn."
```

#### Level 1: Junior Developer
```
Đặc điểm:
- Explain fundamentals
- Code với nhiều comments
- Warning về common mistakes
- Links tới docs để học thêm

MUST:
- Explain WHY, not just HOW
- Show complete code examples
- Highlight common pitfalls
```

#### Level 2: Mid-level Developer
```
Đặc điểm:
- Balance theory và practice
- Code patterns và best practices
- Some trade-off discussions
- Less hand-holding

MUST:
- Discuss alternatives
- Mention testing strategies
- Consider edge cases
```

#### Level 3: Senior Developer
```
Đặc điểm:
- Lead with trade-offs
- Production-ready code
- Operational concerns (monitoring, debugging)
- Security implications

MUST NOT:
- Explain basic concepts
- Over-comment code
- Add unnecessary context
```

#### Level 4: Tech Lead
```
Đặc điểm:
- Strategic perspective
- Team và organizational factors
- Architecture decisions
- Long-term implications

Focus on:
- Cross-team dependencies
- Risk assessment
- Knowledge transfer
```

#### Level 5: God Mode
```
Đặc điểm:
- Code only
- Minimal explanations
- Assume expert knowledge
- Maximum efficiency

Output format:
- Just the code
- Brief inline comments only where non-obvious
```

### Cách Sử Dụng

```
# Cách 1: Yêu cầu level cụ thể
Hãy giải thích về React hooks ở Junior level

# Cách 2: Set mặc định cho session
Từ giờ hãy giao tiếp với tôi ở Senior level (Level 3)

# Cách 3: Yêu cầu đọc file style
Đọc file .gemini/output-styles/coding-level-3-senior.md 
và áp dụng style đó cho các câu trả lời tiếp theo

# Cách 4: Linh hoạt theo context
Giải thích concept ở Level 1, nhưng code ở Level 3
```

### Ví dụ So sánh Output

**Câu hỏi:** "Làm sao để handle errors trong API?"

**Level 1 (Junior):**
```markdown
# Error Handling trong API

Error handling rất quan trọng vì...

## Bước 1: Tạo Error Class
```javascript
// Custom error class giúp phân loại lỗi
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);  // Gọi constructor của Error
    this.statusCode = statusCode;
  }
}
```

## Bước 2: Sử dụng Try-Catch
...
```

**Level 3 (Senior):**
```markdown
### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Result<T,E> | Type-safe | Verbose |
| Exceptions | Familiar | Silent failures |

### Implementation
```typescript
type ApiError = 
  | { type: 'network'; retryable: boolean }
  | { type: 'validation'; fields: Record<string, string> };
// ... production-ready code
```

### Operational Concerns
- Metrics: Track error rates by type
- Circuit breaker for unreliable upstreams
```

**Level 5 (God):**
```typescript
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };
const handle = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
  try { return { ok: true, data: await fn() }; }
  catch (e) { return { ok: false, error: e as Error }; }
};
```

---

## 6. Docs (Tài Liệu Dự Án)

### 📍 Vị trí: `docs/`

Thư mục docs chứa các template và ví dụ cho documentation dự án.

### Cấu trúc

```
docs/
├── code-standards.md         ← Coding standards chi tiết
├── codebase-summary.md       ← Tóm tắt cấu trúc codebase
├── project-overview-pdr.md   ← Project overview template
├── project-roadmap.md        ← Roadmap template
├── system-architecture.md    ← Kiến trúc hệ thống
├── assets/                   ← Images, diagrams
└── journals/                 ← Development journals
```

### Nội dung chính

#### code-standards.md (947 dòng)
```
Nội dung:
- Core Development Principles (YAGNI, KISS, DRY)
- File Organization Standards
- Naming Conventions
- Code Style Guidelines
- Error Handling
- Security Standards
- Testing Standards
- Git Standards
- Documentation Standards
```

#### codebase-summary.md
```
Template cho:
- Project structure overview
- Key directories
- Important files
- Dependencies
- Configuration
```

#### system-architecture.md
```
Template cho:
- Architecture diagrams
- Component relationships
- Data flow
- Technology stack
- Deployment architecture
```

### Cách Sử Dụng

```
# Cách 1: Tham khảo khi cần
Tạo README cho project theo style trong docs/code-standards.md

# Cách 2: Generate docs mới
Sử dụng template docs/codebase-summary.md để tạo tóm tắt cho project này

# Cách 3: Áp dụng standards
Review code của tôi theo tiêu chuẩn trong docs/code-standards.md
```

### Development Journals

```
docs/journals/
├── 251106-topic-1.md
├── 251107-topic-2.md
└── INDEX.md
```

Format journal entry:
```markdown
# Journal Entry - [Date]

## Summary
Brief overview

## Accomplishments
- Task 1
- Task 2

## Learnings
- Learning 1

## Challenges
- Challenge faced

## Next Steps
- What to do next
```

---

## Best Practices

### 1. Workflow Chaining
```
# Ví dụ: Feature development flow

1. /plan thêm tính năng X
   ↓ (review plan)
2. /develop implement theo plan
   ↓ (code xong)
3. /test viết tests cho feature
   ↓ (tests pass)
4. /review check code quality
   ↓ (approved)
5. /git create PR và merge
```

### 2. Skill Stacking
```
# Kết hợp multiple skills cho task phức tạp

Sử dụng:
- frontend-development skill cho React code
- ui-ux-pro-max skill cho design
- databases skill cho data layer

Để tạo một data dashboard hoàn chỉnh
```

### 3. Level Switching
```
# Linh hoạt thay đổi level theo context

- Khi học concept mới: Level 1-2
- Khi code production: Level 3-4  
- Khi cần code nhanh: Level 5
```

### 4. Documentation Driven
```
# Luôn document trước khi code

1. Đọc docs/code-standards.md
2. Tạo plan với /plan
3. Document trong docs/
4. Implement theo plan
5. Update documentation
```

---

## Troubleshooting

### Workflow không hoạt động
```
Kiểm tra:
1. File có tồn tại trong .agent/workflows/ không?
2. File có đúng format YAML frontmatter không?
3. Tên file có khớp với slash command không?
```

### Skill không được load
```
Kiểm tra:
1. Thư mục skill có file SKILL.md không?
2. SKILL.md có YAML frontmatter đúng format không?
3. Description có mô tả rõ when to use không?
```

### Output không đúng level
```
Cách fix:
1. Yêu cầu rõ ràng: "Trả lời ở Level 3"
2. Đọc file style trước: "Đọc .gemini/output-styles/coding-level-3-senior.md"
3. Set context: "Tôi là Senior Developer với 6 năm kinh nghiệm"
```

---

## Quick Reference

```
┌────────────────────────────────────────────────────────┐
│                    QUICK COMMANDS                       │
├────────────────────────────────────────────────────────┤
│  /plan [task]      │  Lập kế hoạch                     │
│  /develop [task]   │  Implement feature                │
│  /debug [issue]    │  Fix bugs                         │
│  /review [scope]   │  Review code                      │
│  /test [scope]     │  Write/run tests                  │
├────────────────────────────────────────────────────────┤
│  Level 0-1         │  Learning mode                    │
│  Level 2-3         │  Working mode                     │
│  Level 4-5         │  Expert mode                      │
└────────────────────────────────────────────────────────┘
```

---

*Tài liệu này được tạo bởi Gravity AI Assistant*  
*Phiên bản: 1.0.0 | Ngày: 2026-01-14*
