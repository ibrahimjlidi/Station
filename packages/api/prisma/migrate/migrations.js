import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  let connection;

  try {
    console.log("🔌 Connexion à MySQL...");

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "station_service",
      multipleStatements: true,
    });

    console.log("✅ Connexion MySQL réussie");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsPath = path.join(
      __dirname,
      "..",
      "migrations"
    );

    console.log(`📁 Migrations : ${migrationsPath}`);

    if (!fs.existsSync(migrationsPath)) {
      throw new Error(
        `Le dossier migrations n'existe pas : ${migrationsPath}`
      );
    }

    const migrationFolders = fs
      .readdirSync(migrationsPath, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .filter((item) =>
        fs.existsSync(path.join(migrationsPath, item.name, "migration.sql"))
      )
      .map((item) => item.name)
      .sort();

    const [legacyHistoryTables] = await connection.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = '_prisma_migrations'
    `);

    if (legacyHistoryTables.length > 0) {
      const [legacyRows] = await connection.query(`
        SELECT migration_name
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      `);
      const legacyApplied = new Set(
        legacyRows.map((row) => row.migration_name)
      );

      for (const migration of migrationFolders) {
        if (legacyApplied.has(migration)) {
          await connection.query(
            `INSERT IGNORE INTO _migrations (migration) VALUES (?)`,
            [migration]
          );
        }
      }

      console.log('📋 Historique MySQL existant repris');
    }

    console.log(
      `📦 ${migrationFolders.length} migration(s) trouvée(s)`
    );

    const [executedRows] = await connection.query(`
      SELECT migration
      FROM _migrations
      ORDER BY id ASC
    `);

    const executed = new Set(
      executedRows.map((row) => row.migration)
    );

    for (const migration of migrationFolders) {
      if (executed.has(migration)) {
        console.log(`⏭️ ${migration} déjà exécutée`);
        continue;
      }

      const migrationFile = path.join(
        migrationsPath,
        migration,
        "migration.sql"
      );

      if (!fs.existsSync(migrationFile)) {
        console.log(
          `⚠️ migration.sql introuvable : ${migration}`
        );
        continue;
      }

      console.log(`🚀 Exécution : ${migration}`);

      const sql = fs.readFileSync(
        migrationFile,
        "utf8"
      );

      try {
        await connection.beginTransaction();

        await connection.query(sql);

        await connection.query(
          `
          INSERT INTO _migrations (migration)
          VALUES (?)
          `,
          [migration]
        );

        await connection.commit();

        console.log(`✅ ${migration} appliquée`);
      } catch (error) {
        await connection.rollback();

        console.error(`❌ Échec : ${migration}`);
        console.error(error.message);

        process.exit(1);
      }
    }

    console.log("");
    console.log("🎉 Toutes les migrations sont terminées !");
  } catch (error) {
    console.error("");
    console.error("❌ Erreur :", error.message);

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();