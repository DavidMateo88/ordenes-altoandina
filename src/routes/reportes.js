const express = require('express');
const router = express.Router();
const { generateOrdenPDF, generateStockPDF } = require('../controllers/reportes');

router.get('/orden/:id', generateOrdenPDF);
router.get('/stock', generateStockPDF);

module.exports = router;