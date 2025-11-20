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
exports.registrarDatos = void 0;
const datos_1 = require("../models/datos");
const registrarDatos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Nombre, telefono,
    // pais // ❌ CAMPO ELIMINADO
     } = req.body;
    try {
        // Crear el nuevo registro de datos
        const datos = yield datos_1.Datos.create({
            Nombre,
            telefono,
            // pais // ❌ CAMPO ELIMINADO
        });
        res.status(200).json({
            message: "Datos registrados con éxito",
            datos: datos,
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Problemas al registrar los datos",
            message: err.message || err,
        });
    }
});
exports.registrarDatos = registrarDatos;
