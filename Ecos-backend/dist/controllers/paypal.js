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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentToken = exports.cancelPayment = exports.captureOrder = exports.createOrder = void 0;
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { PAYPAL_API_CLIENT, PAYPAL_API_SECRET, PAYPAL_API, BACKEND_URL, FRONTEND_URL, JWT_SECRET_KEY } = process.env;
/**
 * Genera un token de acceso de PayPal
 */
const generateAccessToken = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log('🔐 Generando Access Token de PayPal...');
    console.log('  - PAYPAL_API:', PAYPAL_API);
    console.log('  - Client ID existe:', !!PAYPAL_API_CLIENT);
    console.log('  - Secret existe:', !!PAYPAL_API_SECRET);
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    try {
        const response = yield axios_1.default.post(`${PAYPAL_API}/v1/oauth2/token`, params, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            auth: {
                username: PAYPAL_API_CLIENT,
                password: PAYPAL_API_SECRET,
            },
        });
        console.log('✅ Access Token obtenido exitosamente');
        return response.data.access_token;
    }
    catch (error) {
        console.error('❌ Error obteniendo Access Token:');
        console.error('  - Status:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.status);
        console.error('  - Data:', (_b = error.response) === null || _b === void 0 ? void 0 : _b.data);
        throw error;
    }
});
/**
 * Crea una orden de pago en PayPal
 */
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Recibir información del servicio que solicita el pago
        const { amount = "5.00", currency = "USD", serviceName = "Ecos del Oráculo", returnPath = "/payment-success", // Ruta específica del servicio
        cancelPath = "/payment-cancelled" // Ruta de cancelación del servicio
         } = req.body;
        const order = {
            intent: "CAPTURE",
            purchase_units: [
                {
                    amount: {
                        currency_code: currency,
                        value: amount,
                    },
                    description: serviceName, // Descripción del servicio
                },
            ],
            application_context: {
                brand_name: "Ecos del Oráculo",
                landing_page: "NO_PREFERENCE",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: `${BACKEND_URL}/api/paypal/capture-order?service=${encodeURIComponent(returnPath)}`,
                cancel_url: `${FRONTEND_URL}${cancelPath}`,
            },
        };
        // Generar token de acceso
        const accessToken = yield generateAccessToken();
        console.log('PayPal Access Token obtenido');
        console.log('Servicio:', serviceName);
        console.log('Return URL:', `${BACKEND_URL}/api/paypal/capture-order?service=${encodeURIComponent(returnPath)}`);
        // Crear la orden en PayPal
        const response = yield axios_1.default.post(`${PAYPAL_API}/v2/checkout/orders`, order, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('Orden de PayPal creada:', response.data);
        return res.json(response.data);
    }
    catch (error) {
        console.error('Error al crear orden de PayPal:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return res.status(500).json({
            error: 'Ocurrió un error al crear la orden de pago',
            details: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message
        });
    }
});
exports.createOrder = createOrder;
/**
 * Captura el pago después de que el usuario apruebe la orden
 */
const captureOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, service } = req.query;
    // Ruta por defecto si no se especifica
    const returnPath = service ? decodeURIComponent(service) : '/payment-success';
    if (!token || typeof token !== 'string') {
        res.redirect(`${FRONTEND_URL}${returnPath}?status=ERROR&reason=missing_token`);
        return;
    }
    try {
        const response = yield axios_1.default.post(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {}, {
            auth: {
                username: PAYPAL_API_CLIENT,
                password: PAYPAL_API_SECRET,
            },
        });
        console.log('Respuesta de captura de PayPal:', response.data);
        if (response.data.status === "COMPLETED") {
            // Generar token JWT para aprobar el pago
            const approvalToken = jsonwebtoken_1.default.sign({
                status: 'approved',
                timestamp: Date.now(),
                orderId: token,
                paypalData: response.data
            }, JWT_SECRET_KEY, { expiresIn: '5m' });
            // Redirigir a la ruta específica del servicio
            res.redirect(`${FRONTEND_URL}${returnPath}?status=COMPLETED&token=${approvalToken}`);
        }
        else {
            // Generar token JWT para pago no completado
            const rejectToken = jsonwebtoken_1.default.sign({
                status: 'not_approved',
                timestamp: Date.now(),
                orderId: token
            }, JWT_SECRET_KEY, { expiresIn: '5m' });
            res.redirect(`${FRONTEND_URL}${returnPath}?status=NOT_COMPLETED&token=${rejectToken}`);
        }
    }
    catch (error) {
        if (error.response) {
            console.error('Error de PayPal al capturar orden:', error.response.data);
            res.redirect(`${FRONTEND_URL}${returnPath}?status=ERROR&reason=paypal_error`);
        }
        else {
            console.error('Error desconocido al capturar orden:', error.message);
            res.redirect(`${FRONTEND_URL}${returnPath}?status=ERROR&reason=unknown`);
        }
    }
});
exports.captureOrder = captureOrder;
/**
 * Maneja la cancelación del pago
 */
const cancelPayment = (req, res) => {
    console.log('Pago cancelado por el usuario');
    res.redirect(`${FRONTEND_URL}/payment-cancelled`);
};
exports.cancelPayment = cancelPayment;
/**
 * Verifica el token JWT del pago
 */
const verifyPaymentToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                error: 'Token no proporcionado'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET_KEY);
        return res.json({
            valid: true,
            status: decoded.status,
            timestamp: decoded.timestamp,
            orderId: decoded.orderId
        });
    }
    catch (error) {
        console.error('Error al verificar token:', error.message);
        return res.status(401).json({
            valid: false,
            error: 'Token inválido o expirado'
        });
    }
});
exports.verifyPaymentToken = verifyPaymentToken;
