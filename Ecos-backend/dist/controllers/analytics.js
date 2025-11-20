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
exports.getDashboardAnalytics = exports.getServiciosPopulares = exports.getAllPageAnalytics = exports.getAnalyticsUsuario = exports.getAllAnalyticsUsuarios = exports.recolectarAnalyticsBatch = exports.recolectarPageAnalytics = exports.recolectarAnalyticsUsuario = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
const analytics_usuario_1 = require("../models/analytics_usuario");
const page_views_1 = require("../models/page_views");
const service_popularity_1 = require("../models/service_popularity");
const recolectarAnalyticsUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { visitCount, visitedServices, userZodiacSign, sessionDuration, deviceInfo, timestamp, userId, serviceStats, lastVisit, browserInfo, } = req.body;
    try {
        console.log("📊 Recolectando analytics de usuario:", userId);
        // Buscar si ya existe el usuario
        const existingUser = yield analytics_usuario_1.AnalyticsUsuario.findOne({
            where: { user_id: userId },
        });
        let analyticsData;
        if (existingUser) {
            // Actualizar usuario existente
            analyticsData = yield existingUser.update({
                visit_count: visitCount,
                visited_services: visitedServices,
                user_zodiac_sign: userZodiacSign || existingUser.user_zodiac_sign,
                session_duration: sessionDuration,
                device_info: deviceInfo,
                browser_info: browserInfo,
                service_stats: serviceStats,
                last_visit: lastVisit,
            });
            console.log("✅ Usuario actualizado:", userId);
        }
        else {
            // Crear nuevo usuario
            analyticsData = yield analytics_usuario_1.AnalyticsUsuario.create({
                user_id: userId,
                visit_count: visitCount,
                visited_services: visitedServices,
                user_zodiac_sign: userZodiacSign,
                session_duration: sessionDuration,
                device_info: deviceInfo,
                browser_info: browserInfo,
                service_stats: serviceStats,
                last_visit: lastVisit,
            });
            console.log("✅ Nuevo usuario creado:", userId);
        }
        // Actualizar estadísticas de servicios si existen
        if (serviceStats && Object.keys(serviceStats).length > 0) {
            yield actualizarEstadisticasServicios(serviceStats);
        }
        res.status(201).json({
            success: true,
            data: analyticsData,
            message: "Analytics de usuario recolectados exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al recolectar analytics de usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al recolectar analytics de usuario",
            error: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.recolectarAnalyticsUsuario = recolectarAnalyticsUsuario;
// ✅ Recolectar datos de page analytics
const recolectarPageAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, userId, timestamp, referrer, sessionDuration } = req.body;
    try {
        console.log("📄 Recolectando page analytics:", page, "para usuario:", userId);
        const pageAnalytics = yield page_views_1.PageAnalytics.create({
            user_id: userId,
            page_route: page,
            referrer: referrer || "",
            session_duration: sessionDuration,
            timestamp: new Date(timestamp),
        });
        console.log("✅ Page analytics creado");
        res.status(201).json({
            success: true,
            data: pageAnalytics,
            message: "Page analytics recolectados exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al recolectar page analytics:", error);
        res.status(500).json({
            success: false,
            message: "Error al recolectar page analytics",
            error: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.recolectarPageAnalytics = recolectarPageAnalytics;
// ✅ Recolectar múltiples analytics en batch
const recolectarAnalyticsBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = req.body; // Array de objetos de analytics
    try {
        console.log("📦 Recolectando analytics en batch:", data.length, "registros");
        const resultados = [];
        for (const analyticsItem of data) {
            try {
                if (analyticsItem.type === "user") {
                    const userAnalytics = yield procesarAnalyticsUsuario(analyticsItem);
                    resultados.push({ success: true, type: "user", data: userAnalytics });
                }
                else if (analyticsItem.type === "page") {
                    const pageAnalytics = yield procesarPageAnalytics(analyticsItem);
                    resultados.push({ success: true, type: "page", data: pageAnalytics });
                }
            }
            catch (error) {
                resultados.push({
                    success: false,
                    type: analyticsItem.type || "unknown",
                    error: error instanceof Error ? error.message : "Error desconocido",
                });
            }
        }
        console.log("✅ Batch procesado:", resultados.length, "items");
        res.status(201).json({
            success: true,
            processed: resultados.length,
            results: resultados,
            message: "Analytics batch recolectados exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al recolectar analytics batch:", error);
        res.status(500).json({
            success: false,
            message: "Error al recolectar analytics batch",
            error: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.recolectarAnalyticsBatch = recolectarAnalyticsBatch;
// ✅ Obtener todos los analytics de usuarios
const getAllAnalyticsUsuarios = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📋 Obteniendo todos los analytics de usuarios...");
        const { page = 1, limit = 100, sortBy = "createdAt", order = "DESC", } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows: analytics } = yield analytics_usuario_1.AnalyticsUsuario.findAndCountAll({
            attributes: {
                exclude: [],
            },
            order: [[sortBy, order]],
            limit: Number(limit),
            offset: offset,
        });
        console.log(`✅ Se encontraron ${count} registros de analytics`);
        res.status(200).json({
            success: true,
            count: count,
            totalPages: Math.ceil(count / Number(limit)),
            currentPage: Number(page),
            data: analytics,
            message: "Analytics de usuarios obtenidos exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al obtener analytics de usuarios:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener analytics de usuarios",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.getAllAnalyticsUsuarios = getAllAnalyticsUsuarios;
const getAnalyticsUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        console.log("🔍 Obteniendo analytics del usuario:", userId);
        const analytics = yield analytics_usuario_1.AnalyticsUsuario.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: page_views_1.PageAnalytics,
                    as: "pageViews",
                    order: [["timestamp", "DESC"]],
                    limit: 50,
                },
            ],
        });
        if (!analytics) {
            res.status(404).json({
                success: false,
                message: "Usuario no encontrado",
                code: "USER_NOT_FOUND",
            });
            return; // 👈 Mover el return DESPUÉS del res, sin devolver nada
        }
        console.log(`✅ Analytics encontrados para usuario: ${userId}`);
        res.status(200).json({
            success: true,
            data: analytics,
            message: "Analytics del usuario obtenidos exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al obtener analytics del usuario:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener analytics del usuario",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.getAnalyticsUsuario = getAnalyticsUsuario;
// ✅ Obtener todos los page analytics
const getAllPageAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📄 Obteniendo todos los page analytics...");
        const { page = 1, limit = 100, userId, pageRoute } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Construir filtros dinámicos
        const whereClause = {};
        if (userId)
            whereClause.user_id = userId;
        if (pageRoute)
            whereClause.page_route = { [sequelize_1.Op.like]: `%${pageRoute}%` };
        const { count, rows: pageAnalytics } = yield page_views_1.PageAnalytics.findAndCountAll({
            where: whereClause,
            order: [["timestamp", "DESC"]],
            limit: Number(limit),
            offset: offset,
            include: [
                {
                    model: analytics_usuario_1.AnalyticsUsuario,
                    as: "user",
                    attributes: ["user_id", "user_zodiac_sign", "visit_count"],
                },
            ],
        });
        console.log(`✅ Se encontraron ${count} registros de page analytics`);
        res.status(200).json({
            success: true,
            count: count,
            totalPages: Math.ceil(count / Number(limit)),
            currentPage: Number(page),
            data: pageAnalytics,
            message: "Page analytics obtenidos exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al obtener page analytics:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener page analytics",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.getAllPageAnalytics = getAllPageAnalytics;
// ✅ Obtener estadísticas de servicios populares
const getServiciosPopulares = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("🔥 Obteniendo servicios populares...");
        const { dias = 30, limit = 10 } = req.query;
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - Number(dias));
        const serviciosPopulares = yield service_popularity_1.ServicePopularity.findAll({
            attributes: [
                "service_name",
                [connection_1.default.fn("SUM", connection_1.default.col("visit_count")), "total_visits"],
                [connection_1.default.fn("COUNT", connection_1.default.col("date")), "days_active"],
            ],
            where: {
                date: {
                    [sequelize_1.Op.gte]: fechaInicio,
                },
            },
            group: ["service_name"],
            order: [[connection_1.default.fn("SUM", connection_1.default.col("visit_count")), "DESC"]],
            limit: Number(limit),
            raw: true,
        });
        console.log(`✅ Se encontraron ${serviciosPopulares.length} servicios populares`);
        res.status(200).json({
            success: true,
            period: `${dias} días`,
            count: serviciosPopulares.length,
            data: serviciosPopulares,
            message: "Servicios populares obtenidos exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al obtener servicios populares:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener servicios populares",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.getServiciosPopulares = getServiciosPopulares;
// ✅ Obtener dashboard completo
const getDashboardAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📊 Generando dashboard de analytics...");
        const { dias = 30 } = req.query;
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - Number(dias));
        // Estadísticas generales
        const estadisticasGenerales = yield analytics_usuario_1.AnalyticsUsuario.findAll({
            attributes: [
                [
                    connection_1.default.fn("COUNT", connection_1.default.fn("DISTINCT", connection_1.default.col("user_id"))),
                    "total_usuarios",
                ],
                [
                    connection_1.default.fn("AVG", connection_1.default.col("session_duration")),
                    "duracion_promedio_sesion",
                ],
                [connection_1.default.fn("SUM", connection_1.default.col("visit_count")), "total_visitas"],
                [
                    connection_1.default.fn("AVG", connection_1.default.col("visit_count")),
                    "promedio_visitas_usuario",
                ],
            ],
            where: {
                updatedAt: {
                    [sequelize_1.Op.gte]: fechaInicio,
                },
            },
            raw: true,
        });
        // Estadísticas por día
        const estadisticasDiarias = yield analytics_usuario_1.AnalyticsUsuario.findAll({
            attributes: [
                [connection_1.default.fn("DATE", connection_1.default.col("updatedAt")), "fecha"],
                [
                    connection_1.default.fn("COUNT", connection_1.default.fn("DISTINCT", connection_1.default.col("user_id"))),
                    "usuarios_unicos",
                ],
                [connection_1.default.fn("COUNT", "*"), "total_sesiones"],
                [
                    connection_1.default.fn("AVG", connection_1.default.col("session_duration")),
                    "duracion_promedio",
                ],
            ],
            where: {
                updatedAt: {
                    [sequelize_1.Op.gte]: fechaInicio,
                },
            },
            group: [connection_1.default.fn("DATE", connection_1.default.col("updatedAt"))],
            order: [[connection_1.default.fn("DATE", connection_1.default.col("updatedAt")), "DESC"]],
            raw: true,
        });
        // Servicios populares
        const serviciosPopulares = yield service_popularity_1.ServicePopularity.findAll({
            attributes: [
                "service_name",
                [connection_1.default.fn("SUM", connection_1.default.col("visit_count")), "total_visitas"],
            ],
            where: {
                date: {
                    [sequelize_1.Op.gte]: fechaInicio,
                },
            },
            group: ["service_name"],
            order: [[connection_1.default.fn("SUM", connection_1.default.col("visit_count")), "DESC"]],
            limit: 10,
            raw: true,
        });
        console.log("✅ Dashboard generado exitosamente");
        res.status(200).json({
            success: true,
            period: `${dias} días`,
            data: {
                estadisticas_generales: estadisticasGenerales[0] || {},
                estadisticas_diarias: estadisticasDiarias,
                servicios_populares: serviciosPopulares,
            },
            message: "Dashboard de analytics generado exitosamente",
        });
    }
    catch (error) {
        console.error("❌ Error al generar dashboard:", error);
        res.status(500).json({
            success: false,
            error: "Error al generar dashboard",
            code: "DASHBOARD_ERROR",
            message: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.getDashboardAnalytics = getDashboardAnalytics;
// ✅ Funciones auxiliares
const procesarAnalyticsUsuario = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const existingUser = yield analytics_usuario_1.AnalyticsUsuario.findOne({
        where: { user_id: data.userId },
    });
    if (existingUser) {
        return yield existingUser.update({
            visit_count: data.visitCount,
            visited_services: data.visitedServices,
            session_duration: data.sessionDuration,
            service_stats: data.serviceStats,
            last_visit: data.lastVisit,
        });
    }
    else {
        return yield analytics_usuario_1.AnalyticsUsuario.create({
            user_id: data.userId,
            visit_count: data.visitCount,
            visited_services: data.visitedServices,
            user_zodiac_sign: data.userZodiacSign,
            session_duration: data.sessionDuration,
            device_info: data.deviceInfo,
            browser_info: data.browserInfo,
            service_stats: data.serviceStats,
            last_visit: data.lastVisit,
        });
    }
});
const procesarPageAnalytics = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield page_views_1.PageAnalytics.create({
        user_id: data.userId,
        page_route: data.page,
        referrer: data.referrer,
        session_duration: data.sessionDuration,
        timestamp: new Date(data.timestamp),
    });
});
const actualizarEstadisticasServicios = (serviceStats) => __awaiter(void 0, void 0, void 0, function* () {
    const hoy = new Date().toISOString().split("T")[0];
    for (const [nombreServicio, contador] of Object.entries(serviceStats)) {
        try {
            const [servicio, creado] = yield service_popularity_1.ServicePopularity.findOrCreate({
                where: {
                    service_name: nombreServicio,
                    date: hoy,
                },
                defaults: {
                    service_name: nombreServicio,
                    visit_count: contador,
                    date: hoy,
                },
            });
            if (!creado) {
                yield servicio.increment("visit_count", { by: contador });
            }
        }
        catch (error) {
            console.error(`Error actualizando servicio ${nombreServicio}:`, error);
        }
    }
});
