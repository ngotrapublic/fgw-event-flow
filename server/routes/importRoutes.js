const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const { verifyToken } = require('../middleware/authMiddleware');

// Configure Multer (Memory Storage with MIME type validation)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv',
            'application/octet-stream'
        ];
        const isExcelExt = file.originalname.match(/\.(xlsx|xls|csv)$/i);
        if (allowedMimes.includes(file.mimetype) || isExcelExt) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận các tệp tin Excel (.xlsx, .xls) hoặc CSV (.csv)!'), false);
        }
    }
});

// Protect routes
router.use(verifyToken);

// GET /api/import/template - Download Excel template
router.get('/template', importController.getTemplate);

// GET /api/import/equipment-template - Download Equipment template
router.get('/equipment-template', importController.getEquipmentTemplate);

// GET /api/import/personnel-template - Download Personnel template
router.get('/personnel-template', importController.getPersonnelTemplate);

// POST /api/import/events - Upload Excel file
router.post('/events', upload.single('file'), importController.importEvents);

// POST /api/import/parse-logistics - Parse Excel for logistics
router.post('/parse-logistics', upload.single('file'), importController.parseLogisticsExcel);

module.exports = router;
