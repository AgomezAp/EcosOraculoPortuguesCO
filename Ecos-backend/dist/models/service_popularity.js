"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicePopularity = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class ServicePopularity extends sequelize_1.Model {
}
exports.ServicePopularity = ServicePopularity;
ServicePopularity.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    service_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    visit_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 1,
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    }
}, {
    sequelize: connection_1.default,
    modelName: 'ServicePopularity',
    tableName: 'service_popularity',
    timestamps: true,
    indexes: [
        {
            name: 'idx_service_name',
            fields: ['service_name'],
        },
        {
            name: 'idx_service_date',
            fields: ['date'],
        },
        {
            name: 'unique_service_date',
            fields: ['service_name', 'date'],
            unique: true,
        }
    ],
});
