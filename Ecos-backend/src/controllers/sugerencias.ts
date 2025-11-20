import { Request, Response } from "express";
import { Sugerencia } from "../models/sugerencia";
import nodemailer from "nodemailer";

export class SugerenciasController {
  // Configurar transporter de email
  private static createEmailTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Enviar email con la sugerencia
  private static async enviarEmailSugerencia(
    sugerencia: string,
    ip: string,
    userAgent: string
  ) {
    try {
      const transporter = SugerenciasController.createEmailTransporter();

      const destinatario =
        process.env.EMAIL_SUGERENCIAS ||
        "agomez.desarrollo@andrespublicidadtg.com";

      const mailOptions = {
        from: `"Ecos del Oráculo - Sugerencias" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: "📝 Nueva Sugerencia Recibida - Ecos del Oráculo",
        html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
                            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                            .sugerencia-box { background-color: #f0f0f0; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
                            .info-row { padding: 10px 0; border-bottom: 1px solid #eee; }
                            .label { font-weight: bold; color: #667eea; }
                            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✨ Nueva Sugerencia Recibida ✨</h1>
                                <p>Un usuario ha enviado una sugerencia</p>
                            </div>
                            <div class="content">
                                <div class="sugerencia-box">
                                    <h3 style="margin-top: 0; color: #667eea;">💬 Contenido de la Sugerencia:</h3>
                                    <p style="font-size: 16px; margin: 15px 0;">${sugerencia}</p>
                                </div>
                            </div>
                            <div class="footer">
                                <p>Este correo fue enviado automáticamente desde el sistema de sugerencias de Ecos del Oráculo</p>
                                <p>© ${new Date().getFullYear()} Ecos del Oráculo - Todos los derechos reservados</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
        text: `
NUEVA SUGERENCIA RECIBIDA

Contenido: ${sugerencia}

Información adicional:
- Fecha: ${new Date().toLocaleString("es-ES")}
- IP: ${ip || "No disponible"}
- Navegador: ${userAgent || "No disponible"}

---
Este correo fue enviado automáticamente desde Ecos del Oráculo
                `,
      };

      await transporter.sendMail(mailOptions);
      console.log(
        "✅ Email de sugerencia enviado exitosamente a:",
        destinatario
      );
    } catch (error) {
      console.error("❌ Error al enviar email de sugerencia:", error);
      // No lanzamos el error para que la sugerencia se guarde aunque falle el email
    }
  }

  // Crear nueva sugerencia
  static async crearSugerencia(req: Request, res: Response) {
    try {
      const { sugerencia } = req.body;

      // Validaciones
      if (!sugerencia || sugerencia.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "La sugerencia no puede estar vacía",
        });
      }

      if (sugerencia.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "La sugerencia no puede exceder 1000 caracteres",
        });
      }

      const ip = req.ip || req.socket.remoteAddress || "Desconocida";
      const userAgent = req.get("User-Agent") || "Desconocido";

      // Crear sugerencia en la base de datos
      const nuevaSugerencia = await Sugerencia.create({
        sugerencia: sugerencia.trim(),
        ip,
        user_agent: userAgent,
      });

      // Enviar email de notificación (asíncrono, no bloqueante)
      SugerenciasController.enviarEmailSugerencia(
        sugerencia.trim(),
        ip,
        userAgent
      ).catch((err) => {
        console.error("Error en envío de email (no bloqueante):", err);
      });

      res.status(201).json({
        success: true,
        message: "¡Sugerencia enviada exitosamente!",
        data: {
          id: nuevaSugerencia.id,
          fecha: nuevaSugerencia.fecha,
        },
      });
    } catch (error) {
      console.error("Error al crear sugerencia:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  // Obtener todas las sugerencias (para admin)
  static async obtenerSugerencias(req: Request, res: Response) {
    try {
      const { estado, limit = 50, offset = 0 } = req.query;

      const whereCondition: any = {};
      if (estado) {
        whereCondition.estado = estado;
      }

      const sugerencias = await Sugerencia.findAndCountAll({
        where: whereCondition,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        order: [["fecha", "DESC"]],
      });

      res.json({
        success: true,
        data: sugerencias.rows,
        total: sugerencias.count,
        currentPage:
          Math.floor(parseInt(offset as string) / parseInt(limit as string)) +
          1,
        totalPages: Math.ceil(sugerencias.count / parseInt(limit as string)),
      });
    } catch (error) {
      console.error("Error al obtener sugerencias:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener sugerencias",
      });
    }
  }

  // Marcar sugerencia como leída
  static async marcarComoLeida(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sugerencia = await Sugerencia.findByPk(id);
      if (!sugerencia) {
        return res.status(404).json({
          success: false,
          message: "Sugerencia no encontrada",
        });
      }

      await sugerencia.update({ estado: "leida" });

      res.json({
        success: true,
        message: "Sugerencia marcada como leída",
      });
    } catch (error) {
      console.error("Error al actualizar sugerencia:", error);
      res.status(500).json({
        success: false,
        message: "Error al actualizar sugerencia",
      });
    }
  }
}
