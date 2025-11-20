import { DataTypes, Model } from "sequelize";
import sequelize from "../database/connection";

export class Sugerencia extends Model {
  public id!: number;
  public sugerencia!: string;
  public fecha!: Date;
  public ip!: string;
  public user_agent!: string;
  public estado!: "pendiente" | "leida" | "respondida";
}

Sugerencia.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sugerencia: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 1000], // Entre 1 y 1000 caracteres
      },
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM("pendiente", "leida", "respondida"),
      allowNull: false,
      defaultValue: "pendiente",
    },
  },
  {
    sequelize,
    tableName: "sugerencias",
    timestamps: true, // Incluye createdAt y updatedAt
  }
);
