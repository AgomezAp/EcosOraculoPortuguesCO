"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const calculadora_amor_1 = require("../controllers/calculadora-amor");
const router = (0, express_1.Router)();
const loveCalculatorController = new calculadora_amor_1.LoveCalculatorController();
// Ruta para obtener información del experto en amor
router.get("/info", loveCalculatorController.getLoveCalculatorInfo);
// Ruta para chat con el experto en amor
router.post("/chat", loveCalculatorController.chatWithLoveExpert);
exports.default = router;
