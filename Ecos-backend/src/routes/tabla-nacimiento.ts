import { Router } from "express";
import { BirthChartController } from "../controllers/tabla-nacimiento";

const router = Router();
const birthChartController = new BirthChartController();

// Ruta para obtener información del astrólogo especialista en tablas de nacimiento
router.get("/api/tabla-nacimiento/info", birthChartController.getBirthChartInfo);

// Ruta para chat con el astrólogo de tablas de nacimiento
router.post("/api/tabla-nacimiento/chat", birthChartController.chatWithAstrologer);

export default router;