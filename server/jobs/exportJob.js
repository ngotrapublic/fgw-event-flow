const fs = require('fs');
const path = require('path');
const { eventsCollection, resourcesCollection, db } = require('../config/firebase');

async function run() {
    console.log('[Nightly Export] Starting CSV generation...');
    try {
        // [OPTIMIZATION] Only fetch current year events instead of entire collection
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;

        const [eventsSnapshot, resourcesSnapshot] = await Promise.all([
            eventsCollection
                .where('eventDate', '>=', yearStart)
                .where('eventDate', '<=', yearEnd)
                .get(),
            resourcesCollection.get()
        ]);

        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // [METADATA COUNTER] Tally and fix global unique event count
        // We use the entire collection's isUniqueEvent flag for an accurate global total
        const totalUniqueSnapshot = await eventsCollection.where('isUniqueEvent', '==', true).get();
        const uniqueCount = totalUniqueSnapshot.size;
        
        await db.collection('metadata').doc('stats').set({ totalUniqueEvents: uniqueCount }, { merge: true });
        console.log(`[Nightly Export] Re-verified Global Counter: ${uniqueCount} actual events.`);

        // Create Resource Map (ID -> Label)
        const resourceMap = {};
        if (!resourcesSnapshot.empty) {
            resourcesSnapshot.forEach(doc => {
                const data = doc.data();
                resourceMap[doc.id] = data.label || data.name || doc.id;
            });
        }

        // Headers
        const headers = ['STT', 'THỨ', 'NGÀY', 'THỜI GIAN', 'TÊN SỰ KIỆN', 'ĐỊA ĐIỂM TỔ CHỨC', 'PHỤ TRÁCH', 'CSVC CẦN SỬ DỤNG', 'GHI CHÚ'];

        let csvContent = headers.join(',') + '\n';

        // Helper: Convert YYYY-MM-DD to DD/MM/YYYY
        const formatDate = (isoDate) => {
            if (!isoDate || typeof isoDate !== 'string') return '';
            try {
                const parts = isoDate.split('-');
                if (parts.length !== 3) return isoDate;
                const [y, m, d] = parts;
                return `${d}/${m}/${y}`;
            } catch (e) { return isoDate; }
        };

        // Helper: Get Day of Week
        const getDayOfWeek = (isoDate) => {
            if (!isoDate) return '';
            try {
                const date = new Date(isoDate);
                const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                return days[date.getDay()] || '';
            } catch (e) { return ''; }
        };

        // GROUPING LOGIC (For Management Report)
        const groupedEventsMap = {};
        const groupedEventsList = [];

        events.forEach(e => {
            if (e.groupId) {
                if (!groupedEventsMap[e.groupId]) {
                    const copy = { ...e, startDateMap: e.eventDate, endDateMap: e.eventDate };
                    groupedEventsMap[e.groupId] = copy;
                    groupedEventsList.push(copy);
                } else {
                    const existing = groupedEventsMap[e.groupId];
                    if (e.eventDate < existing.startDateMap) existing.startDateMap = e.eventDate;
                    if (e.eventDate > existing.endDateMap) existing.endDateMap = e.eventDate;
                }
            } else {
                const copy = { ...e, startDateMap: e.eventDate, endDateMap: e.eventDate };
                groupedEventsList.push(copy);
            }
        });

        // Sort grouped events by Start Date then Time
        groupedEventsList.sort((a, b) => {
            if (a.startDateMap !== b.startDateMap) return a.startDateMap.localeCompare(b.startDateMap);
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        // Range Helpers
        const getDateRange = (event) => {
            if (event.startDateMap && event.endDateMap && event.startDateMap !== event.endDateMap) {
                return `${formatDate(event.startDateMap)} - ${formatDate(event.endDateMap)}`;
            }
            return formatDate(event.startDateMap);
        };

        const getDayOfWeekRange = (event) => {
            if (event.startDateMap && event.endDateMap && event.startDateMap !== event.endDateMap) {
                return `${getDayOfWeek(event.startDateMap)} - ${getDayOfWeek(event.endDateMap)}`;
            }
            return getDayOfWeek(event.startDateMap);
        };


        // Helper: Format Time
        const formatTime = (start, end) => {
            if (!start || !end) return '';
            try {
                const startHour = parseInt(start.split(':')[0]);
                if (isNaN(startHour)) return `${start} - ${end}`;

                let period = 'Sáng';
                if (startHour >= 12 && startHour < 18) period = 'Chiều';
                if (startHour >= 18) period = 'Tối';
                return `${period} (${start} - ${end})`;
            } catch (e) { return `${start} - ${end}`; }
        };

        // Helper: Format Resources
        const formatResources = (event) => {
            if (event.facilitiesChecklist && Object.keys(event.facilitiesChecklist).length > 0) {
                const locationMap = {};

                Object.entries(event.facilitiesChecklist).forEach(([key, value]) => {
                    if (value.checked) {
                        const name = resourceMap[key] || key;
                        const total = value.quantity || 0;

                        if (value.distribution && Object.keys(value.distribution).length > 0) {
                            Object.entries(value.distribution).forEach(([loc, qty]) => {
                                if (parseInt(qty) > 0) {
                                    if (!locationMap[loc]) locationMap[loc] = [];
                                    locationMap[loc].push(`${name} (${qty})`);
                                }
                            });
                        } else {
                            let targetLoc = 'Chung';
                            if (event.location && !Array.isArray(event.location)) {
                                targetLoc = event.location;
                            } else if (Array.isArray(event.location) && event.location.length === 1) {
                                targetLoc = event.location[0];
                            } else if (Array.isArray(event.location) && event.location.length > 1) {
                                targetLoc = event.location.join(', ');
                            }

                            if (!locationMap[targetLoc]) locationMap[targetLoc] = [];
                            locationMap[targetLoc].push(`${name} (${total})`);
                        }
                    }
                });

                const parts = [];
                Object.entries(locationMap).forEach(([loc, items]) => {
                    if (items.length > 0) {
                        parts.push(`${loc}:\n${items.join('; ')}`);
                    }
                });
                return parts.join('\n\n');
            }

            if (Array.isArray(event.resources)) {
                return event.resources.map(r => r.name || r).join('; ');
            }
            return event.facilitiesSummary || '';
        };

        // Escape CSV fields
        const escapeCsv = (str) => {
            if (!str) return '';
            const safeStr = String(str);
            if (/[,"\n]/.test(safeStr)) {
                return `"${safeStr.replace(/"/g, '""')}"`;
            }
            return safeStr;
        };

        groupedEventsList.forEach((event, index) => {
            const row = [
                index + 1,
                getDayOfWeekRange(event),
                getDateRange(event),
                formatTime(event.startTime, event.endTime),
                event.eventName,
                event.location,
                event.department,
                formatResources(event),
                event.notes || ''
            ];

            csvContent += row.map(escapeCsv).join(',') + '\n';
        });

        // Ensure directory exists
        const exportDir = path.join(__dirname, '..', 'public', 'exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        // Write file with BOM
        const filePath = path.join(exportDir, 'events_archive.csv');
        fs.writeFileSync(filePath, '\uFEFF' + csvContent, 'utf8');

        console.log(`[Nightly Export] Successfully generated ${filePath} with ${groupedEventsList.length} events grouped.`);

    } catch (error) {
        console.error('[Nightly Export] Job Error:', error);
    }
}

// Start Scheduler
let intervalId = null;

function start() {
    console.log('[Nightly Export] Scheduler initialized.');
    
    // Run immediately once on startup so the file exists for the user to download!
    run();

    // Schedule to run every 24 hours (86400000 ms)
    intervalId = setInterval(run, 24 * 60 * 60 * 1000);
}

function stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

module.exports = { start, stop, run };
