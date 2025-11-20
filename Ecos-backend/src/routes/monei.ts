import { Router } from "express";
const router = Router();
const paymentController = require('../controllers/monei');

// Crear un nuevo pago
router.post('/api/payments', paymentController.createPayment);

// Obtener información de un pago
router.get('/:paymentId', paymentController.getPayment);

// Callback de MONEI
router.post('/callback', paymentController.handleCallback);

// Confirmar un pago
router.post('/:paymentId/confirm', paymentController.confirmPayment);

// Cancelar un pago
router.post('/:paymentId/cancel', paymentController.cancelPayment);

export default router;