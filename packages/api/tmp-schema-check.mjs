import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "station_service",
});

try {
  const [tables] = await db.query(`
    SELECT TABLE_NAME
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND TABLE_NAME IN (
        'Vehicule',
        'Service',
        'RetourCuve',
        'DetailRetour',
        'InventaireCarburant',
        'DetailInventaireCarburant',
        'FAMDEPENSE',
        'TauxTVA'
      )
  `);

  console.log(tables);

  const [columns] = await db.query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND COLUMN_NAME IN (
        'magasinId',
        'vehiculeId',
        'serviceId',
        'famDepenseId'
      )
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);

  console.log(columns);

  const [userColumns] = await db.query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND TABLE_NAME = 'user'
    ORDER BY ORDINAL_POSITION
  `);

  console.log(userColumns);

  const [foreignKeys] = await db.query(`
    SELECT
      TABLE_NAME,
      CONSTRAINT_NAME,
      COLUMN_NAME,
      REFERENCED_TABLE_NAME
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND TABLE_NAME IN (
        'retourcuve',
        'detailretour',
        'inventairecarburant',
        'detailinventairecarburant',
        'vehicule',
        'service',
        'tauxtva',
        'famdepense'
      )
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);

  console.log(foreignKeys);
} finally {
  await db.end();
}