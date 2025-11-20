"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sugerencias_1 = require("../controllers/sugerencias");
const router = (0, express_1.Router)();
// POST /api/sugerencias - Crear nueva sugerencia
router.post('/api/sugerencias/enviar', sugerencias_1.SugerenciasController.crearSugerencia);
// GET /api/sugerencias - Obtener sugerencias (admin)
router.get('/api/sugerencias/obtener', sugerencias_1.SugerenciasController.obtenerSugerencias);
// PUT /api/sugerencias/:id/leida - Marcar como leída
router.put('/api/sugerencias/:id/leida', sugerencias_1.SugerenciasController.marcarComoLeida);
exports.default = router;
