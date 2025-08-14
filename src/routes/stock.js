const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock');
const authMiddleware = require('../middleware/auth');

router.get('/productos', authMiddleware, stockController.getProductos);
router.get('/deposito/:depositoId', authMiddleware, stockController.getStockByDeposito);

module.exports = router;