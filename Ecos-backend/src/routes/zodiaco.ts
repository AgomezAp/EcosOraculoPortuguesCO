import { Router } from "express";
import { ZodiacController } from "../controllers/zodiaco";

const router = Router();
const zodiacController = new ZodiacController();

// Ruta para obtener información del astrólogo
router.get("/api/zodiaco/info", zodiacController.getZodiacInfo);

// Ruta para chat con el astrólogo
router.post("/api/zodiaco/chat", zodiacController.chatWithAstrologer);

export default router;