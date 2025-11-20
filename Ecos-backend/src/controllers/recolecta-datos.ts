import { Request, Response } from "express";
import { recolecta } from "../models/recolecta-datos";

export const recolectarDatos = async (
  req: Request,
  res: Response
): Promise<any> => {
  const {
    email,
  } = req.body;
  try {
    const newRecolecta = await recolecta.create({
      email,
    });
    res.status(201).json(newRecolecta);
  } catch (error) {
    console.error("Error al recolectar datos:", error);
    res.status(500).json({ message: "Error al recolectar datos" });
  }
};
// controllers/recolecta-datos.ts
export const getAllDatos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("📋 Obteniendo todos los datos...");

    const datos = await recolecta.findAll({
      attributes: {
        exclude: [],
      },
    });

    console.log(`✅ Se encontraron ${datos.length} registros`);
    res.status(200).json({
      success: true,
      count: datos.length,
      data: datos,
      message: "Datos obtenidos exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al obtener los datos:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener los datos",
      code: "FETCH_ERROR",
      message:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};
