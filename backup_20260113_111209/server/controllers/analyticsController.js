const { eventsCollection } = require('../config/firebase');

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

        // Default to current year if not specified
        const currentYear = today.getFullYear();
        const end = endDate || `${currentYear}-12-31`;
        const start = startDate || `${currentYear}-01-01`;

        // ===== QUERY 1: Analytics Events (filtered by date range) =====
        const analyticsSnapshot = await eventsCollection
            .where('eventDate', '>=', start)
            .where('eventDate', '<=', end)
            .limit(500)
            .get();

        const analyticsEvents = analyticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        // ===== ANALYTICS DATA (from filtered events) =====

        // 1. By Department
        const byDepartment = {};
        analyticsEvents.forEach(event => {
            let dept = event.department || 'Other';
            dept = dept.replace('Phòng ', '').replace('Ban ', '');
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        const sortedDepartments = Object.entries(byDepartment)
            .map(([name, count]) => ({
                name,
                count,
                percent: analyticsEvents.length > 0 ? Math.round((count / analyticsEvents.length) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // 2. Daily Trend (for Area Chart)
        const dailyTrend = {};
        analyticsEvents.forEach(event => {
            const key = event.eventDate;
            dailyTrend[key] = (dailyTrend[key] || 0) + 1;
        });

        const trendData = Object.entries(dailyTrend)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Heatmap Data (flat array of dates for current month)
        const heatmapData = [];
        const currentMonth = today.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = dailyTrend[dateStr] || 0;
            heatmapData.push({ date: dateStr, count });
        }

        // 4. Monthly Comparison (Trend Insight) - from filtered events
        const thisMonth = analyticsEvents.filter(e => {
            const d = new Date(e.eventDate);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }).length;

        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonth = analyticsEvents.filter(e => {
            const d = new Date(e.eventDate);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        }).length;

        const monthlyTrend = lastMonth > 0
            ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
            : (thisMonth > 0 ? 100 : 0);

        // 5. Upcoming Events Count (from filtered events that are in future)
        const upcomingInRange = analyticsEvents.filter(e => new Date(e.eventDate) >= today).length;

        // 6. Top Location (most used location)
        const byLocation = {};
        analyticsEvents.forEach(event => {
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
                percent: analyticsEvents.length > 0 ? Math.round((count / analyticsEvents.length) * 100) : 0
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
                    securityWatch.push({
                        contractor: pkg.contractorName,
                        event: event.eventName,
                        date: event.eventDate,
                        isToday: event.eventDate === todayStr
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

        const contactList = operationalEvents
            .filter(e => {
                const d = new Date(e.eventDate);
                return d >= today && d <= sevenDaysLater;
            })
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

        // ===== RESPONSE =====
        res.json({
            // Analytics data (filtered by date range)
            totalEvents: analyticsEvents.length,
            upcomingEvents: upcomingInRange,
            eventsThisMonth: thisMonth,
            monthlyTrend,
            byDepartment: sortedDepartments,
            trendData,
            heatmapData,
            topDepartment: sortedDepartments[0] || null,
            topLocation,

            // Operational data (always from upcoming 30 days, not affected by filter)
            securityStats: {
                totalToday: securityWatch.filter(s => s.isToday).length,
                watchList: securityWatch.slice(0, 6)
            },
            contactStats: contactList,

            // Metadata
            meta: {
                analyticsRange: { startDate: start, endDate: end },
                operationalRange: { startDate: todayStr, endDate: thirtyDaysStr },
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[analyticsController] Error:', error);
        next(error);
    }
};
