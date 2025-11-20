"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageAnalytics = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
class PageAnalytics extends sequelize_1.Model {
}
exports.PageAnalytics = PageAnalytics;
PageAnalytics.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    page_route: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    referrer: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    session_duration: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Duración en segundos hasta esta página'
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    }
}, {
    sequelize: connection_1.default,
    modelName: 'PageAnalytics',
    tableName: 'page_analytics',
    timestamps: true,
    indexes: [
        {
            name: 'idx_page_user_id',
            fields: ['user_id'],
        },
        {
            name: 'idx_page_route',
            fields: ['page_route'],
        },
        {
            name: 'idx_page_timestamp',
            fields: ['timestamp'],
        }
    ],
});
