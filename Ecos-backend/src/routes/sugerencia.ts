import { Router } from 'express';
import { SugerenciasController } from '../controllers/sugerencias';

const router = Router();

// POST /api/sugerencias - Crear nueva sugerencia
router.post('/api/sugerencias/enviar', SugerenciasController.crearSugerencia);

// GET /api/sugerencias - Obtener sugerencias (admin)
router.get('/api/sugerencias/obtener', SugerenciasController.obtenerSugerencias);

// PUT /api/sugerencias/:id/leida - Marcar como leída
router.put('/api/sugerencias/:id/leida', SugerenciasController.marcarComoLeida);

export default router;