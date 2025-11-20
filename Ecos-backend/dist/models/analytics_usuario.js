"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsUsuario = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class AnalyticsUsuario extends sequelize_1.Model {
}
exports.AnalyticsUsuario = AnalyticsUsuario;
AnalyticsUsuario.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true, // Para evitar duplicados
    },
    visit_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 1,
    },
    visited_services: {
        type: sequelize_1.DataTypes.JSON,
        defaultValue: [],
    },
    user_zodiac_sign: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    session_duration: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Duración en segundos'
    },
    device_info: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    browser_info: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    service_stats: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
    },
    last_visit: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    }
}, {
    sequelize: connection_1.default,
    modelName: 'AnalyticsUsuario',
    tableName: 'analytics_usuario',
    timestamps: true,
    indexes: [
        {
            name: 'idx_user_id',
            fields: ['user_id'],
            unique: true,
        },
        {
            name: 'idx_created_at',
            fields: ['createdAt'],
        },
        {
            name: 'idx_last_visit',
            fields: ['last_visit'],
        }
    ],
});
