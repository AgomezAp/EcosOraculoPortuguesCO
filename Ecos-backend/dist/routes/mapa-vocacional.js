"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mapa_vocacional_1 = require("../controllers/mapa-vocacional");
const router = (0, express_1.Router)();
const vocationalController = new mapa_vocacional_1.VocationalController();
// Ruta principal para chat con consejero vocacional
router.post('/api/vocational/counselor', vocationalController.chatWithCounselor);
// Ruta para obtener información del consejero vocacional
router.get('/api/vocational/counselor/info', vocationalController.getVocationalInfo);
// Ruta de prueba para verificar que el servicio funciona
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Servicio de orientación vocacional funcionando correctamente',
        timestamp: new Date().toISOString(),
        endpoints: {
            chat: 'POST /api/vocational/counselor',
            info: 'GET /api/vocational/counselor/info',
            questions: 'GET /api/vocational/assessment/questions',
            analyze: 'POST /api/vocational/assessment/analyze',
            test: 'GET /api/vocational/test'
        }
    });
});
exports.default = router;
