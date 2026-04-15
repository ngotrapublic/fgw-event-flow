const { eventsCollection } = require('../config/firebase');
const cacheService = require('../services/cacheService');

/**
 * Analytics Controller - Phase 3 Step 3B (Updated)
 * Provides pre-aggregated analytics data with separated operational queries.
 * 
 * Data separation:
 * - Analytics data (stats, charts): Filtered by date range parameter
 * - Operational data (security, upcoming, contacts): Always uses upcoming events (today -> +30 days)
 */

/**
 * GET /api/analytics/summary
 * Returns aggregated event statistics for the given date range.
 */
exports.getAnalyticsSummary = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Date format validation (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (startDate && !dateRegex.test(startDate)) {
            return res.status(400).json({
                error: 'Invalid startDate format. Expected YYYY-MM-DD (e.g., 2026-01-01)'
            });
        }
        if (endDate && !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid endDate format. Expected YYYY-MM-DD (e.g., 2026-12-31)'
            });
        }

        // Default to current year if not specified
        const currentYear = today.getFullYear();
        const end = endDate || `${currentYear}-12-31`;
        const start = startDate || `${currentYear}-01-01`;

        // Use cache with key based on date range (TTL 30 minutes, invalidated on event CRUD)
        const cacheKey = `analytics_${start}_${end}`;
        const result = await cacheService.getOrFetch(cacheKey, async () => {

        // ===== QUERY 1: Analytics Events (filtered by date range) =====
        const analyticsSnapshot = await eventsCollection
            .where('eventDate', '>=', start)
            .where('eventDate', '<=', end)
            .limit(500)
            .get();

        const allAnalyticsEvents = analyticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Deduplicate series for aggregate stats (totalEvents, byDepartment, equipment, etc.)
        // A 5-day series should count as 1 event, not 5.
        const uniqueEventsMap = new Map();
        allAnalyticsEvents.forEach(event => {
            const key = event.groupId || event.id;
            if (!uniqueEventsMap.has(key)) {
                uniqueEventsMap.set(key, event);
            }
        });
        const uniqueAnalyticsEvents = Array.from(uniqueEventsMap.values());

        // ===== QUERY 2: Operational Events (always upcoming 30 days) =====
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);
        const thirtyDaysStr = thirtyDaysLater.toISOString().split('T')[0];

        const operationalSnapshot = await eventsCollection
            .where('eventDate', '>=', todayStr)
            .where('eventDate', '<=', thirtyDaysStr)
            .limit(100)
            .get();

        const operationalEvents = operationalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // ===== ANALYTICS DATA =====
        // Use `uniqueAnalyticsEvents` for aggregate counts (total, department breakdown, equipment)
        // Use `allAnalyticsEvents` for per-day metrics (heatmap, daily trend chart)

        // 1. By Department (from unique events only)
        const byDepartment = {};
        uniqueAnalyticsEvents.forEach(event => {
            let dept = event.department || 'Other';
            dept = dept.replace('Phòng ', '').replace('Ban ', '');
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        const sortedDepartments = Object.entries(byDepartment)
            .map(([name, count]) => ({
                name,
                count,
                percent: uniqueAnalyticsEvents.length > 0 ? Math.round((count / uniqueAnalyticsEvents.length) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // 2. Daily Trend (for Area Chart) — uses ALL docs to show activity per day
        const dailyTrend = {};
        allAnalyticsEvents.forEach(event => {
            const key = event.eventDate;
            dailyTrend[key] = (dailyTrend[key] || 0) + 1;
        });

        const trendData = Object.entries(dailyTrend)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2.5 Monthly Trend Data (for Last 6 months Area Chart)
        const monthlyTrendMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyTrendMap[key] = new Set(); // store unique groups
        }
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
        const endOfThisMonthStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const trendSnapshot = await eventsCollection
            .where('eventDate', '>=', sixMonthsAgoStr)
            .where('eventDate', '<=', endOfThisMonthStr)
            .get();
        
        const trendDocs = trendSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        trendDocs.forEach(e => {
            const d = new Date(e.eventDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyTrendMap[key]) {
                monthlyTrendMap[key].add(e.groupId || e.id);
            }
        });

        const monthlyTrendData = Object.entries(monthlyTrendMap)
            .map(([month, groupSet]) => ({ month, count: groupSet.size }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // 3. Heatmap Data (flat array of dates for current month) — per-day including series days
        const heatmapData = [];
        const currentMonth = today.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = dailyTrend[dateStr] || 0;
            heatmapData.push({ date: dateStr, count });
        }

        // 4. Monthly Comparison (Trend Insight) — scan all docs then dedup
        const thisMonthGroups = new Set();
        allAnalyticsEvents.forEach(e => {
            const d = new Date(e.eventDate);
            if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
                thisMonthGroups.add(e.groupId || e.id);
            }
        });
        const thisMonth = thisMonthGroups.size;

        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthGroups = new Set();
        allAnalyticsEvents.forEach(e => {
            const d = new Date(e.eventDate);
            if (d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear()) {
                lastMonthGroups.add(e.groupId || e.id);
            }
        });
        const lastMonth = lastMonthGroups.size;

        const monthlyTrend = lastMonth > 0
            ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
            : (thisMonth > 0 ? 100 : 0);

        // 5. Upcoming Events Count (Đang & sắp tới) — events having any date >= today
        const upcomingGroups = new Set();
        allAnalyticsEvents.forEach(e => {
            if (e.eventDate >= todayStr) {
                upcomingGroups.add(e.groupId || e.id);
            }
        });
        const upcomingInRange = upcomingGroups.size;


        // 6. Top Location (most used location)
        const byLocation = {};
        uniqueAnalyticsEvents.forEach(event => {
            const locations = Array.isArray(event.location) ? event.location : [event.location || 'Chưa xác định'];
            locations.forEach(loc => {
                if (loc) {
                    byLocation[loc] = (byLocation[loc] || 0) + 1;
                }
            });
        });

        const sortedLocations = Object.entries(byLocation)
            .map(([name, count]) => ({
                name,
                count,
                percent: uniqueAnalyticsEvents.length > 0 ? Math.round((count / uniqueAnalyticsEvents.length) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        const topLocation = sortedLocations[0] || null;

        // ===== OPERATIONAL DATA (from upcoming 30 days query) =====

        // 6. Security Watch (Contractors from operational events)
        const securityWatch = [];
        operationalEvents.forEach(event => {
            const packages = event.contractorPackages || [];
            packages.forEach(pkg => {
                if (pkg.contractorName) {
                    // Use contractor's construction start date (ngày vào thi công)
                    const constructionDate = pkg.startDate || event.eventDate;
                    securityWatch.push({
                        contractor: pkg.contractorName,
                        event: event.eventName,
                        date: constructionDate,
                        isToday: constructionDate === todayStr
                    });
                }
            });
            // Legacy check
            if (event.contractorName && packages.length === 0) {
                securityWatch.push({
                    contractor: event.contractorName,
                    event: event.eventName,
                    date: event.eventDate,
                    isToday: event.eventDate === todayStr
                });
            }
        });

        // 7. Contact List (Upcoming 7 days from operational events)
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const uniqueContacts = new Map();
        operationalEvents
            .filter(e => {
                const d = new Date(e.eventDate);
                return d >= today && d <= sevenDaysLater;
            })
            .forEach(e => {
                const key = e.groupId || e.id;
                if (!uniqueContacts.has(key)) {
                    uniqueContacts.set(key, e);
                }
            });

        const contactList = Array.from(uniqueContacts.values())
            .map(e => ({
                id: e.id,
                eventName: e.eventName,
                eventDate: e.eventDate,
                department: e.department || 'Other',
                location: Array.isArray(e.location) ? e.location.join(', ') : (e.location || 'TBD'),
                registrant: e.registrantEmail || 'N/A',
                time: `${e.startTime || '00:00'} - ${e.endTime || '23:59'}`
            }))
            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
            .slice(0, 10);

        // Compute today's unique event count for KPI
        // Scan ALL docs (not deduplicated) to find groups active today, then deduplicate
        const todayGroups = new Set();
        operationalEvents.forEach(e => {
            if (e.eventDate === todayStr) {
                todayGroups.add(e.groupId || e.id);
            }
        });
        const todayCount = todayGroups.size;

        // Next week count (Mon-Sun of next week)
        const todayObj = new Date();
        const nextMonday = new Date(todayObj);
        nextMonday.setDate(todayObj.getDate() + (7 - todayObj.getDay() + 1) % 7 || 7);
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);
        const nextMondayStr = nextMonday.toISOString().split('T')[0];
        const nextSundayStr = nextSunday.toISOString().split('T')[0];
        const nextWeekGroups = new Set();
        operationalEvents.forEach(e => {
            if (e.eventDate >= nextMondayStr && e.eventDate <= nextSundayStr) {
                nextWeekGroups.add(e.groupId || e.id);
            }
        });
        const nextWeekCount = nextWeekGroups.size;

        // ===== RESPONSE =====
        return {
            // Analytics data (filtered by date range)
            totalEvents: uniqueAnalyticsEvents.length,
            upcomingEvents: upcomingInRange,
            eventsThisMonth: thisMonth,
            eventsToday: todayCount,
            eventsNextWeek: nextWeekCount,
            monthlyTrend,
            byDepartment: sortedDepartments,
            byLocation: sortedLocations,
            trendData,
            monthlyTrendData,
            heatmapData,
            topDepartment: sortedDepartments[0] || null,
            topLocation,

            // 7. Equipment Usage (Aggregation from facilitiesChecklist)
            equipmentUsage: (() => {
                const equipment = {};
                uniqueAnalyticsEvents.forEach(event => {
                    const checklist = event.facilitiesChecklist || {};
                    if (typeof checklist === 'object' && !Array.isArray(checklist)) {
                        Object.entries(checklist).forEach(([key, value]) => {
                            if (value && value.checked) {
                                const name = value.label || key;
                                const count = parseInt(value.quantity) || 1;
                                equipment[name] = (equipment[name] || 0) + count;
                            }
                        });
                    }
                });
                return Object.entries(equipment)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);
            })(),

            // 8. Hourly Peak Data (Aggregation by hour)
            hourlyDistribution: (() => {
                const hourMap = {};
                for (let i = 0; i < 24; i++) hourMap[i] = 0;
                uniqueAnalyticsEvents.forEach(event => {
                    if (event.startTime) {
                        const hour = parseInt(event.startTime.split(':')[0]);
                        if (!isNaN(hour)) hourMap[hour]++;
                    }
                });
                return Object.entries(hourMap).map(([hour, count]) => ({ hour: parseInt(hour), count }));
            })(),

            // Operational data (always from upcoming 30 days, not affected by filter)
            securityStats: {
                totalToday: securityWatch.filter(s => s.isToday).length,
                watchList: securityWatch.slice(0, 6)
            },
            contactStats: contactList,

            // 9. Dept Contacts (Static mapped to departments)
            deptContacts: [
                { dept: 'Tuyển Sinh', lead: 'Hồng Ngọc', email: 'ngoc.h@example.edu.vn', phone: '0901xxx123' },
                { dept: 'Đào Tạo', lead: 'Minh Tuấn', email: 'tuan.m@example.edu.vn', phone: '0901xxx456' },
                { dept: 'Công Tác Sinh Viên', lead: 'Thanh Hà', email: 'ha.t@example.edu.vn', phone: '0901xxx789' },
                { dept: 'Hành Chính', lead: 'Bảo Long', email: 'long.b@example.edu.vn', phone: '0901xxx000' }
            ],

            // Metadata
            meta: {
                analyticsRange: { startDate: start, endDate: end },
                operationalRange: { startDate: todayStr, endDate: thirtyDaysStr },
                generatedAt: new Date().toISOString()
            }
        };

        }, 30); // Cache for 30 minutes

        res.json(result);

    } catch (error) {
        console.error('[analyticsController] Error:', error);
        next(error);
    }
};
