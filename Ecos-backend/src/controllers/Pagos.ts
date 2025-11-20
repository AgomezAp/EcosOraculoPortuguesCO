/**
 * ARCHIVO DEPRECADO - MIGRADO A PAYPAL
 * Este controlador contiene código legacy de Stripe que ya no se usa.
 * Todas las funciones de pago ahora usan PayPal (ver controllers/paypal.ts)
 */

import dotenv from 'dotenv';
import express from 'express';
// import { createPaymentIntentModel } from "../models/Pagos";
import e, { Request, Response } from "express";
// import Stripe from 'stripe';

dotenv.config();


export const createPaymentIntent = async (req: Request, res: Response) => {
  return res.status(410).json({ 
    error: 'Este endpoint está deprecado. Use /api/paypal/create-order' 
  });
  
  /*
  // CÓDIGO STRIPE COMENTADO - USAR PAYPAL
  try {
    const { items, customerInfo } = req.body;
    console.log("Received items:", items);
    console.log("Customer info:", customerInfo);
    
    // Validar que los datos del cliente estén presentes
    if (!customerInfo || !customerInfo.email) {
      return res.status(400).send({
        error: 'Missing customer information. Email is required.'
      });
    }
    
    const paymentIntent = await createPaymentIntentModel(items, customerInfo);
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error details:", error);
    res.status(500).send({ error: 'An error occurred while creating the payment intent' });
  }
  */
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  return res.status(410).json({ 
    error: 'Este endpoint está deprecado. Use /api/paypal/create-order' 
  });
  
  /*
  // CÓDIGO STRIPE COMENTADO - USAR PAYPAL
  try {
    const { items } = req.body;
    const stripe = new Stripe(process.env.SECRET_KEY!);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name || 'Product',
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      // Esto solicita automáticamente los datos del cliente
      customer_creation: 'always',
      billing_address_collection: 'required', // Solicita nombre y dirección
      phone_number_collection: {
        enabled: true, // Solicita teléfono
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send({ error: 'Failed to create checkout session' });
  }
  */
};

export const handleWebhook = async (req: express.Request, res: express.Response) => {
  return res.status(410).json({ 
    error: 'Este endpoint está deprecado. Use PayPal webhooks' 
  });
  
  /*
  // CÓDIGO STRIPE COMENTADO - USAR PAYPAL
  const stripe = new Stripe(process.env.SECRET_KEY!);
  const signature = req.headers['stripe-signature'] as string;
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body, 
      signature, 
      process.env.WEBHOOK_SECRET!
    );
    
    // Handle successful payments
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      
      // Here you can update your database, send confirmation emails, etc.

    }else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment failed: ${paymentIntent.id}`);
      
      // Handle the failed payment, e.g., notify the user, log the error, etc.
    }
    
    res.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
  */
};