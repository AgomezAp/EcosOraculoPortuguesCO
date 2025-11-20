"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zodiaco_1 = require("../controllers/zodiaco");
const router = (0, express_1.Router)();
const zodiacController = new zodiaco_1.ZodiacController();
// Ruta para obtener información del astrólogo
router.get("/api/zodiaco/info", zodiacController.getZodiacInfo);
// Ruta para chat con el astrólogo
router.post("/api/zodiaco/chat", zodiacController.chatWithAstrologer);
exports.default = router;
