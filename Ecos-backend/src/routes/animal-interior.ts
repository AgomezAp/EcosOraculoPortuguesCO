import { Router } from "express";
import { AnimalInteriorController } from "../controllers/lectura-tarot";

const router = Router();
const animalController = new AnimalInteriorController();

// Ruta para obtener información del guía espiritual
router.get("/api/animal-interior/guide-info", animalController.getAnimalGuideInfo);

// Ruta para chat con el guía de animal interior
router.post("/api/animal-interior/chat", animalController.chatWithAnimalGuide);

export default router;