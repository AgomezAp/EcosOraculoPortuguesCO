"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.datosCookies = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class datosCookies extends sequelize_1.Model {
}
exports.datosCookies = datosCookies;
datosCookies.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    visit_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    visited_services: {
        type: sequelize_1.DataTypes.JSON,
        defaultValue: {},
    },
    user_zodiac_sign: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    session_duration: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
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
    },
}, {
    sequelize: connection_1.default,
    modelName: 'datosCookies',
    indexes: [
        {
            name: 'idx_user_id',
            fields: ['user_id'],
        },
        {
            name: 'idx_created_at',
            fields: ['createdAt'],
        },
    ],
});
