"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_1 = require("../controllers/analytics");
const router = (0, express_1.Router)();
// ✅ Rutas para recolectar datos
router.post('/analytics/user-interaction', analytics_1.recolectarAnalyticsUsuario);
router.post('/analytics/page-view', analytics_1.recolectarPageAnalytics);
router.post('/analytics/batch', analytics_1.recolectarAnalyticsBatch);
// ✅ Rutas para obtener datos
router.get('/analytics/analytics/users', analytics_1.getAllAnalyticsUsuarios);
router.get('/analytics/analytics/user/:userId', analytics_1.getAnalyticsUsuario);
router.get('/analytics/analytics/pages', analytics_1.getAllPageAnalytics);
router.get('/analytics/popular-services', analytics_1.getServiciosPopulares);
router.get('/analytics/dashboard', analytics_1.getDashboardAnalytics);
exports.default = router;
