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
// src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const numerologia_1 = __importDefault(require("../routes/numerologia"));
const mapa_vocacional_1 = __importDefault(require("../routes/mapa-vocacional"));
const zodiaco_1 = __importDefault(require("../routes/zodiaco"));
const interpretador_sueno_1 = __importDefault(require("../routes/interpretador-sueno"));
const animal_interior_1 = __importDefault(require("../routes/animal-interior"));
const tabla_nacimiento_1 = __importDefault(require("../routes/tabla-nacimiento"));
const zodiaco_chino_1 = __importDefault(require("../routes/zodiaco-chino"));
const calculadora_amor_1 = __importDefault(require("../routes/calculadora-amor"));
const Pagos_1 = __importDefault(require("../routes/Pagos"));
const paypal_1 = __importDefault(require("../routes/paypal"));
const recolecta_1 = __importDefault(require("../routes/recolecta"));
const recolecta_datos_1 = require("./recolecta-datos");
const page_views_1 = require("./page_views");
const analytics_usuario_1 = require("./analytics_usuario");
const service_popularity_1 = require("./service_popularity");
const sugerencia_1 = __importDefault(require("../routes/sugerencia"));
const analytics_1 = __importDefault(require("../routes/analytics"));
const sugerencia_2 = require("./sugerencia");
// Cargar variables de entorno
dotenv_1.default.config();
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = process.env.PORT || "3010";
        this.middlewares();
        this.routes();
    }
    DBconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield recolecta_datos_1.recolecta.sync({ alter: true });
                yield page_views_1.PageAnalytics.sync({ alter: true });
                yield analytics_usuario_1.AnalyticsUsuario.sync({ alter: true });
                yield service_popularity_1.ServicePopularity.sync({ alter: true });
                yield sugerencia_2.Sugerencia.sync({ alter: true });
                console.log("✅ Conexión a base de datos establecida correctamente");
            }
            catch (error) {
                console.error("❌ Error de conexión a la base de datos:", error);
            }
        });
    }
    middlewares() {
        this.app.use(express_1.default.json());
        this.app.use((0, cors_1.default)({
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }));
        this.app.use(express_1.default.json({ limit: "10mb" }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    routes() {
        this.app.use(interpretador_sueno_1.default);
        this.app.use(numerologia_1.default);
        this.app.use(mapa_vocacional_1.default);
        this.app.use(zodiaco_1.default);
        this.app.use(animal_interior_1.default);
        this.app.use(tabla_nacimiento_1.default);
        this.app.use(zodiaco_chino_1.default);
        this.app.use(calculadora_amor_1.default);
        this.app.use(Pagos_1.default);
        this.app.use("/api/paypal", paypal_1.default);
        this.app.use(recolecta_1.default);
        this.app.use(analytics_1.default);
        this.app.use(sugerencia_1.default);
        // Health check endpoint
        this.app.get("/health", (req, res) => {
            res.json({
                status: "OK",
                timestamp: new Date().toISOString(),
                service: " Chat API",
            });
        });
        // Error handling middleware
        this.app.use((err, req, res, next) => {
            console.error("Error:", err);
            res.status(500).json({
                success: false,
                error: "Error interno del servidor",
                code: "INTERNAL_ERROR",
            });
        });
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: "Endpoint no encontrado",
                code: "NOT_FOUND",
            });
        });
    }
    listen() {
        return __awaiter(this, void 0, void 0, function* () {
            // Conectar a la base de datos primero
            yield this.DBconnect();
            // Luego iniciar el servidor
            this.app.listen(this.port, () => {
                console.log(`🚀 Servidor corriendo en puerto ${this.port}`);
                console.log(`📍 Health check: http://localhost:${this.port}/health`);
                console.log(`💬 Chat API: http://localhost:${this.port}/api/chat`);
                console.log(`🔢 Numerology API: http://localhost:${this.port}/api/numerology`);
                console.log(`🎯 Vocational API: http://localhost:${this.port}/api/vocational`);
                console.log(`- Zodíaco: http://localhost:${this.port}/api/zodiaco`);
                console.log(`🦅 Animal Interior API: http://localhost:${this.port}/api/animal-interior`);
                console.log(`Recolecta datos: http://localhost:${this.port}/api/recolecta`);
            });
        });
    }
    getApp() {
        return this.app;
    }
}
// Crear e inicializar el servidor
const server = new Server();
server.listen().catch(console.error);
exports.default = server.getApp();
