const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes');
const authMiddleware = require('../middleware/auth');

router.get('/orden/:id', authMiddleware, reportesController.generateOrdenPDF);
router.get('/stock', authMiddleware, reportesController.generateStockPDF);

module.exports = router;