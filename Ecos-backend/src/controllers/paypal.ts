import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const {
  PAYPAL_API_CLIENT,
  PAYPAL_API_SECRET,
  PAYPAL_API,
  BACKEND_URL,
  FRONTEND_URL,
  JWT_SECRET_KEY,
} = process.env;

/**
 * Genera un token de acceso de PayPal
 */
const generateAccessToken = async (): Promise<string> => {
  console.log("🔐 Generando Access Token de PayPal...");
  console.log("  - PAYPAL_API:", PAYPAL_API);
  console.log("  - Client ID existe:", !!PAYPAL_API_CLIENT);
  console.log("  - Secret existe:", !!PAYPAL_API_SECRET);

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  try {
    const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: PAYPAL_API_CLIENT!,
        password: PAYPAL_API_SECRET!,
      },
    });

    console.log("✅ Access Token obtenido exitosamente");
    return response.data.access_token;
  } catch (error: any) {
    console.error("❌ Error obteniendo Access Token:");
    console.error("  - Status:", error.response?.status);
    console.error("  - Data:", error.response?.data);
    throw error;
  }
};

/**
 * Crea una orden de pago en PayPal
 */
export const createOrder = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Recibir información del servicio que solicita el pago
    const {
      amount = "4.00",
      currency = "EUR",
      serviceName = "Ecos del Oráculo",
      returnPath = "/payment-success", // Ruta específica del servicio
      cancelPath = "/payment-cancelled", // Ruta de cancelación del servicio
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
        landing_page: "GUEST_CHECKOUT",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${BACKEND_URL}/api/paypal/capture-order?service=${encodeURIComponent(
          returnPath
        )}`,
        cancel_url: `${FRONTEND_URL}${cancelPath}`,
      },
    };

    // Generar token de acceso
    const accessToken = await generateAccessToken();

    console.log("PayPal Access Token obtenido");
    console.log("Servicio:", serviceName);
    console.log(
      "Return URL:",
      `${BACKEND_URL}/api/paypal/capture-order?service=${encodeURIComponent(
        returnPath
      )}`
    );

    // Crear la orden en PayPal
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      order,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Orden de PayPal creada:", response.data);

    return res.json(response.data);
  } catch (error: any) {
    console.error(
      "Error al crear orden de PayPal:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      error: "Ocurrió un error al crear la orden de pago",
      details: error.response?.data || error.message,
    });
  }
};

/**
 * Captura el pago después de que el usuario apruebe la orden
 */
export const captureOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, service } = req.query;

  // Ruta por defecto si no se especifica
  const returnPath = service
    ? decodeURIComponent(service as string)
    : "/payment-success";

  if (!token || typeof token !== "string") {
    res.redirect(
      `${FRONTEND_URL}${returnPath}?status=ERROR&reason=missing_token`
    );
    return;
  }

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${token}/capture`,
      {},
      {
        auth: {
          username: PAYPAL_API_CLIENT!,
          password: PAYPAL_API_SECRET!,
        },
      }
    );

    console.log("Respuesta de captura de PayPal:", response.data);

    if (response.data.status === "COMPLETED") {
      // Generar token JWT para aprobar el pago
      const approvalToken = jwt.sign(
        {
          status: "approved",
          timestamp: Date.now(),
          orderId: token,
          paypalData: response.data,
        },
        JWT_SECRET_KEY!,
        { expiresIn: "5m" }
      );

      // Redirigir a la ruta específica del servicio
      res.redirect(
        `${FRONTEND_URL}${returnPath}?status=COMPLETED&token=${approvalToken}`
      );
    } else {
      // Generar token JWT para pago no completado
      const rejectToken = jwt.sign(
        {
          status: "not_approved",
          timestamp: Date.now(),
          orderId: token,
        },
        JWT_SECRET_KEY!,
        { expiresIn: "5m" }
      );

      res.redirect(
        `${FRONTEND_URL}${returnPath}?status=NOT_COMPLETED&token=${rejectToken}`
      );
    }
  } catch (error: any) {
    if (error.response) {
      console.error("Error de PayPal al capturar orden:", error.response.data);
      res.redirect(
        `${FRONTEND_URL}${returnPath}?status=ERROR&reason=paypal_error`
      );
    } else {
      console.error("Error desconocido al capturar orden:", error.message);
      res.redirect(`${FRONTEND_URL}${returnPath}?status=ERROR&reason=unknown`);
    }
  }
};

/**
 * Maneja la cancelación del pago
 */
export const cancelPayment = (req: Request, res: Response): void => {
  console.log("Pago cancelado por el usuario");
  res.redirect(`${FRONTEND_URL}/payment-cancelled`);
};

/**
 * Verifica el token JWT del pago
 */
export const verifyPaymentToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Token no proporcionado",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET_KEY!) as any;

    return res.json({
      valid: true,
      status: decoded.status,
      timestamp: decoded.timestamp,
      orderId: decoded.orderId,
    });
  } catch (error: any) {
    console.error("Error al verificar token:", error.message);
    return res.status(401).json({
      valid: false,
      error: "Token inválido o expirado",
    });
  }
};
