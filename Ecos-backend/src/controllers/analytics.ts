import { Request, Response } from "express";
import { Op } from "sequelize";
import sequelize from "../database/connection";
import { AnalyticsUsuario } from "../models/analytics_usuario";
import { PageAnalytics } from "../models/page_views";
import { ServicePopularity } from "../models/service_popularity";
export const recolectarAnalyticsUsuario = async (
  req: Request,
  res: Response
): Promise<any> => {
  const {
    visitCount,
    visitedServices,
    userZodiacSign,
    sessionDuration,
    deviceInfo,
    timestamp,
    userId,
    serviceStats,
    lastVisit,
    browserInfo,
  } = req.body;

  try {
    console.log("📊 Recolectando analytics de usuario:", userId);

    // Buscar si ya existe el usuario
    const existingUser = await AnalyticsUsuario.findOne({
      where: { user_id: userId },
    });

    let analyticsData;

    if (existingUser) {
      // Actualizar usuario existente
      analyticsData = await existingUser.update({
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
    } else {
      // Crear nuevo usuario
      analyticsData = await AnalyticsUsuario.create({
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
      await actualizarEstadisticasServicios(serviceStats);
    }

    res.status(201).json({
      success: true,
      data: analyticsData,
      message: "Analytics de usuario recolectados exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al recolectar analytics de usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al recolectar analytics de usuario",
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

// ✅ Recolectar datos de page analytics
export const recolectarPageAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { page, userId, timestamp, referrer, sessionDuration } = req.body;

  try {
    console.log(
      "📄 Recolectando page analytics:",
      page,
      "para usuario:",
      userId
    );

    const pageAnalytics = await PageAnalytics.create({
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
  } catch (error) {
    console.error("❌ Error al recolectar page analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error al recolectar page analytics",
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

// ✅ Recolectar múltiples analytics en batch
export const recolectarAnalyticsBatch = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { data } = req.body; // Array de objetos de analytics

  try {
    console.log(
      "📦 Recolectando analytics en batch:",
      data.length,
      "registros"
    );

    const resultados = [];

    for (const analyticsItem of data) {
      try {
        if (analyticsItem.type === "user") {
          const userAnalytics = await procesarAnalyticsUsuario(analyticsItem);
          resultados.push({ success: true, type: "user", data: userAnalytics });
        } else if (analyticsItem.type === "page") {
          const pageAnalytics = await procesarPageAnalytics(analyticsItem);
          resultados.push({ success: true, type: "page", data: pageAnalytics });
        }
      } catch (error) {
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
  } catch (error) {
    console.error("❌ Error al recolectar analytics batch:", error);
    res.status(500).json({
      success: false,
      message: "Error al recolectar analytics batch",
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

// ✅ Obtener todos los analytics de usuarios
export const getAllAnalyticsUsuarios = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("📋 Obteniendo todos los analytics de usuarios...");

    const {
      page = 1,
      limit = 100,
      sortBy = "createdAt",
      order = "DESC",
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: analytics } = await AnalyticsUsuario.findAndCountAll({
      attributes: {
        exclude: [],
      },
      order: [[sortBy as string, order as string]],
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
  } catch (error) {
    console.error("❌ Error al obtener analytics de usuarios:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener analytics de usuarios",
      code: "FETCH_ERROR",
      message:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

export const getAnalyticsUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    console.log("🔍 Obteniendo analytics del usuario:", userId);

    const analytics = await AnalyticsUsuario.findOne({
      where: { user_id: userId },
      include: [
        {
          model: PageAnalytics,
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
  } catch (error) {
    console.error("❌ Error al obtener analytics del usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener analytics del usuario",
      code: "FETCH_ERROR",
      message:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};
// ✅ Obtener todos los page analytics
export const getAllPageAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("📄 Obteniendo todos los page analytics...");

    const { page = 1, limit = 100, userId, pageRoute } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Construir filtros dinámicos
    const whereClause: any = {};
    if (userId) whereClause.user_id = userId;
    if (pageRoute) whereClause.page_route = { [Op.like]: `%${pageRoute}%` };

    const { count, rows: pageAnalytics } = await PageAnalytics.findAndCountAll({
      where: whereClause,
      order: [["timestamp", "DESC"]],
      limit: Number(limit),
      offset: offset,
      include: [
        {
          model: AnalyticsUsuario,
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
  } catch (error) {
    console.error("❌ Error al obtener page analytics:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener page analytics",
      code: "FETCH_ERROR",
      message:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

// ✅ Obtener estadísticas de servicios populares
export const getServiciosPopulares = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("🔥 Obteniendo servicios populares...");

    const { dias = 30, limit = 10 } = req.query;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - Number(dias));

    const serviciosPopulares = await ServicePopularity.findAll({
      attributes: [
        "service_name",
        [sequelize.fn("SUM", sequelize.col("visit_count")), "total_visits"],
        [sequelize.fn("COUNT", sequelize.col("date")), "days_active"],
      ],
      where: {
        date: {
          [Op.gte]: fechaInicio,
        },
      },
      group: ["service_name"],
      order: [[sequelize.fn("SUM", sequelize.col("visit_count")), "DESC"]],
      limit: Number(limit),
      raw: true,
    });

    console.log(
      `✅ Se encontraron ${serviciosPopulares.length} servicios populares`
    );

    res.status(200).json({
      success: true,
      period: `${dias} días`,
      count: serviciosPopulares.length,
      data: serviciosPopulares,
      message: "Servicios populares obtenidos exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al obtener servicios populares:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener servicios populares",
      code: "FETCH_ERROR",
      message:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

// ✅ Obtener dashboard completo
export const getDashboardAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("📊 Generando dashboard de analytics...");

    const { dias = 30 } = req.query;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - Number(dias));

    // Estadísticas generales
    const estadisticasGenerales = await AnalyticsUsuario.findAll({
      attributes: [
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("user_id"))
          ),
          "total_usuarios",
        ],
        [
          sequelize.fn("AVG", sequelize.col("session_duration")),
          "duracion_promedio_sesion",
        ],
        [sequelize.fn("SUM", sequelize.col("visit_count")), "total_visitas"],
        [
          sequelize.fn("AVG", sequelize.col("visit_count")),
          "promedio_visitas_usuario",
        ],
      ],
      where: {
        updatedAt: {
          [Op.gte]: fechaInicio,
        },
      },
      raw: true,
    });

    // Estadísticas por día
    const estadisticasDiarias = await AnalyticsUsuario.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("updatedAt")), "fecha"],
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("user_id"))
          ),
          "usuarios_unicos",
        ],
        [sequelize.fn("COUNT", "*"), "total_sesiones"],
        [
          sequelize.fn("AVG", sequelize.col("session_duration")),
          "duracion_promedio",
        ],
      ],
      where: {
        updatedAt: {
          [Op.gte]: fechaInicio,
        },
      },
      group: [sequelize.fn("DATE", sequelize.col("updatedAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("updatedAt")), "DESC"]],
      raw: true,
    });

    // Servicios populares
    const serviciosPopulares = await ServicePopularity.findAll({
      attributes: [
        "service_name",
        [sequelize.fn("SUM", sequelize.col("visit_count")), "total_visitas"],
      ],
      where: {
        date: {
          [Op.gte]: fechaInicio,
        },
      },
      group: ["service_name"],
      order: [[sequelize.fn("SUM", sequelize.col("visit_count")), "DESC"]],
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
  } catch (error) {
    console.error("❌ Error al generar dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Error al generar dashboard",
      code: "DASHBOARD_ERROR",
      message:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};

// ✅ Funciones auxiliares
const procesarAnalyticsUsuario = async (data: any) => {
  const existingUser = await AnalyticsUsuario.findOne({
    where: { user_id: data.userId },
  });

  if (existingUser) {
    return await existingUser.update({
      visit_count: data.visitCount,
      visited_services: data.visitedServices,
      session_duration: data.sessionDuration,
      service_stats: data.serviceStats,
      last_visit: data.lastVisit,
    });
  } else {
    return await AnalyticsUsuario.create({
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
};

const procesarPageAnalytics = async (data: any) => {
  return await PageAnalytics.create({
    user_id: data.userId,
    page_route: data.page,
    referrer: data.referrer,
    session_duration: data.sessionDuration,
    timestamp: new Date(data.timestamp),
  });
};

const actualizarEstadisticasServicios = async (serviceStats: any) => {
  const hoy = new Date().toISOString().split("T")[0];

  for (const [nombreServicio, contador] of Object.entries(serviceStats)) {
    try {
      const [servicio, creado] = await ServicePopularity.findOrCreate({
        where: {
          service_name: nombreServicio,
          date: hoy,
        },
        defaults: {
          service_name: nombreServicio,
          visit_count: contador as number,
          date: hoy,
        },
      });

      if (!creado) {
        await servicio.increment("visit_count", { by: contador as number });
      }
    } catch (error) {
      console.error(`Error actualizando servicio ${nombreServicio}:`, error);
    }
  }
};
