const express = require('express');
const router = express.Router();
const depositoController = require('../controllers/depositos');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, depositoController.createDeposito);
router.get('/', authMiddleware, depositoController.getDepositos);
router.delete('/:id', authMiddleware, depositoController.deleteDeposito);
router.post('/mover-stock', authMiddleware, depositoController.moverStock);

module.exports = router;