const express = require('express');
const router = express.Router();
const { getDepositos, createDeposito, deleteDeposito, moveStock } = require('../controllers/depositos');

router.get('/', getDepositos);
router.post('/', createDeposito);
router.delete('/:id', deleteDeposito);
router.post('/mover-stock', moveStock);

module.exports = router;