"use strict";
/**
 * ARCHIVO DEPRECADO - MIGRADO A PAYPAL
 * Este archivo contiene código legacy de Stripe que ya no se usa.
 * Todas las funciones de pago ahora usan PayPal (ver controllers/paypal.ts)
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntentModel = void 0;
// import Stripe from "stripe";
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/*
// CÓDIGO COMENTADO - MIGRADO A PAYPAL
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const calculateOrderAmount = (items: any[]) => {
  let total = 0;

  if (!items || !items.length) {
    console.log("Warning: Empty items array");
    return 1000; // Default amount in cents (e.g., $10.00)
  }

  items.forEach((item: any) => {
    if (item && typeof item.amount === "number") {
      total += item.amount;
    } else {
      console.log("Warning: Item without valid amount", item);
    }
  });

  // Ensure minimum amount (Stripe requires at least 50 cents in most currencies)
  return Math.max(total, 100);
};
*/
const createPaymentIntentModel = (items, customerInfo) => __awaiter(void 0, void 0, void 0, function* () {
    throw new Error('Este método está deprecado. Use el controlador PayPal en /api/paypal/create-order');
    /*
    // CÓDIGO STRIPE COMENTADO - USAR PAYPAL
    try {
      if (!stripe) {
        throw new Error('Stripe no está configurado. Este método está deprecado, use PayPal.');
      }
  
      // Crear o buscar un cliente en Stripe
      const customers = await stripe.customers.list({
        email: customerInfo.email,
        limit: 1,
      });
  
      let customer;
      if (customers.data.length > 0) {
        // Cliente existente
        customer = customers.data[0];
        // Actualizar información si es necesario
      } else {
        // Crear nuevo cliente
        customer = await stripe.customers.create({
          email: customerInfo.email,
        });
      }
  
      // Crear el PaymentIntent con la información del cliente
      return await stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "eur",
        customer: customer.id,
        payment_method_types: ["card"],
        metadata: {
          customerEmail: customerInfo.email,
        },
        receipt_email: customerInfo.email,
      });
    } catch (error) {
      console.error("Error creating payment intent with customer info:", error);
      throw error;
    }
    */
});
exports.createPaymentIntentModel = createPaymentIntentModel;
