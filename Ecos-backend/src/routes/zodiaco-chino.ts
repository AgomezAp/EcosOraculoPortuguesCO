import { Router } from "express";
import { ChineseZodiacController } from "../controllers/zodiaco-chino";

const router = Router();
const chineseZodiacController = new ChineseZodiacController();

// Ruta para obtener información del maestro especialista en zodiaco chino
router.get("/api/zodiaco-chino/info", chineseZodiacController.getChineseZodiacInfo);

// Ruta para chat con el maestro del zodiaco chino
router.post("/api/zodiaco-chino/chat", chineseZodiacController.chatWithMaster);

export default router;