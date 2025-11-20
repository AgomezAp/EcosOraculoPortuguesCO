import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}

const sequelize = new Sequelize(databaseUrl, {
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

export default sequelize;