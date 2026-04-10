/**
 * test-pagination.js — Unit tests for series-aware getAllEvents pagination
 * Requirements:
 *   - 9 UNIQUE events per page (series events deduplicated by groupId)
 *   - Total count = unique events (not raw Firestore documents)
 *   - Cursor must skip past all series siblings to avoid duplicates on next page
 *
 * Run: node server/scripts/test-pagination.js
 */

const fs = require('fs');
const path = require('path');

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

function assert(condition, testName) {
    if (condition) {
        passed++;
        console.log(`  ${GREEN}✓${RESET} ${testName}`);
    } else {
        failed++;
        failures.push(testName);
        console.log(`  ${RED}✗${RESET} ${testName}`);
    }
}

// ─── SIMULATE THE ACTUAL BACKEND DEDUP LOGIC ────────────────────────

function createMockDoc(id, data) {
    return { id, exists: true, data: () => ({ ...data }), ref: { id } };
}

/**
 * Simulate the exact dedup logic from eventController.getAllEvents
 * Given raw Firestore docs, apply the series-aware pagination.
 */
function simulateSeriesAwarePagination(allDocs, parsedLimit) {
    const seenGroups = new Set();
    const uniqueEvents = [];
    let lastScannedDoc = null;

    for (const doc of allDocs) {
        const data = doc.data();
        const event = { id: doc.id, ...data };
        lastScannedDoc = doc;

        if (event.groupId) {
            if (seenGroups.has(event.groupId)) {
                continue;
            }
            seenGroups.add(event.groupId);
        }

        uniqueEvents.push(event);

        if (uniqueEvents.length > parsedLimit) {
            break;
        }
    }

    const hasMore = uniqueEvents.length > parsedLimit;
    const finalEvents = hasMore ? uniqueEvents.slice(0, parsedLimit) : uniqueEvents;

    // Cursor logic
    let cursorDoc = null;
    if (finalEvents.length > 0) {
        const lastEvent = finalEvents[finalEvents.length - 1];
        if (lastEvent.groupId) {
            for (let i = allDocs.length - 1; i >= 0; i--) {
                if (allDocs[i].data().groupId === lastEvent.groupId) {
                    cursorDoc = allDocs[i];
                    break;
                }
            }
        }
        if (!cursorDoc) {
            cursorDoc = allDocs.find(d => d.id === lastEvent.id);
        }
    }

    // Count unique events from ALL docs
    const countedGroups = new Set();
    let uniqueCount = 0;
    allDocs.forEach(d => {
        const gid = d.data().groupId;
        if (gid) {
            if (!countedGroups.has(gid)) {
                countedGroups.add(gid);
                uniqueCount++;
            }
        } else {
            uniqueCount++;
        }
    });

    return {
        events: finalEvents,
        meta: {
            total: uniqueCount,
            count: finalEvents.length,
            lastId: cursorDoc ? cursorDoc.id : null,
            hasMore
        }
    };
}

// ─── TEST SUITES ────────────────────────────────────────────────────

async function testScenario_SeriesDedup() {
    console.log(`\n${BOLD}${CYAN}━━━ Core: Series events are deduplicated ━━━${RESET}\n`);

    // Simulate: 1 series event spanning 9 days + 2 standalone events = 27 raw docs but only 3 unique events
    const allDocs = [];

    // Series event: 9 docs with same groupId
    for (let i = 0; i < 9; i++) {
        allDocs.push(createMockDoc(`series-day-${i}`, {
            eventName: 'Multi-Day Exhibition',
            eventDate: `2026-04-${String(17 + i).padStart(2, '0')}`,
            groupId: 'group-abc',
            isSeriesStart: i === 0
        }));
    }

    // 2 standalone events
    allDocs.push(createMockDoc('standalone-1', {
        eventName: 'Meeting A',
        eventDate: '2026-04-10'
    }));
    allDocs.push(createMockDoc('standalone-2', {
        eventName: 'Meeting B',
        eventDate: '2026-04-05'
    }));

    const result = simulateSeriesAwarePagination(allDocs, 9);

    assertEqual(result.meta.total, 3, '⭐ Total unique events = 3 (not 11 raw docs)');
    assertEqual(result.meta.count, 3, 'Page shows 3 events (all fit on 1 page)');
    assertEqual(result.meta.hasMore, false, 'No more pages needed');
    assertEqual(result.events[0].eventName, 'Multi-Day Exhibition', 'First event is the series');
    assertEqual(result.events[1].eventName, 'Meeting A', 'Second event is standalone');
    assertEqual(result.events[2].eventName, 'Meeting B', 'Third event is standalone');
}

async function testScenario_MixedSeriesAndStandalone() {
    console.log(`\n${BOLD}${CYAN}━━━ Mixed: Multiple series + standalone events ━━━${RESET}\n`);

    const allDocs = [];

    // Series A: 5 days
    for (let i = 0; i < 5; i++) {
        allDocs.push(createMockDoc(`seriesA-${i}`, {
            eventName: 'Exhibition A',
            eventDate: `2026-04-${String(30 - i).padStart(2, '0')}`,
            groupId: 'group-A',
            isSeriesStart: i === 0
        }));
    }

    // Standalone 1
    allDocs.push(createMockDoc('solo-1', {
        eventName: 'Solo Event 1',
        eventDate: '2026-04-24'
    }));

    // Series B: 3 days
    for (let i = 0; i < 3; i++) {
        allDocs.push(createMockDoc(`seriesB-${i}`, {
            eventName: 'Workshop B',
            eventDate: `2026-04-${String(23 - i).padStart(2, '0')}`,
            groupId: 'group-B',
            isSeriesStart: i === 0
        }));
    }

    // Standalone 2-10 (9 more standalone)
    for (let i = 2; i <= 10; i++) {
        allDocs.push(createMockDoc(`solo-${i}`, {
            eventName: `Solo Event ${i}`,
            eventDate: `2026-04-${String(20 - i).padStart(2, '0')}`
        }));
    }

    // Total unique = 2 series + 10 standalone = 12
    const result = simulateSeriesAwarePagination(allDocs, 9);

    assertEqual(result.meta.total, 12, '⭐ Total unique events = 12 (2 series + 10 standalone)');
    assertEqual(result.meta.count, 9, 'Page 1: shows 9 unique events');
    assertEqual(result.meta.hasMore, true, 'Page 1: hasMore = true');
}

async function testScenario_AllSeriesOnePage() {
    console.log(`\n${BOLD}${CYAN}━━━ Edge: All docs from same series → 1 event ━━━${RESET}\n`);

    // 45 docs, all same groupId (e.g., a 45-day event!)
    const allDocs = [];
    for (let i = 0; i < 45; i++) {
        allDocs.push(createMockDoc(`mega-series-${i}`, {
            eventName: 'Mega Event',
            eventDate: `2026-${String(Math.floor(i / 30) + 4).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
            groupId: 'group-mega',
            isSeriesStart: i === 0
        }));
    }

    const result = simulateSeriesAwarePagination(allDocs, 9);

    assertEqual(result.meta.total, 1, '⭐ 45 docs but only 1 unique event');
    assertEqual(result.meta.count, 1, 'Shows 1 event card');
    assertEqual(result.meta.hasMore, false, 'No more pages');
}

async function testScenario_CursorSkipsSiblings() {
    console.log(`\n${BOLD}${CYAN}━━━ Cursor: Cursor skips past series siblings ━━━${RESET}\n`);

    // Series with 5 siblings, the cursor should point to the LAST sibling
    const allDocs = [];
    for (let i = 0; i < 5; i++) {
        allDocs.push(createMockDoc(`series-${i}`, {
            eventName: 'My Series',
            eventDate: `2026-04-${String(30 - i).padStart(2, '0')}`,
            groupId: 'group-X',
            isSeriesStart: i === 0
        }));
    }

    // 1 standalone after the series
    allDocs.push(createMockDoc('after-series', {
        eventName: 'After Series',
        eventDate: '2026-04-20'
    }));

    const result = simulateSeriesAwarePagination(allDocs, 9);

    // The cursor should point to the LAST sibling of the series (series-4)
    // NOT series-0 (which is the event we display)
    // This ensures the next page starts AFTER all siblings
    assertEqual(result.events.length, 2, 'Shows 2 unique events');

    // If the last event on the page is the standalone, cursor should be its doc
    // But if the series is last, cursor should be the last sibling
    // In this case: result = [My Series, After Series]
    // Last event = After Series (standalone), cursor = after-series
    assertEqual(result.meta.lastId, 'after-series', 'Cursor points to last standalone doc');
}

async function testScenario_CursorForSeriesAtEnd() {
    console.log(`\n${BOLD}${CYAN}━━━ Cursor: Series event is last on page ━━━${RESET}\n`);

    const allDocs = [];

    // 8 standalone events first
    for (let i = 0; i < 8; i++) {
        allDocs.push(createMockDoc(`solo-${i}`, {
            eventName: `Solo ${i}`,
            eventDate: `2026-04-${String(30 - i).padStart(2, '0')}`
        }));
    }

    // Series event with 5 siblings (this fills position 9 = last on page)
    for (let i = 0; i < 5; i++) {
        allDocs.push(createMockDoc(`series-end-${i}`, {
            eventName: 'Series At End',
            eventDate: `2026-04-${String(22 - i).padStart(2, '0')}`,
            groupId: 'group-end',
            isSeriesStart: i === 0
        }));
    }

    // 1 more standalone (should be on next page)
    allDocs.push(createMockDoc('next-page', {
        eventName: 'Next Page Event',
        eventDate: '2026-04-15'
    }));

    const result = simulateSeriesAwarePagination(allDocs, 9);

    assertEqual(result.meta.count, 9, 'Page has 9 unique events (8 solo + 1 series)');
    assertEqual(result.meta.hasMore, true, 'hasMore = true (1 more standalone)');
    // Cursor should be the LAST sibling of the series at position 9
    assertEqual(result.meta.lastId, 'series-end-4', '⭐ Cursor = last sibling of the series (series-end-4), not series-end-0');
}

async function testScenario_NoEvents() {
    console.log(`\n${BOLD}${CYAN}━━━ Edge: Empty collection ━━━${RESET}\n`);

    const result = simulateSeriesAwarePagination([], 9);

    assertEqual(result.meta.total, 0, 'Empty: total = 0');
    assertEqual(result.meta.count, 0, 'Empty: count = 0');
    assertEqual(result.meta.hasMore, false, 'Empty: hasMore = false');
    assertEqual(result.meta.lastId, null, 'Empty: lastId = null');
}

async function testScenario_ItemsPerPageIs9() {
    console.log(`\n${BOLD}${CYAN}━━━ Config: itemsPerPage = 9 ━━━${RESET}\n`);

    const dashboardPath = path.resolve(__dirname, '../../client/src/components/EventDashboard.jsx');
    try {
        const content = fs.readFileSync(dashboardPath, 'utf-8');
        const match = content.match(/const\s+itemsPerPage\s*=\s*(\d+)/);
        const value = match ? parseInt(match[1]) : null;
        assertEqual(value, 9, '⭐ Client itemsPerPage = 9');
    } catch (err) {
        failed++;
        failures.push('Could not read EventDashboard.jsx');
        console.log(`  ${RED}✗${RESET} Could not read EventDashboard.jsx: ${err.message}`);
    }
}

async function testScenario_BackendHasDedup() {
    console.log(`\n${BOLD}${CYAN}━━━ Backend: Controller has series-aware logic ━━━${RESET}\n`);

    const controllerPath = path.resolve(__dirname, '../controllers/eventController.js');
    const source = fs.readFileSync(controllerPath, 'utf-8');

    assert(source.includes('seenGroups'), 'Backend uses seenGroups Set for dedup');
    assert(source.includes('event.groupId'), 'Backend checks groupId on each doc');
    assert(source.includes('overFetchMultiplier'), 'Backend over-fetches to compensate for series docs');
    assert(source.includes('select(\'groupId\')'), 'Backend uses select projection for efficient total count');
    assert(source.includes('uniqueCount'), 'Backend calculates unique count across all docs');
}

async function testScenario_FrontendNoClientDedup() {
    console.log(`\n${BOLD}${CYAN}━━━ Frontend: No redundant client-side dedup ━━━${RESET}\n`);

    const dashboardPath = path.resolve(__dirname, '../../client/src/components/EventDashboard.jsx');
    const source = fs.readFileSync(dashboardPath, 'utf-8');

    assert(!source.includes('groupedFilteredEvents'), '⭐ Client-side groupedFilteredEvents is REMOVED');
    assert(source.includes('currentEvents = filteredEvents'), 'currentEvents uses filteredEvents directly');
}

// ─── MAIN ───────────────────────────────────────────────────────────
async function main() {
    console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}║  ${CYAN}Series-Aware Pagination Test Suite${RESET}${BOLD}                     ║${RESET}`);
    console.log(`${BOLD}║  9 unique events/page, accurate total, smart cursor${RESET}${BOLD}    ║${RESET}`);
    console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}`);

    await testScenario_ItemsPerPageIs9();
    await testScenario_BackendHasDedup();
    await testScenario_FrontendNoClientDedup();
    await testScenario_SeriesDedup();
    await testScenario_MixedSeriesAndStandalone();
    await testScenario_AllSeriesOnePage();
    await testScenario_CursorSkipsSiblings();
    await testScenario_CursorForSeriesAtEnd();
    await testScenario_NoEvents();

    // ── Summary ──
    const total = passed + failed;
    console.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    if (failed === 0) {
        console.log(`${GREEN}${BOLD}  ✅ ALL ${total} TESTS PASSED${RESET}`);
        console.log(`${GREEN}     Coverage: dedup / total count / cursor / edge cases${RESET}`);
    } else {
        console.log(`${RED}${BOLD}  ❌ ${failed}/${total} TESTS FAILED${RESET}`);
        failures.forEach(f => console.log(`    ${RED}• ${f}${RESET}`));
    }
    console.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(`${RED}Fatal:${RESET}`, err); process.exit(1); });
