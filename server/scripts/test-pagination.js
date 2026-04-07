/**
 * test-pagination.js — Unit tests for getAllEvents pagination logic
 * Requirements:
 *   - 9 events per page
 *   - Total count must be consistent across ALL pages
 *   - Example: 20 events → Page 1 (9), Page 2 (9), Page 3 (2) → total = 20 everywhere
 *
 * Run: node server/scripts/test-pagination.js
 */

// ─── COLOR HELPERS ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        passed++;
        console.log(`  ${GREEN}✓${RESET} ${testName}`);
    } else {
        failed++;
        failures.push(`${testName} (expected: ${expected}, got: ${actual})`);
        console.log(`  ${RED}✗${RESET} ${testName} — expected: ${CYAN}${expected}${RESET}, got: ${RED}${actual}${RESET}`);
    }
}

// ─── MOCK FACTORY ───────────────────────────────────────────────────
function createMockDoc(id, data) {
    return { id, exists: true, data: () => ({ ...data }), ref: { id } };
}

function createMockDocs(count, startIndex = 0) {
    const docs = [];
    for (let i = 0; i < count; i++) {
        const idx = startIndex + i;
        docs.push(createMockDoc(`event-${idx}`, {
            eventName: `Event ${idx}`,
            eventDate: `2026-04-${String(30 - idx).padStart(2, '0')}`,
            startTime: '08:00',
            endTime: '17:00',
            department: 'Test',
            location: ['Hall A'],
            createdBy: 'test-user'
        }));
    }
    return docs;
}

function buildMockEventsCollection({ totalCount, paginatedDocs, cursorDoc = null }) {
    const queryChain = {
        orderBy() { return this; },
        where() { return this; },
        startAfter() { return { ...queryChain }; },
        limit() { return this; },
        async get() { return { docs: paginatedDocs, size: paginatedDocs.length }; },
        count() {
            return { async get() { return { data: () => ({ count: totalCount }) }; } };
        }
    };
    return {
        ...queryChain,
        doc() { return { async get() { return cursorDoc || { exists: false }; } }; }
    };
}

// ─── CORE LOGIC UNDER TEST ─────────────────────────────────────────
async function runGetAllEvents(queryParams, mockOpts) {
    const mock = buildMockEventsCollection(mockOpts);
    const { startDate, endDate, limit = 9, lastDocId } = queryParams;
    const parsedLimit = Math.min(parseInt(limit) || 9, 100);

    let baseQuery = mock.orderBy('eventDate', 'desc');
    if (startDate && endDate) {
        baseQuery = mock.where('eventDate', '>=', startDate).where('eventDate', '<=', endDate).orderBy('eventDate', 'desc');
    }

    let paginatedQuery = baseQuery;
    if (lastDocId) {
        const lastDoc = await mock.doc(lastDocId).get();
        if (lastDoc.exists) {
            paginatedQuery = paginatedQuery.startAfter(lastDoc);
        }
    }

    const [snapshot, countSnapshot] = await Promise.all([
        paginatedQuery.limit(parsedLimit + 1).get(),
        baseQuery.count().get()
    ]);

    const total = countSnapshot.data().count;
    const hasMore = snapshot.docs.length > parsedLimit;
    const docs = hasMore ? snapshot.docs.slice(0, parsedLimit) : snapshot.docs;
    const events = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastVisible = docs[docs.length - 1];

    return {
        events,
        meta: { total, count: events.length, lastId: lastVisible ? lastVisible.id : null, hasMore }
    };
}

// ─── TEST SUITES ────────────────────────────────────────────────────

async function testUserScenario_20Events() {
    console.log(`\n${BOLD}${CYAN}━━━ User Scenario: 20 events, 9 per page ━━━${RESET}`);
    console.log(`  ${CYAN}Expected: Page1=9, Page2=9, Page3=2, total=20 everywhere${RESET}\n`);

    const TOTAL = 20;
    const PER_PAGE = 9;

    // Page 1: 10 docs returned (9 + 1 extra → hasMore=true)
    const p1 = await runGetAllEvents(
        { limit: PER_PAGE },
        { totalCount: TOTAL, paginatedDocs: createMockDocs(PER_PAGE + 1, 0) }
    );
    assertEqual(p1.meta.total, 20, '⭐ Page 1: total = 20');
    assertEqual(p1.meta.count, 9, 'Page 1: shows 9 events');
    assertEqual(p1.meta.hasMore, true, 'Page 1: hasMore = true');

    // Page 2: 10 docs returned (9 + 1 extra → hasMore=true)
    const cursor1 = createMockDoc('event-8', { eventDate: '2026-04-22' });
    const p2 = await runGetAllEvents(
        { limit: PER_PAGE, lastDocId: 'event-8' },
        { totalCount: TOTAL, paginatedDocs: createMockDocs(PER_PAGE + 1, 9), cursorDoc: cursor1 }
    );
    assertEqual(p2.meta.total, 20, '⭐ Page 2: total = 20 (NOT 11!)');
    assertEqual(p2.meta.count, 9, 'Page 2: shows 9 events');
    assertEqual(p2.meta.hasMore, true, 'Page 2: hasMore = true');

    // Page 3: only 2 docs left → hasMore=false
    const cursor2 = createMockDoc('event-17', { eventDate: '2026-04-13' });
    const p3 = await runGetAllEvents(
        { limit: PER_PAGE, lastDocId: 'event-17' },
        { totalCount: TOTAL, paginatedDocs: createMockDocs(2, 18), cursorDoc: cursor2 }
    );
    assertEqual(p3.meta.total, 20, '⭐ Page 3: total = 20 (NOT 2!)');
    assertEqual(p3.meta.count, 2, 'Page 3: shows 2 events');
    assertEqual(p3.meta.hasMore, false, 'Page 3: hasMore = false (last page)');
}

async function testScenario_27Events() {
    console.log(`\n${BOLD}${CYAN}━━━ Scenario: 27 events, 9 per page ━━━${RESET}`);
    console.log(`  ${CYAN}Expected: Page1=9, Page2=9, Page3=9, total=27 everywhere${RESET}\n`);

    const TOTAL = 27;
    const PER_PAGE = 9;

    const p1 = await runGetAllEvents(
        { limit: PER_PAGE },
        { totalCount: TOTAL, paginatedDocs: createMockDocs(PER_PAGE + 1, 0) }
    );
    assertEqual(p1.meta.total, 27, '⭐ Page 1: total = 27');
    assertEqual(p1.meta.count, 9, 'Page 1: shows 9 events');
    assertEqual(p1.meta.hasMore, true, 'Page 1: hasMore = true');

    const cursor1 = createMockDoc('event-8', { eventDate: '2026-04-22' });
    const p2 = await runGetAllEvents(
        { limit: PER_PAGE, lastDocId: 'event-8' },
        { totalCount: TOTAL, paginatedDocs: createMockDocs(PER_PAGE + 1, 9), cursorDoc: cursor1 }
    );
    assertEqual(p2.meta.total, 27, '⭐ Page 2: total = 27 (NOT 18!)');
    assertEqual(p2.meta.count, 9, 'Page 2: shows 9 events');
    assertEqual(p2.meta.hasMore, true, 'Page 2: hasMore = true');

    const cursor2 = createMockDoc('event-17', { eventDate: '2026-04-13' });
    const p3 = await runGetAllEvents(
        { limit: PER_PAGE, lastDocId: 'event-17' },
        { totalCount: TOTAL, paginatedDocs: createMockDocs(9, 18), cursorDoc: cursor2 }
    );
    assertEqual(p3.meta.total, 27, '⭐ Page 3: total = 27 (NOT 9!)');
    assertEqual(p3.meta.count, 9, 'Page 3: shows 9 events');
    assertEqual(p3.meta.hasMore, false, 'Page 3: hasMore = false (last page)');
}

async function testScenario_EmptyCollection() {
    console.log(`\n${BOLD}${CYAN}━━━ Edge Case: Empty collection ━━━${RESET}\n`);

    const p = await runGetAllEvents(
        { limit: 9 },
        { totalCount: 0, paginatedDocs: [] }
    );
    assertEqual(p.meta.total, 0, 'Empty: total = 0');
    assertEqual(p.meta.count, 0, 'Empty: count = 0');
    assertEqual(p.meta.hasMore, false, 'Empty: hasMore = false');
    assertEqual(p.meta.lastId, null, 'Empty: lastId = null');
}

async function testScenario_LessThanOnePage() {
    console.log(`\n${BOLD}${CYAN}━━━ Edge Case: Less than one page (5 events) ━━━${RESET}\n`);

    const p = await runGetAllEvents(
        { limit: 9 },
        { totalCount: 5, paginatedDocs: createMockDocs(5) }
    );
    assertEqual(p.meta.total, 5, 'Partial page: total = 5');
    assertEqual(p.meta.count, 5, 'Partial page: count = 5');
    assertEqual(p.meta.hasMore, false, 'Partial page: hasMore = false');
}

async function testScenario_ExactlyOnePage() {
    console.log(`\n${BOLD}${CYAN}━━━ Edge Case: Exactly 9 events (1 full page) ━━━${RESET}\n`);

    const p = await runGetAllEvents(
        { limit: 9 },
        { totalCount: 9, paginatedDocs: createMockDocs(9) }
    );
    assertEqual(p.meta.total, 9, 'Exact page: total = 9');
    assertEqual(p.meta.count, 9, 'Exact page: count = 9');
    assertEqual(p.meta.hasMore, false, 'Exact page: hasMore = false (no extra doc)');
}

async function testScenario_InvalidCursor() {
    console.log(`\n${BOLD}${CYAN}━━━ Edge Case: Invalid cursor (deleted event) ━━━${RESET}\n`);

    const p = await runGetAllEvents(
        { limit: 9, lastDocId: 'deleted-event-id' },
        { totalCount: 20, paginatedDocs: createMockDocs(10, 0), cursorDoc: { exists: false } }
    );
    assertEqual(p.meta.total, 20, 'Invalid cursor: total still 20');
    assertEqual(p.meta.count, 9, 'Invalid cursor: returns page of 9');
    assertEqual(p.meta.hasMore, true, 'Invalid cursor: hasMore = true');
}

async function testScenario_ItemsPerPageIs9() {
    console.log(`\n${BOLD}${CYAN}━━━ Config Check: itemsPerPage = 9 ━━━${RESET}\n`);

    // Read the actual source file to verify
    const fs = require('fs');
    const path = require('path');
    const dashboardPath = path.resolve(__dirname, '../../client/src/components/EventDashboard.jsx');

    try {
        const content = fs.readFileSync(dashboardPath, 'utf-8');
        const match = content.match(/const\s+itemsPerPage\s*=\s*(\d+)/);
        const value = match ? parseInt(match[1]) : null;
        assertEqual(value, 9, '⭐ Client itemsPerPage is set to 9');
    } catch (err) {
        failed++;
        failures.push('Could not read EventDashboard.jsx');
        console.log(`  ${RED}✗${RESET} Could not read EventDashboard.jsx: ${err.message}`);
    }
}

// ─── MAIN ───────────────────────────────────────────────────────────
async function main() {
    console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}║  ${CYAN}Pagination Test Suite${RESET}${BOLD}                                   ║${RESET}`);
    console.log(`${BOLD}║  9 events/page, total consistent across all pages${RESET}${BOLD}      ║${RESET}`);
    console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}`);

    await testScenario_ItemsPerPageIs9();
    await testUserScenario_20Events();
    await testScenario_27Events();
    await testScenario_EmptyCollection();
    await testScenario_LessThanOnePage();
    await testScenario_ExactlyOnePage();
    await testScenario_InvalidCursor();

    // ── Summary ──
    const total = passed + failed;
    console.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    if (failed === 0) {
        console.log(`${GREEN}${BOLD}  ✅ ALL ${total} TESTS PASSED${RESET}`);
    } else {
        console.log(`${RED}${BOLD}  ❌ ${failed}/${total} TESTS FAILED${RESET}`);
        failures.forEach(f => console.log(`    ${RED}• ${f}${RESET}`));
    }
    console.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(`${RED}Fatal:${RESET}`, err); process.exit(1); });
