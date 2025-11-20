import {
  DataTypes,
  Model,
} from 'sequelize';
import sequelize from '../database/connection';

export class AnalyticsUsuario extends Model {
    id!: number;
    user_id!: string;
    visit_count!: number;
    visited_services!: JSON;
    user_zodiac_sign!: string;
    session_duration!: number;
    device_info!: JSON;
    browser_info!: JSON;
    service_stats!: JSON;
    last_visit!: Date;
    createdAt!: Date;
    updatedAt!: Date;
}

AnalyticsUsuario.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true, // Para evitar duplicados
    },
    visit_count: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    visited_services: {
        type: DataTypes.JSON,
        defaultValue: [],
    },
    user_zodiac_sign: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    session_duration: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Duración en segundos'
    },
    device_info: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    browser_info: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    service_stats: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
    },
    last_visit: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    sequelize,
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