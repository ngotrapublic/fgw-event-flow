const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const { eventsCollection, db } = require('../config/firebase');
const cacheService = require('../services/cacheService');

/**
 * Get Available Resources (Helper)
 */
async function getResources() {
    const snap = await db.collection('resources').get();
    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Download Template
 * Returns a dynamic Excel file with Dropdowns and Smart Facilities column.
 */
exports.getTemplate = async (req, res, next) => {
    try {
        // [OPTIMIZATION] Use cache for template metadata (locations, departments, users, resources)
        const templateData = await cacheService.getOrFetch('import_template_data', async () => {
            const [locationsSnap, deptsSnap, usersSnap, resources] = await Promise.all([
                db.collection('locations').orderBy('name').get(),
                db.collection('departments').orderBy('name').get(),
                db.collection('users').get(),
                getResources()
            ]);
            return {
                locations: locationsSnap.docs.map(doc => doc.data().name).filter(Boolean),
                deptsSnap: deptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                usersSnap: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                resources
            };
        }, 60); // Cache for 60 minutes

        const { locations, deptsSnap: rawDepts, usersSnap: rawUsers, resources } = templateData;

        const departments = [];

        const deptMap = {};

        rawDepts.forEach(d => {
            deptMap[d.name] = new Set(d.emails || []);
            if (d.defaultEmail) deptMap[d.name].add(d.defaultEmail);
        });

        rawUsers.forEach(u => {
            if (u.department && deptMap[u.department]) {
                deptMap[u.department].add(u.email);
            }
        });

        for (const [name, emailSet] of Object.entries(deptMap)) {
            const emails = Array.from(emailSet).filter(Boolean);
            if (emails.length === 0) emails.push('no_email@domain.com');
            departments.push({ name, emails });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'System';

        const refSheet = workbook.addWorksheet('Reference');
        refSheet.state = 'veryHidden';
        // Protect the reference sheet with a password to prevent tampering
        await refSheet.protect('FGW_Event_Secret', {
            selectLockedCells: false,
            selectUnlockedCells: false
        });

        // Reference Sheet Mapping
        refSheet.getCell('A1').value = 'Locations';
        locations.forEach((loc, idx) => {
            refSheet.getCell(`A${idx + 2}`).value = loc;
        });

        refSheet.getCell('B1').value = 'Dept_Name';
        refSheet.getCell('C1').value = 'Range_Address';

        refSheet.getCell('D1').value = 'Available_Facilities';
        resources.forEach((res, idx) => {
            refSheet.getCell(`D${idx + 2}`).value = res.label || res.name;
        });

        let colIndex = 5;
        departments.forEach((dept, idx) => {
            const rowIdx = idx + 2;
            refSheet.getCell(`B${rowIdx}`).value = dept.name;

            let cleanName = dept.name
                .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9\s]/g, '');

            let abbr = cleanName.split(' ').map(w => w.charAt(0)).join('').toUpperCase();
            if (abbr.length < 2) abbr = 'DEPT';

            let sanitizedID = `List_${abbr}`;
            let counter = 1;
            while (departments.slice(0, idx).some(d => d.id === sanitizedID)) {
                sanitizedID = `List_${abbr}_${counter++}`;
            }
            dept.id = sanitizedID;

            const colLetter = refSheet.getColumn(colIndex).letter;
            dept.emails.forEach((email, eIdx) => {
                refSheet.getCell(`${colLetter}${eIdx + 2}`).value = email;
            });

            const literalRange = `'Reference'!$${colLetter}$2:$${colLetter}${dept.emails.length + 1}`;
            refSheet.getCell(`C${rowIdx}`).value = literalRange;
            colIndex++;
        });

        const sheet = workbook.addWorksheet('Template');

        sheet.columns = [
            { header: 'Ngày (DD/MM/YYYY)', key: 'date', width: 15 },
            { header: 'Đến ngày (Optional)', key: 'endDate', width: 20 },
            { header: 'Thời gian Bắt đầu (HH:MM)', key: 'start', width: 20 },
            { header: 'Thời gian Kết thúc (HH:MM)', key: 'end', width: 20 },
            { header: 'Tên sự kiện', key: 'name', width: 35 },
            { header: 'Địa điểm', key: 'location', width: 25 },
            { header: 'Bộ phận', key: 'department', width: 25 },
            { header: 'Người đăng ký', key: 'email', width: 30 },
            { header: 'Cơ sở vật chất & Dịch vụ', key: 'facilities', width: 45 },
            { header: 'Ghi chú', key: 'note', width: 40 }
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

        // 🟢 SAMPLE ROWS - Must be added BEFORE setting data validation to appear at the top
        sheet.addRow({
            date: '25/12/2025',
            endDate: '',
            start: '08:00',
            end: '11:00',
            name: 'Hội thảo Chào mừng Tân sinh viên',
            location: (locations && locations[0]) || 'Phòng hội thảo',
            department: (departments && departments[0] && departments[0].name) || 'Phòng Đào Tạo',
            email: (departments && departments[0] && departments[0].emails && departments[0].emails[0]) || 'sample@domain.com',
            facilities: 'Micro: 2, Máy chiếu: 1, Bàn: 5, Ghế: 50',
            note: 'Ví dụ về nhập nhiều thiết bị cùng lúc.'
        });

        sheet.addRow({
            date: '26/12/2025',
            endDate: '28/12/2025',
            start: '14:00',
            end: '16:00',
            name: 'Họp giao ban định kỳ (Chuỗi kiện)',
            location: (locations && locations[1]) || (locations && locations[0]) || 'Phòng họp',
            department: (departments && departments[1] && departments[1].name) || (departments && departments[0] && departments[0].name) || 'Ban Giám Hiệu',
            email: (departments && departments[1] && departments[1].emails && departments[1].emails[0]) || 'sample2@domain.com',
            facilities: 'Tivi: 1',
            note: 'Ví dụ về chuỗi sự kiện nhiều ngày.'
        });

        sheet.addRow({
            date: '27/12/2025',
            endDate: '',
            start: '09:00',
            end: '17:00',
            name: 'Kiểm tra CSVC định kỳ',
            location: (locations && locations[0]) || 'Sân trường',
            department: (departments && departments[0] && departments[0].name) || 'Logistics',
            email: (departments && departments[0] && departments[0].emails && departments[0].emails[0]) || 'sample3@domain.com',
            facilities: '',
            note: 'Có thể để trống CSVC nếu không sử dụng.'
        });

        // 🔵 DATA VALIDATION - Apply to existing rows and blank rows below
        const lastValRow = 1000;
        const locFormula = `'Reference'!$A$2:$A$${locations.length + 1}`;
        const deptFormula = `'Reference'!$B$2:$B$${departments.length + 1}`;

        for (let i = 2; i <= lastValRow; i++) {
            // Location
            sheet.getCell(`F${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [locFormula]
            };
            // Department
            sheet.getCell(`G${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [deptFormula]
            };
            // Email (Dependent)
            sheet.getCell(`H${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`INDIRECT(VLOOKUP(G${i},'Reference'!$B:$C,2,0))`]
            };
        }

        console.log(`📊 Exported: ${locations.length} loc, ${departments.length} depts. Samples at top.`);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Event_Import_Template_v4.xlsx"');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Template logic error:', error);
        next(error);
    }
};

/**
 * Import Events
 */
exports.importEvents = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        let targetSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'template') || workbook.SheetNames[0];
        if (targetSheetName.toLowerCase().startsWith('ref')) {
            targetSheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
        }

        const sheet = workbook.Sheets[targetSheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length < 2) return res.status(400).json({ message: 'Empty file' });

        // Safety guard: prevent mega-imports that could generate thousands of Firestore writes
        const MAX_ROWS = 200;
        const rows = data.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        if (rows.length > MAX_ROWS) {
            return res.status(400).json({
                message: `File contains ${rows.length} rows, which exceeds the maximum of ${MAX_ROWS} rows per import. Please split into smaller files.`
            });
        }

        const headers = data[0].map(h => String(h).trim().toLowerCase());

        const getIdxExact = (keys) => headers.findIndex(h => keys.some(k => h === k || h.startsWith(k)));
        const getIdxIncludes = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
        const getIdx = getIdxIncludes; // Re-alias for backward compatibility

        // Exact match for 'ngày' to avoid partially matching 'đến ngày'
        const idxDate = headers.findIndex(h => h.includes('ngày') && !h.includes('đến ngày') || h === 'date');
        const idxEndDate = getIdxIncludes(['đến ngày', 'end date']);
        const idxName = getIdx(['tên', 'name', 'event']);
        const idxDept = getIdx(['bộ phận', 'dept']);
        const idxStart = getIdx(['bắt đầu', 'start']);
        const idxEnd = getIdx(['kết thúc', 'end']);
        const idxLoc = getIdx(['địa điểm', 'location']);
        const idxEmail = getIdx(['email', 'người']);
        const idxFac = getIdx(['cơ sở vật chất', 'facilities', 'csvc']);
        const idxNote = getIdx(['ghi chú', 'note']);

        console.log(`[IMPORT] Headers found indices: Date=${idxDate}, EndDate=${idxEndDate}, Name=${idxName}, Dept=${idxDept}, Loc=${idxLoc}, Fac=${idxFac}`);

        if (idxDate === -1 || idxName === -1)
            return res.status(400).json({ message: 'Missing "Date" or "Event Name" columns' });

        const resources = await getResources();

        let batch = db.batch();
        let count = 0;
        let success = 0;
        let errors = [];

        console.log(`🚀 Starting import for ${rows.length} rows...`);

        const parseExcelDate = (val) => {
            if (!val) return null;
            let dStr = val;
            if (typeof dStr === 'number') {
                return new Date(Math.round((dStr - 25569) * 864e5)).toISOString().split('T')[0];
            } else if (typeof dStr === 'string') {
                const parts = dStr.trim().split(/[\/\-\.]/);
                if (parts.length === 3) {
                    const [d, m, y] = parts;
                    const fullYear = y.length === 2 ? `20${y}` : y;
                    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
            }
            return dStr;
        };

        const parseTime = (val) => {
            if (!val) return '07:00';
            if (typeof val === 'number') {
                const total = Math.round(val * 1440);
                const h = Math.floor(total / 60);
                const m = total % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
            return String(val);
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row[idxName] && !row[idxDate]) continue;

            try {
                let dateStr = parseExcelDate(row[idxDate]);
                let endDateStr = idxEndDate !== -1 ? parseExcelDate(row[idxEndDate]) : null;

                if (!dateStr) continue;

                let datesToCreate = [dateStr];
                let isSeries = false;

                if (endDateStr && new Date(endDateStr) > new Date(dateStr)) {
                    isSeries = true;
                    const ds = [];
                    let cd = new Date(dateStr);
                    let ed = new Date(endDateStr);
                    // Safe guard: max 30 days to prevent abuse
                    let limit = 0;
                    while (cd <= ed && limit < 30) {
                        // Push a copy of the formatted date string, not a reference to the mutating Date object
                        ds.push(new Date(cd).toISOString().split('T')[0]);
                        cd.setDate(cd.getDate() + 1);
                        limit++;
                    }
                    if (ds.length > 0) datesToCreate = ds;
                }

                const facilitiesChecklist = {};
                if (row[idxFac]) {
                    const rawItems = String(row[idxFac]).split(/[,;]/);
                    rawItems.forEach(itemStr => {
                        let parts = itemStr.split(':').map(s => s.trim());
                        let name = parts[0];
                        let qty = parts[1];
                        if (!name) return;

                        const match = resources.find(r =>
                            (r.label && r.label.toLowerCase() === name.toLowerCase()) ||
                            (r.name && r.name.toLowerCase() === name.toLowerCase())
                        );

                        if (match) {
                            facilitiesChecklist[match.id] = {
                                checked: true,
                                quantity: parseInt(qty) || 1
                            };
                        }
                    });
                }

                const groupId = isSeries ? require('crypto').randomUUID() : null;

                for (let d = 0; d < datesToCreate.length; d++) {
                    const targetDateStr = datesToCreate[d];
                    const isFirst = d === 0;

                    const newEvent = {
                        eventName: String(row[idxName]),
                        eventDate: targetDateStr,
                        startTime: parseTime(row[idxStart]),
                        endTime: parseTime(row[idxEnd]),
                        location: [String(row[idxLoc] || 'TBD')],
                        department: String(row[idxDept] || 'General'),
                        registrantEmail: String(row[idxEmail] || req.user?.email || 'admin@fpt.edu.vn'),
                        notes: String(row[idxNote] || ''),
                        facilitiesChecklist,
                        createdAt: new Date().toISOString(),
                        createdBy: req.user?.uid || 'import',
                        status: 'approved',
                        resources: [],
                        facilitiesSummary: '',
                        needsWelcomeNotification: isFirst, // Only send welcome true for the first event
                        remindersSent: { oneDay: false, oneHour: false }
                    };

                    if (isSeries) {
                        newEvent.groupId = groupId;
                        newEvent.isSeriesStart = isFirst;
                        newEvent.seriesEndDate = endDateStr;
                    }

                    batch.set(eventsCollection.doc(), newEvent);
                    count++;
                    success++;
                }

                if (count >= 400) {
                    await batch.commit();
                    batch = db.batch();
                    count = 0;
                }
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`[IMPORT] Final batch committed.`);
        }

        console.log(`✅ Import finished. Success: ${success}, Errors: ${errors.length}`);
        
        // [METADATA COUNTER] Update global unique count based on successfully imported logical events
        if (success > 0) {
            try {
                const admin = require('firebase-admin');
                const uniqueImportedCount = rows.length - errors.length; // Simplified: each row is a unique logical event (series or single)
                // Actually, for series we committed multiple docs but only 1 unique event at the UI level. 
                // In importEvents loop, 'success' counts individual docs. We need unique logical events (rows).
                const logicEventCount = rows.filter((r, i) => !errors.some(e => e.startsWith(`Row ${i + 2}`))).length;
                
                await db.collection('metadata').doc('stats').set({
                    totalUniqueEvents: admin.firestore.FieldValue.increment(logicEventCount)
                }, { merge: true });
                console.log(`[COUNTER] Incremented global count by ${logicEventCount}`);
            } catch (counterErr) {
                console.error('[IMPORT COUNTER] Failed to update:', counterErr.message);
            }
        }

        res.json({ message: `Imported ${success} events`, errors: errors.length ? errors : undefined });

    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/import/equipment-template
 */
exports.getEquipmentTemplate = async (req, res, next) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Vật dụng - Equipment');
        sheet.columns = [
            { header: 'Tên vật dụng (Item Name)', key: 'name', width: 30 },
            { header: 'Quy cách (Specification)', key: 'spec', width: 25 },
            { header: 'Số lượng (Quantity)', key: 'qty', width: 15 },
            { header: 'Ghi chú (Notes)', key: 'notes', width: 30 }
        ];
        sheet.addRow(['Màn hình LED P2', 'Bộ', 1, 'Lắp tại sảnh']);
        sheet.addRow(['Dây cáp HDMI', 'Cái', 5, 'Dài 10m']);
        sheet.addRow(['Nước suối', 'Thùng', 2, '24 chai/thùng']);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Equipment_Import_Template.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/import/personnel-template
 */
exports.getPersonnelTemplate = async (req, res, next) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Nhân sự - Personnel');
        sheet.columns = [
            { header: 'Họ và tên (Full Name)', key: 'name', width: 30 },
            { header: 'Số điện thoại (Phone)', key: 'phone', width: 20 },
            { header: 'CCCD/CMND (ID Card)', key: 'idCard', width: 25 }
        ];
        sheet.addRow(['Nguyễn Văn A', '0901234567', '012345678901']);
        sheet.addRow(['Trần Thị B', '0907654321', '012345678902']);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Personnel_Import_Template.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/import/parse-logistics
 * Parses an Excel and returns JSON for Equipment & Personnel
 */
exports.parseLogisticsExcel = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const { type } = req.query;
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        const result = {
            equipment: [],
            personnel: []
        };

        // Helper to find value in row by keyword
        const findVal = (row, keys) => {
            const foundKey = Object.keys(row).find(k => {
                const lowerK = k.toLowerCase();
                return keys.some(key => lowerK.includes(key.toLowerCase()));
            });
            return foundKey ? row[foundKey] : '';
        };

        // Parse Equipment if type is not personnel
        if (type !== 'personnel') {
            const eqSheetNames = workbook.SheetNames.filter(n =>
                n.toLowerCase().includes('vật dụng') ||
                n.toLowerCase().includes('equipment')
            );

            let eqSheetName;
            if (eqSheetNames.length > 0) {
                eqSheetName = eqSheetNames[0];
            } else if (workbook.SheetNames.length === 1 && type !== 'personnel') { // Assume first sheet if only one exists and type is not explicitly personnel
                eqSheetName = workbook.SheetNames[0];
            } else if (workbook.SheetNames.length > 1 && type !== 'personnel') { // Fallback to first sheet if multiple and not personnel
                eqSheetName = workbook.SheetNames[0];
            }

            const eqSheet = eqSheetName ? workbook.Sheets[eqSheetName] : null;

            if (eqSheet) {
                const eqData = xlsx.utils.sheet_to_json(eqSheet);
                result.equipment = eqData.map(row => ({
                    name: findVal(row, ['tên', 'name', 'item']),
                    specification: findVal(row, ['quy cách', 'spec']),
                    quantity: findVal(row, ['số lượng', 'qty', 'quantity']),
                    notes: findVal(row, ['ghi chú', 'note'])
                })).filter(item => item.name);
            }
        }

        // Parse Personnel if type is not equipment
        if (type !== 'equipment') {
            const perSheetNames = workbook.SheetNames.filter(n =>
                n.toLowerCase().includes('nhân sự') ||
                n.toLowerCase().includes('personnel')
            );

            let perSheetName;
            if (perSheetNames.length > 0) {
                perSheetName = perSheetNames[0];
            } else if (workbook.SheetNames.length === 1 && type === 'personnel') { // Assume first sheet if only one exists and type is explicitly personnel
                perSheetName = workbook.SheetNames[0];
            } else if (workbook.SheetNames.length > 1 && type !== 'equipment') { // Fallback to second sheet if multiple and not equipment
                perSheetName = workbook.SheetNames[1];
            }

            const perSheet = perSheetName ? workbook.Sheets[perSheetName] : null;

            if (perSheet) {
                const perData = xlsx.utils.sheet_to_json(perSheet);
                result.personnel = perData.map(row => ({
                    name: findVal(row, ['tên', 'name', 'họ tên']),
                    phone: findVal(row, ['sđt', 'phone', 'điện thoại']),
                    idCard: findVal(row, ['cccd', 'cmnd', 'id card', 'identity'])
                })).filter(p => p.name);
            }
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
};
