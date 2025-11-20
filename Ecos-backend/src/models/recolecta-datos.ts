import {
  DataTypes,
  Model,
} from 'sequelize';
import sequelize from '../database/connection';
export class recolecta extends Model{

    public email !: string;
}
    recolecta.init ({
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },  {
    sequelize,
    tableName: "recolecta_datos",
    timestamps: false,
  });

