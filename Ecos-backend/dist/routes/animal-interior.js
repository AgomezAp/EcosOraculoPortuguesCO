"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lectura_tarot_1 = require("../controllers/lectura-tarot");
const router = (0, express_1.Router)();
const animalController = new lectura_tarot_1.AnimalInteriorController();
// Ruta para obtener información del guía espiritual
router.get("/api/animal-interior/guide-info", animalController.getAnimalGuideInfo);
// Ruta para chat con el guía de animal interior
router.post("/api/animal-interior/chat", animalController.chatWithAnimalGuide);
exports.default = router;
