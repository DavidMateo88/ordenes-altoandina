const express = require('express');
const router = express.Router();
const ordenController = require('../controllers/ordenes');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, ordenController.createOrden);
router.get('/', authMiddleware, ordenController.getOrdenes);
router.get('/proyectos', authMiddleware, ordenController.getProyectos);
router.get('/:id', authMiddleware, ordenController.getOrden);
router.put('/:id', authMiddleware, ordenController.updateOrden);
router.put('/cotizar/:id', authMiddleware, ordenController.cotizarOrden);
router.put('/aprobar/:id', authMiddleware, ordenController.aprobarOrden);
router.put('/rechazar/:id', authMiddleware, ordenController.rechazarOrden);
router.put('/factura/:id', authMiddleware, ordenController.cargarFacturas);
router.delete('/:id', authMiddleware, ordenController.deleteOrden);

module.exports = router;