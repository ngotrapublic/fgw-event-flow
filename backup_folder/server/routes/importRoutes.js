const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const { verifyToken } = require('../middleware/authMiddleware');

// Configure Multer (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
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
