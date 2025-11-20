"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zodiaco_chino_1 = require("../controllers/zodiaco-chino");
const router = (0, express_1.Router)();
const chineseZodiacController = new zodiaco_chino_1.ChineseZodiacController();
// Ruta para obtener información del maestro especialista en zodiaco chino
router.get("/api/zodiaco-chino/info", chineseZodiacController.getChineseZodiacInfo);
// Ruta para chat con el maestro del zodiaco chino
router.post("/api/zodiaco-chino/chat", chineseZodiacController.chatWithMaster);
exports.default = router;
