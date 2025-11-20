import { Router } from "express";
import { LoveCalculatorController } from "../controllers/calculadora-amor";

const router = Router();
const loveCalculatorController = new LoveCalculatorController();

// Ruta para obtener información del experto en amor
router.get("/info", loveCalculatorController.getLoveCalculatorInfo);

// Ruta para chat con el experto en amor
router.post("/chat", loveCalculatorController.chatWithLoveExpert);

export default router;