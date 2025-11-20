import { DataTypes, Model } from "sequelize";
import sequelize from "../database/connection";

export class PageAnalytics extends Model {
    id!: number;
    user_id!: string;
    page_route!: string;
    referrer!: string;
    session_duration!: number;
    timestamp!: Date;
    createdAt!: Date;
    updatedAt!: Date;
}

PageAnalytics.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    page_route: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    referrer: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    session_duration: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Duración en segundos hasta esta página'
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
}, {
    sequelize,
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