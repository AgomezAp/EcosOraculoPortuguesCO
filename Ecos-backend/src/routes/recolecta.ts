import { Router } from "express";
import { getAllDatos, recolectarDatos } from "../controllers/recolecta-datos";
const router = Router();

// Ruta para obtener información del guía espiritual
router.post("/api/recolecta", recolectarDatos);
router.get("/api/obtener", getAllDatos);

export default router;