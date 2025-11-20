// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import numerologyRoutes from "../routes/numerologia";
import vocationalRoutes from "../routes/mapa-vocacional";
import zodiacoRoutes from "../routes/zodiaco";
import interpretadorsueno from "../routes/interpretador-sueno";
import animalInteriorRoutes from "../routes/animal-interior";
import tablaNacimientoRoutes from "../routes/tabla-nacimiento";
import zodiacoChino from "../routes/zodiaco-chino";
import calculadoraAmor from "../routes/calculadora-amor";
import RPagos from "../routes/Pagos";
import RPaypal from "../routes/paypal";

import Recolecta from "../routes/recolecta";
import { recolecta } from "./recolecta-datos";
import { PageAnalytics } from "./page_views"; 
import { AnalyticsUsuario } from "./analytics_usuario";
import { ServicePopularity } from "./service_popularity";
import sugerencia from "../routes/sugerencia";
import RAnalytics from "../routes/analytics";
import { Sugerencia } from "./sugerencia";
// Cargar variables de entorno
dotenv.config();

class Server {
  private app: express.Application;
  private port: string;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || "3010";

    this.middlewares();
    this.routes();
  }

  async DBconnect() {
    try {
      await recolecta.sync({ alter: true });
      await PageAnalytics.sync({ alter: true });
      await AnalyticsUsuario.sync({ alter: true });
      await ServicePopularity.sync({ alter: true });
      await Sugerencia.sync({ alter: true });
      console.log("✅ Conexión a base de datos establecida correctamente");
    } catch (error) {
      console.error("❌ Error de conexión a la base de datos:", error);
    }
  }

  middlewares() {
    this.app.use(express.json());
    this.app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  routes() {
    this.app.use(interpretadorsueno);
    this.app.use(numerologyRoutes);
    this.app.use(vocationalRoutes);
    this.app.use(zodiacoRoutes);
    this.app.use(animalInteriorRoutes);
    this.app.use(tablaNacimientoRoutes);
    this.app.use(zodiacoChino);
    this.app.use(calculadoraAmor);
    this.app.use(RPagos);
    this.app.use("/api/paypal", RPaypal);
    this.app.use(Recolecta);
    this.app.use(RAnalytics)
    this.app.use(sugerencia);
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: " Chat API",
      });
    });

    // Error handling middleware
    this.app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        console.error("Error:", err);
        res.status(500).json({
          success: false,
          error: "Error interno del servidor",
          code: "INTERNAL_ERROR",
        });
      }
    );

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Endpoint no encontrado",
        code: "NOT_FOUND",
      });
    });
  }

  async listen() {
    // Conectar a la base de datos primero
    await this.DBconnect();

    // Luego iniciar el servidor
    this.app.listen(this.port, () => {
      console.log(`🚀 Servidor corriendo en puerto ${this.port}`);
      console.log(`📍 Health check: http://localhost:${this.port}/health`);
      console.log(`💬 Chat API: http://localhost:${this.port}/api/chat`);
      console.log(
        `🔢 Numerology API: http://localhost:${this.port}/api/numerology`
      );
      console.log(
        `🎯 Vocational API: http://localhost:${this.port}/api/vocational`
      );
      console.log(`- Zodíaco: http://localhost:${this.port}/api/zodiaco`);
      console.log(
        `🦅 Animal Interior API: http://localhost:${this.port}/api/animal-interior`
      );
      console.log(
        `Recolecta datos: http://localhost:${this.port}/api/recolecta`
      );
    });
  }

  getApp() {
    return this.app;
  }
}

// Crear e inicializar el servidor
const server = new Server();
server.listen().catch(console.error);

export default server.getApp();
