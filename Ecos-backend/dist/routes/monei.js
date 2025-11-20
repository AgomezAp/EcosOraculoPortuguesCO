"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
exports.default = router;
