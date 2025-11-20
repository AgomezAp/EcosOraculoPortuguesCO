"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recolecta = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class recolecta extends sequelize_1.Model {
}
exports.recolecta = recolecta;
recolecta.init({
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: connection_1.default,
    tableName: "recolecta_datos",
    timestamps: false,
});
