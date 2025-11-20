import express from 'express';
import { createCheckoutSession, createPaymentIntent, handleWebhook } from '../controllers/Pagos';

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntent);
router.post("/webhook", 
  express.raw({type: 'application/json'}), 
  handleWebhook
);
router.post('/create-checkout-session', createCheckoutSession);
export default router;