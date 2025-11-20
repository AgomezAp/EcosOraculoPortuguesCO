"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tabla_nacimiento_1 = require("../controllers/tabla-nacimiento");
const router = (0, express_1.Router)();
const birthChartController = new tabla_nacimiento_1.BirthChartController();
// Ruta para obtener información del astrólogo especialista en tablas de nacimiento
router.get("/api/tabla-nacimiento/info", birthChartController.getBirthChartInfo);
// Ruta para chat con el astrólogo de tablas de nacimiento
router.post("/api/tabla-nacimiento/chat", birthChartController.chatWithAstrologer);
exports.default = router;
