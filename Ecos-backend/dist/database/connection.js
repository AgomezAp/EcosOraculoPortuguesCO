"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = require("sequelize");
dotenv_1.default.config();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}
const sequelize = new sequelize_1.Sequelize(databaseUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    timezone: '-03:00',
    dialectOptions: {
        useUTC: false,
        ssl: {
            require: true,
            rejectUnauthorized: false // Esto es necesario para algunas configuraciones de PostgreSQL en Render
        }
    },
});
sequelize.authenticate()
    .then(() => {
    console.log('Conectado a la base de datos PostgreSQL con éxito');
})
    .catch((error) => {
    console.error('Unable to connect to the database:', error);
});
exports.default = sequelize;
