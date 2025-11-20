"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Datos = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class Datos extends sequelize_1.Model {
}
exports.Datos = Datos;
Datos.init({
    Nombre: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    telefono: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    // ❌ CAMPO COMENTADO - Ya no se utiliza
    // pais: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    // },
}, {
    sequelize: connection_1.default,
    modelName: 'Datos',
    timestamps: false,
});
