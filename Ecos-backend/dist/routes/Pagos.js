"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Pagos_1 = require("../controllers/Pagos");
const router = express_1.default.Router();
router.post("/create-payment-intent", Pagos_1.createPaymentIntent);
router.post("/webhook", express_1.default.raw({ type: 'application/json' }), Pagos_1.handleWebhook);
router.post('/create-checkout-session', Pagos_1.createCheckoutSession);
exports.default = router;
