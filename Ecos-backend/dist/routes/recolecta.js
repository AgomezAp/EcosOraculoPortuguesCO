"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recolecta_datos_1 = require("../controllers/recolecta-datos");
const router = (0, express_1.Router)();
// Ruta para obtener información del guía espiritual
router.post("/api/recolecta", recolecta_datos_1.recolectarDatos);
router.get("/api/obtener", recolecta_datos_1.getAllDatos);
exports.default = router;
