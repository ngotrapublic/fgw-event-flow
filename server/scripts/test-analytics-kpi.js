/**
 * Test Analytics KPI by calling the LIVE API endpoint
 * Requires the server to be running on port 5000
 */

async function testViaAPI() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentYear = today.getFullYear();

    console.log('='.repeat(60));
    console.log(`  ANALYTICS KPI VERIFICATION — via Live API`);
    console.log(`  Date: ${todayStr}`);
    console.log('='.repeat(60));

    // Step 1: Login to get a token
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fpt.edu.vn', password: 'admin123' })
    });

    if (!loginRes.ok) {
        console.error('❌ Login failed:', loginRes.status, await loginRes.text());
        process.exit(1);
    }
    const { token } = await loginRes.json();
    console.log('✅ Authenticated');

    // Step 2: Call Analytics Summary
    const analyticsRes = await fetch(
        `http://localhost:5000/api/analytics/summary?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!analyticsRes.ok) {
        console.error('❌ Analytics API failed:', analyticsRes.status, await analyticsRes.text());
        process.exit(1);
    }
    const data = await analyticsRes.json();

    // Step 3: Call Calendar endpoint for this month to cross-check
    const monthStart = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${new Date(currentYear, today.getMonth() + 1, 0).getDate()}`;
    const calendarRes = await fetch(
        `http://localhost:5000/api/events/calendar?startDate=${monthStart}&endDate=${monthEnd}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const calendarEvents = await calendarRes.json();

    // Step 4: Cross-check with paginated events list  
    const listRes = await fetch(
        `http://localhost:5000/api/events?page=1&limit=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const listData = await listRes.json();

    // ------ ANALYSIS ------
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 API Response Analysis:`);
    console.log(`${'─'.repeat(60)}`);

    console.log(`\n🔢 totalEvents (unique, year): ${data.totalEvents}`);
    console.log(`🔢 eventsThisMonth:             ${data.eventsThisMonth}`);
    console.log(`🔢 eventsToday:                 ${data.eventsToday}`);
    console.log(`🔢 upcomingEvents:              ${data.upcomingEvents}`);
    console.log(`🔢 eventsNextWeek:              ${data.eventsNextWeek}`);
    console.log(`🔢 monthlyTrend:                ${data.monthlyTrend}%`);

    // Cross-check: Calendar docs this month
    console.log(`\n📅 Calendar endpoint returned ${calendarEvents.length} docs for ${monthStart} → ${monthEnd}`);
    const calendarGroupIds = new Set();
    calendarEvents.forEach(e => calendarGroupIds.add(e.groupId || e.id));
    console.log(`   ↳ Unique events (by groupId): ${calendarGroupIds.size}`);

    // Cross-check: Today's events from calendar endpoint
    const todayCalendarDocs = calendarEvents.filter(e => e.eventDate === todayStr);
    const todayCalendarGroups = new Set();
    todayCalendarDocs.forEach(e => todayCalendarGroups.add(e.groupId || e.id));
    console.log(`\n🔍 Cross-check "Hôm nay":`);
    console.log(`   API says eventsToday = ${data.eventsToday}`);
    console.log(`   Calendar docs for today: ${todayCalendarDocs.length} docs → ${todayCalendarGroups.size} unique events`);
    todayCalendarGroups.forEach(gid => {
        const ev = todayCalendarDocs.find(e => (e.groupId || e.id) === gid);
        console.log(`     • ${ev?.eventName || 'Unknown'} [${ev?.eventDate}]`);
    });
    const todayMatch = data.eventsToday === todayCalendarGroups.size;
    console.log(`   ${todayMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

    // Cross-check: This month events
    console.log(`\n🔍 Cross-check "Trong tháng này":`);
    console.log(`   API says eventsThisMonth = ${data.eventsThisMonth}`);
    console.log(`   Calendar unique groups this month: ${calendarGroupIds.size}`);
    const monthMatch = data.eventsThisMonth === calendarGroupIds.size;
    console.log(`   ${monthMatch ? '✅ MATCH' : '❌ MISMATCH — API uses year-range unique dedup, calendar fetches full month docs'}`);

    // Cross-check: List total vs analytics total
    console.log(`\n🔍 Cross-check "Tổng sự kiện":`);
    console.log(`   Analytics totalEvents: ${data.totalEvents}`);
    console.log(`   List API totalCount:   ${listData.total || listData.totalCount || 'N/A'}`);

    // Print byDepartment breakdown
    console.log(`\n📊 Department breakdown:`);
    (data.byDepartment || []).forEach(d => {
        console.log(`   • ${d.name}: ${d.count} events (${d.percent}%)`);
    });

    // Print locations usage
    console.log(`\n📍 Top Locations:`);
    (data.byLocation || []).slice(0, 5).forEach(l => {
        console.log(`   • ${l.name}: ${l.count} events (${l.percent}%)`);
    });

    // Summary table
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  KPI VERIFICATION RESULTS`);
    console.log(`  ┌──────────────────────┬─────────┬──────────┐`);
    console.log(`  │ Metric               │ Value   │ Status   │`);
    console.log(`  ├──────────────────────┼─────────┼──────────┤`);
    console.log(`  │ Hôm nay (LIVE)       │ ${String(data.eventsToday).padStart(7)} │ ${todayMatch ? '  ✅    ' : '  ❌    '} │`);
    console.log(`  │ Trong tháng này      │ ${String(data.eventsThisMonth).padStart(7)} │   ──     │`);
    console.log(`  │ Đang & Sắp tới      │ ${String(data.upcomingEvents).padStart(7)} │   ──     │`);
    console.log(`  │ Tuần sau             │ ${String(data.eventsNextWeek).padStart(7)} │   ──     │`);
    console.log(`  │ Trend                │ ${String(data.monthlyTrend + '%').padStart(7)} │   ──     │`);
    console.log(`  └──────────────────────┴─────────┴──────────┘`);
    console.log(`${'='.repeat(60)}`);
}

testViaAPI().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
