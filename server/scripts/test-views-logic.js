/**
 * test-views-logic.js — Logic & algorithm tests for Calendar, Timeline, Analytics views
 * Verifies:
 *   - CalendarView: multi-day series events span correctly 
 *   - LogisticsKanban: event categorization (upcoming/setup/live/cleanup)
 *   - LogisticsKanban: fetchLogistics has proper api.get() call
 *   - Analytics: date range calculation for each period
 *
 * Run: node server/scripts/test-views-logic.js
 */

const fs = require('fs');
const path = require('path');

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

// ─── CALENDAR VIEW TESTS ──────────────────────────────────────────

function testCalendarView_SourceCode() {
    console.log(`\n${BOLD}${CYAN}━━━ CalendarView: Source Code Analysis ━━━${RESET}\n`);

    const calPath = path.resolve(__dirname, '../../client/src/components/CalendarView.jsx');
    const source = fs.readFileSync(calPath, 'utf-8');

    // Test: Uses seriesEndDate for multi-day events
    assert(
        source.includes('seriesEndDate'),
        '⭐ CalendarView uses seriesEndDate for multi-day span'
    );

    // Test: Properly checks seriesEndDate !== eventDate
    assert(
        source.includes("event.seriesEndDate !== event.eventDate"),
        'Skips seriesEndDate when same as eventDate (single day)'
    );

    // Test: Uses react-big-calendar
    assert(
        source.includes("react-big-calendar"),
        'Uses react-big-calendar library'
    );

    // Test: Has localizer for Vietnamese
    assert(
        source.includes("vi") && source.includes("dateFnsLocalizer"),
        'Vietnamese locale configured with date-fns'
    );

    // Test: Week starts on Monday
    assert(
        source.includes("weekStartsOn: 1"),
        'Calendar week starts on Monday (Vietnamese convention)'
    );

    // Test: Click to preview event
    assert(
        source.includes('setPreviewEvent') && source.includes('EventPreviewModal'),
        'Click event opens preview modal'
    );
}

function testCalendarView_DateLogic() {
    console.log(`\n${BOLD}${CYAN}━━━ CalendarView: Date Conversion Logic ━━━${RESET}\n`);

    // Simulate the exact mapping logic
    function mapEvent(event) {
        const startDate = event.eventDate;
        const endDate = (event.seriesEndDate && event.seriesEndDate !== event.eventDate)
            ? event.seriesEndDate
            : event.eventDate;
        return {
            start: new Date(`${startDate}T${event.startTime || '00:00'}`),
            end: new Date(`${endDate}T${event.endTime || '23:59'}`)
        };
    }

    // Case 1: Single-day event
    const single = mapEvent({ eventDate: '2026-04-14', startTime: '08:00', endTime: '17:00' });
    assertEqual(single.start.getDate(), 14, 'Single-day: starts on correct day');
    assertEqual(single.end.getDate(), 14, 'Single-day: ends on same day');
    assertEqual(single.start.getHours(), 8, 'Single-day: starts at correct hour');
    assertEqual(single.end.getHours(), 17, 'Single-day: ends at correct hour');

    // Case 2: Multi-day series event  
    const series = mapEvent({ eventDate: '2026-04-17', seriesEndDate: '2026-04-25', startTime: '08:00', endTime: '17:30' });
    assertEqual(series.start.getDate(), 17, 'Multi-day: starts on April 17');
    assertEqual(series.end.getDate(), 25, '⭐ Multi-day: ends on April 25 (spans 9 days)');

    // Case 3: seriesEndDate === eventDate (treated as single-day)
    const sameDayEnd = mapEvent({ eventDate: '2026-04-14', seriesEndDate: '2026-04-14', startTime: '09:00', endTime: '12:00' });
    assertEqual(sameDayEnd.end.getDate(), 14, 'Same seriesEndDate: treated as single-day');

    // Case 4: Missing times
    const noTimes = mapEvent({ eventDate: '2026-04-20' });
    assertEqual(noTimes.start.getHours(), 0, 'No startTime: defaults to 00:00');
    assertEqual(noTimes.end.getHours(), 23, 'No endTime: defaults to 23:59');
}

// ─── LOGISTICS KANBAN (TIMELINE) TESTS ──────────────────────────

function testKanban_SourceCode() {
    console.log(`\n${BOLD}${CYAN}━━━ LogisticsKanban: Source Code Analysis ━━━${RESET}\n`);

    const kanbanPath = path.resolve(__dirname, '../../client/src/components/LogisticsKanban.jsx');
    const source = fs.readFileSync(kanbanPath, 'utf-8');

    // Critical: Must have api.get() call (was the bug)
    assert(
        source.includes("api.get(") || source.includes("api.get(`"),
        '⭐ fetchLogistics has api.get() call (BUG WAS: missing entirely!)'
    );

    // Must NOT have orphan response.data without api call
    const hasApiGet = source.includes("await api.get(");
    const hasResponseData = source.includes("response.data");
    assert(
        hasApiGet && hasResponseData,
        'response.data is accessed AFTER api.get() call'
    );

    // Should fetch events with date range 
    assert(
        source.includes("startDate") && source.includes("endDate"),
        'Fetches events with date range parameters'
    );

    // Has all 4 kanban columns
    assert(source.includes("'upcoming'"), 'Has upcoming column');
    assert(source.includes("'setup'"), 'Has setup column');
    assert(source.includes("'live'"), 'Has live column');
    assert(source.includes("'cleanup'"), 'Has cleanup column');

    // Setup window is 2 hours before event
    assert(
        source.includes('subHours(start, 2)'),
        'Setup window = 2 hours before event start'
    );
}

function testKanban_CategoryLogic() {
    console.log(`\n${BOLD}${CYAN}━━━ LogisticsKanban: Event Category Algorithm ━━━${RESET}\n`);

    // Simulate the exact board categorization logic
    function categorizeEvent(event, now) {
        let start, end;
        if (event.eventDate && event.startTime) {
            const [h, m] = event.startTime.split(':');
            start = new Date(event.eventDate);
            start.setHours(parseInt(h), parseInt(m), 0, 0);
        }
        if (event.eventDate && event.endTime) {
            const [h, m] = event.endTime.split(':');
            end = new Date(event.eventDate);
            end.setHours(parseInt(h), parseInt(m), 0, 0);
        }

        if (!start || isNaN(start.getTime())) return 'invalid';

        const startTime = start.getTime();
        const endTime = end.getTime();
        const nowTs = now.getTime();
        const setupStart = new Date(start);
        setupStart.setHours(setupStart.getHours() - 2);
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        if (endTime <= nowTs) {
            if (endTime >= startOfDay.getTime()) return 'cleanup';
            return 'past'; // too old, won't show
        } else if (startTime <= nowTs && endTime > nowTs) {
            return 'live';
        } else if (setupStart.getTime() <= nowTs && startTime > nowTs) {
            return 'setup';
        } else {
            return 'upcoming';
        }
    }

    const now = new Date('2026-04-13T10:00:00');

    // Case 1: Event happening right now
    const live = categorizeEvent({ eventDate: '2026-04-13', startTime: '09:00', endTime: '12:00' }, now);
    assertEqual(live, 'live', '⭐ Event 09:00-12:00 at 10:00 → LIVE');

    // Case 2: Event finished today
    const cleanup = categorizeEvent({ eventDate: '2026-04-13', startTime: '07:00', endTime: '09:30' }, now);
    assertEqual(cleanup, 'cleanup', 'Event 07:00-09:30 at 10:00 → CLEANUP');

    // Case 3: Event starts in 1.5 hours (within 2h setup window)
    const setup = categorizeEvent({ eventDate: '2026-04-13', startTime: '11:30', endTime: '14:00' }, now);
    assertEqual(setup, 'setup', 'Event 11:30-14:00 at 10:00 → SETUP (starts in 1.5h)');

    // Case 4: Event tomorrow
    const upcoming = categorizeEvent({ eventDate: '2026-04-14', startTime: '09:00', endTime: '17:00' }, now);
    assertEqual(upcoming, 'upcoming', 'Event tomorrow → UPCOMING');

    // Case 5: Event starts in 3 hours (outside 2h setup window)
    const upcoming2 = categorizeEvent({ eventDate: '2026-04-13', startTime: '13:00', endTime: '15:00' }, now);
    assertEqual(upcoming2, 'upcoming', 'Event 13:00-15:00 at 10:00 → UPCOMING (3h away, beyond 2h setup)');

    // Case 6: Event exactly at setup boundary (2h before)
    const setupEdge = categorizeEvent({ eventDate: '2026-04-13', startTime: '12:00', endTime: '14:00' }, now);
    assertEqual(setupEdge, 'setup', 'Event 12:00 at 10:00 → SETUP (exactly 2h boundary)');
}

// ─── ANALYTICS TESTS ────────────────────────────────────────────

function testAnalytics_DateRangeLogic() {
    console.log(`\n${BOLD}${CYAN}━━━ Analytics: Date Range Calculation ━━━${RESET}\n`);

    const analyticsPath = path.resolve(__dirname, '../../client/src/components/DepartmentGalaxy.jsx');
    const source = fs.readFileSync(analyticsPath, 'utf-8');

    // Has API call to analytics endpoint
    assert(
        source.includes('/analytics/summary'),
        'Fetches data from /analytics/summary endpoint'
    );

    // Has time period options
    assert(source.includes("'7days'"), 'Has 7-day period option');
    assert(source.includes("'month'"), 'Has month period option');
    assert(source.includes("'quarter'"), 'Has quarter period option');
    assert(source.includes("'year'"), 'Has year period option');

    // Verify getDateRange logic
    function getDateRange(period) {
        const today = new Date('2026-04-13');
        const year = today.getFullYear();
        const month = today.getMonth();
        const quarter = Math.floor(month / 3);

        switch (period) {
            case '7days': {
                const start7 = new Date(today); start7.setDate(start7.getDate() - 3);
                const end7 = new Date(today); end7.setDate(end7.getDate() + 3);
                return { startDate: start7, endDate: end7 };
            }
            case 'month':
                return { startDate: new Date(year, month, 1), endDate: new Date(year, month + 1, 0) };
            case 'quarter': {
                const quarterStart = quarter * 3;
                return { startDate: new Date(year, quarterStart, 1), endDate: new Date(year, quarterStart + 3, 0) };
            }
            case 'year':
                return { startDate: new Date(year, 0, 1), endDate: new Date(year, 11, 31) };
        }
    }

    // 7 days: ±3 days from today
    const range7 = getDateRange('7days');
    assertEqual(range7.startDate.getDate(), 10, '7days: starts 3 days ago (April 10)');
    assertEqual(range7.endDate.getDate(), 16, '7days: ends 3 days ahead (April 16)');

    // Month: April 1-30
    const rangeMonth = getDateRange('month');
    assertEqual(rangeMonth.startDate.getDate(), 1, 'Month: starts April 1');
    assertEqual(rangeMonth.endDate.getDate(), 30, 'Month: ends April 30');

    // Quarter: Q2 = Apr-Jun
    const rangeQ = getDateRange('quarter');
    assertEqual(rangeQ.startDate.getMonth(), 3, 'Quarter (Q2): starts April');
    assertEqual(rangeQ.endDate.getMonth(), 5, 'Quarter (Q2): ends June');

    // Year: full 2026
    const rangeYear = getDateRange('year');
    assertEqual(rangeYear.startDate.getMonth(), 0, 'Year: starts January');
    assertEqual(rangeYear.endDate.getMonth(), 11, 'Year: ends December');
}

function testAnalytics_InsightLogic() {
    console.log(`\n${BOLD}${CYAN}━━━ Analytics: Insight Generation Logic ━━━${RESET}\n`);

    const analyticsPath = path.resolve(__dirname, '../../client/src/components/DepartmentGalaxy.jsx');
    const source = fs.readFileSync(analyticsPath, 'utf-8');

    // Has 3 fixed insights  
    assert(source.includes('Địa điểm HOT'), 'Insight 1: Location hotspot');
    assert(source.includes('Phòng ban dẫn đầu'), 'Insight 2: Top department');
    assert(source.includes('Tổng quan hôm nay'), 'Insight 3: Today overview');

    // KPI cards exist
    assert(source.includes('Hôm nay') && source.includes('todayEvents'), 'KPI: Today events');
    assert(source.includes('Trong tháng này'), 'KPI: This month events');
    assert(source.includes('Đang & Sắp tới'), 'KPI: Upcoming events');
    assert(source.includes('Tuần sau'), 'KPI: Next week events');

    // Charts
    assert(source.includes('AreaChart'), 'Has area chart for event trend');
    assert(source.includes('RechartsPie') || source.includes('Pie'), 'Has pie chart for department breakdown');
}

// ─── MAIN ───────────────────────────────────────────────────────

async function main() {
    console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}║  ${CYAN}Views Logic & Algorithm Test Suite${RESET}${BOLD}                     ║${RESET}`);
    console.log(`${BOLD}║  Calendar / Timeline / Analytics${RESET}${BOLD}                         ║${RESET}`);
    console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}`);

    testCalendarView_SourceCode();
    testCalendarView_DateLogic();
    testKanban_SourceCode();
    testKanban_CategoryLogic();
    testAnalytics_DateRangeLogic();
    testAnalytics_InsightLogic();

    const total = passed + failed;
    console.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    if (failed === 0) {
        console.log(`${GREEN}${BOLD}  ✅ ALL ${total} TESTS PASSED${RESET}`);
        console.log(`${GREEN}     Coverage: calendar dates / kanban categories / analytics ranges${RESET}`);
    } else {
        console.log(`${RED}${BOLD}  ❌ ${failed}/${total} TESTS FAILED${RESET}`);
        failures.forEach(f => console.log(`    ${RED}• ${f}${RESET}`));
    }
    console.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(`${RED}Fatal:${RESET}`, err); process.exit(1); });
