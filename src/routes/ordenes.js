const express = require('express');
const router = express.Router();
const { createOrden, cotizarOrden, rejectOrden, approveOrden, updateOrden, uploadFactura, getOrdenes, getOrdenById, deleteOrden } = require('../controllers/ordenes');

router.post('/', createOrden);
router.put('/cotizar/:id', cotizarOrden);
router.put('/rechazar/:id', rejectOrden);
router.put('/aprobar/:id', approveOrden);
router.put('/:id', updateOrden);
router.put('/factura/:id', uploadFactura);
router.get('/', getOrdenes);
router.get('/:id', getOrdenById);
router.delete('/:id', deleteOrden); // Nueva ruta para eliminar órdenes

module.exports = router;