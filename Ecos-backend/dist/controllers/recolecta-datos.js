"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDatos = exports.recolectarDatos = void 0;
const recolecta_datos_1 = require("../models/recolecta-datos");
const recolectarDatos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, } = req.body;
    try {
        const newRecolecta = yield recolecta_datos_1.recolecta.create({
            email,
        });
        res.status(201).json(newRecolecta);
    }
    catch (error) {
        console.error("Error al recolectar datos:", error);
        res.status(500).json({ message: "Error al recolectar datos" });
    }
});
exports.recolectarDatos = recolectarDatos;
// controllers/recolecta-datos.ts
const getAllDatos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📋 Obteniendo todos los datos...");
        const datos = yield recolecta_datos_1.recolecta.findAll({
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
    }
    catch (error) {
        console.error("❌ Error al obtener los datos:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener los datos",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Error interno del servidor",
        });
    }
});
exports.getAllDatos = getAllDatos;
