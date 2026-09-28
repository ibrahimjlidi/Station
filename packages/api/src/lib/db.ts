import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'station_service',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test de connexion au démarrage
db.getConnection()
  .then((connection) => {
    console.log('✅ MySQL connecté');
    connection.release();
  })
  .catch((error) => {
    console.error('❌ Erreur de connexion MySQL:', error.message);
  });
