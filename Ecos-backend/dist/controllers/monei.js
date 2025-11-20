"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { Monei } = require("@monei-js/node-sdk");
const monei = new Monei(process.env.MONEI_API_KEY);
class PaymentController {
    // Crear un nuevo pago
    createPayment(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { amount, currency = "EUR", orderId, description, customer, } = req.body;
                // Validación básica
                if (!amount || !orderId || !(customer === null || customer === void 0 ? void 0 : customer.email)) {
                    return res.status(400).json({
                        error: "Missing required fields: amount, orderId, and customer.email",
                    });
                }
                const paymentData = {
                    amount: Math.round(amount * 100),
                    currency,
                    orderId,
                    description: description || `Order #${orderId}`,
                    customer: {
                        email: customer.email,
                        name: customer.name,
                        phone: customer.phone,
                    },
                    // URLs de retorno
                    completeUrl: "http://localhost:4200/horoscope?status=succeeded",
                    cancelUrl: "http://localhost:4200/horoscope?status=canceled",
                    failUrl: "http://localhost:4200/horoscope?status=failed",
                };
                const payment = yield monei.payments.create(paymentData);
                res.json({
                    success: true,
                    payment: {
                        id: payment.id,
                        amount: payment.amount,
                        currency: payment.currency,
                        status: payment.status,
                        nextAction: payment.nextAction,
                    },
                });
            }
            catch (error) {
                console.error("Error creating payment:", error);
                next(error);
            }
        });
    }
    // Obtener información de un pago
    getPayment(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { paymentId } = req.params;
                if (!paymentId) {
                    return res.status(400).json({
                        error: "Payment ID is required",
                    });
                }
                const payment = yield monei.payments.get(paymentId);
                res.json({
                    success: true,
                    payment: {
                        id: payment.id,
                        amount: payment.amount,
                        currency: payment.currency,
                        status: payment.status,
                        orderId: payment.orderId,
                        createdAt: payment.createdAt,
                        updatedAt: payment.updatedAt,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Manejar callback de MONEI
    handleCallback(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const callbackData = req.body;
                console.log("Received callback:", callbackData);
                // Aquí puedes procesar el callback según tu lógica de negocio
                // Por ejemplo, actualizar el estado del pedido en tu base de datos
                switch (callbackData.status) {
                    case "SUCCEEDED":
                        // Pago exitoso
                        yield this.handleSuccessfulPayment(callbackData);
                        break;
                    case "FAILED":
                        // Pago fallido
                        yield this.handleFailedPayment(callbackData);
                        break;
                    case "CANCELED":
                        // Pago cancelado
                        yield this.handleCanceledPayment(callbackData);
                        break;
                    default:
                        console.log("Unknown payment status:", callbackData.status);
                }
                res.status(200).json({ received: true });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Confirmar un pago
    confirmPayment(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { paymentId } = req.params;
                const { amount } = req.body;
                const payment = yield monei.payments.confirm(paymentId, {
                    amount: amount ? Math.round(amount * 100) : undefined,
                });
                res.json({
                    success: true,
                    payment: {
                        id: payment.id,
                        status: payment.status,
                        amount: payment.amount,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Cancelar un pago
    cancelPayment(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { paymentId } = req.params;
                const { cancellationReason } = req.body;
                const payment = yield monei.payments.cancel(paymentId, {
                    cancellationReason,
                });
                res.json({
                    success: true,
                    payment: {
                        id: payment.id,
                        status: payment.status,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Métodos auxiliares para manejar diferentes estados de pago
    handleSuccessfulPayment(callbackData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementa tu lógica para pagos exitosos
            console.log("Payment successful:", callbackData.id);
            // Actualizar base de datos, enviar email de confirmación, etc.
        });
    }
    handleFailedPayment(callbackData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementa tu lógica para pagos fallidos
            console.log("Payment failed:", callbackData.id);
            // Notificar al usuario, registrar en logs, etc.
        });
    }
    handleCanceledPayment(callbackData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementa tu lógica para pagos cancelados
            console.log("Payment canceled:", callbackData.id);
            // Liberar stock, notificar al usuario, etc.
        });
    }
}
module.exports = new PaymentController();
