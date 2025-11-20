import express from 'express';
import { 
  createOrder, 
  captureOrder, 
  cancelPayment,
  verifyPaymentToken 
} from '../controllers/paypal';

const router = express.Router();

/**
 * POST /api/paypal/create-order
 * Crea una nueva orden de pago en PayPal
 */
router.post('/create-order', createOrder);

/**
 * GET /api/paypal/capture-order
 * Captura el pago después de la aprobación del usuario
 * Query params: token (orden ID de PayPal)
 */
router.get('/capture-order', captureOrder);

/**
 * GET /api/paypal/cancel
 * Maneja la cancelación del pago
 */
router.get('/cancel', cancelPayment);

/**
 * POST /api/paypal/verify-token
 * Verifica el token JWT del pago
 * Body: { token: string }
 */
router.post('/verify-token', verifyPaymentToken);

export default router;
