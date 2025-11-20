/**
 * ARCHIVO DEPRECADO - MIGRADO A PAYPAL
 * Este archivo contiene código legacy de Stripe que ya no se usa.
 * Todas las funciones de pago ahora usan PayPal (ver controllers/paypal.ts)
 */

// import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

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

export const createPaymentIntentModel = async (
  items: any[],
  customerInfo: CustomerInfo
) => {
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
};
