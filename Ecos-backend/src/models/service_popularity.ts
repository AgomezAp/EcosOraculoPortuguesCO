import {
  DataTypes,
  Model,
} from 'sequelize';
import sequelize from '../database/connection';

export class ServicePopularity extends Model {
    id!: number;
    service_name!: string;
    visit_count!: number;
    date!: Date;
    createdAt!: Date;
    updatedAt!: Date;
}

ServicePopularity.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    service_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    visit_count: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
}, {
    sequelize,
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