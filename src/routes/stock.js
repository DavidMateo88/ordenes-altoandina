const express = require('express');
const router = express.Router();
const { getStock } = require('../controllers/stock');

router.get('/', getStock);

module.exports = router;