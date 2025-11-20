import { Router } from 'express';
import { getAllAnalyticsUsuarios, getAllPageAnalytics, getAnalyticsUsuario, getDashboardAnalytics, getServiciosPopulares, recolectarAnalyticsBatch, recolectarAnalyticsUsuario, recolectarPageAnalytics } from '../controllers/analytics';

const router = Router();

// ✅ Rutas para recolectar datos
router.post('/analytics/user-interaction', recolectarAnalyticsUsuario);
router.post('/analytics/page-view', recolectarPageAnalytics);
router.post('/analytics/batch', recolectarAnalyticsBatch);

// ✅ Rutas para obtener datos
router.get('/analytics/analytics/users', getAllAnalyticsUsuarios);
router.get('/analytics/analytics/user/:userId', getAnalyticsUsuario);
router.get('/analytics/analytics/pages', getAllPageAnalytics);
router.get('/analytics/popular-services', getServiciosPopulares);
router.get('/analytics/dashboard', getDashboardAnalytics);
export default router;