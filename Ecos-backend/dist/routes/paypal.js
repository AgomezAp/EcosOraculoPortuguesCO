"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paypal_1 = require("../controllers/paypal");
const router = express_1.default.Router();
/**
 * POST /api/paypal/create-order
 * Crea una nueva orden de pago en PayPal
 */
router.post('/create-order', paypal_1.createOrder);
/**
 * GET /api/paypal/capture-order
 * Captura el pago después de la aprobación del usuario
 * Query params: token (orden ID de PayPal)
 */
router.get('/capture-order', paypal_1.captureOrder);
/**
 * GET /api/paypal/cancel
 * Maneja la cancelación del pago
 */
router.get('/cancel', paypal_1.cancelPayment);
/**
 * POST /api/paypal/verify-token
 * Verifica el token JWT del pago
 * Body: { token: string }
 */
router.post('/verify-token', paypal_1.verifyPaymentToken);
exports.default = router;
