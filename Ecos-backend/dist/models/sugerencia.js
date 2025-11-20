"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sugerencia = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class Sugerencia extends sequelize_1.Model {
}
exports.Sugerencia = Sugerencia;
Sugerencia.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    sugerencia: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [1, 1000], // Entre 1 y 1000 caracteres
        },
    },
    fecha: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    ip: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    user_agent: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    estado: {
        type: sequelize_1.DataTypes.ENUM("pendiente", "leida", "respondida"),
        allowNull: false,
        defaultValue: "pendiente",
    },
}, {
    sequelize: connection_1.default,
    tableName: "sugerencias",
    timestamps: true, // Incluye createdAt y updatedAt
});
