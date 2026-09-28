const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function migrate() {
  let connection;

  try {
    console.log("🔌 Connexion à MySQL...");

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    console.log("✅ Connexion MySQL réussie");

    // Créer la table qui garde l'historique
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chemin :
    // prisma/migrate/migrations.js
    //          ↓
    // prisma/migrations/
    const migrationsPath = path.join(
      __dirname,
      "..",
      "migrations"
    );

    console.log("📁 Migrations :", migrationsPath);

    if (!fs.existsSync(migrationsPath)) {
      throw new Error(
        `Le dossier migrations n'existe pas : ${migrationsPath}`
      );
    }

    // Récupérer les dossiers de migrations Prisma
    const migrationFolders = fs
      .readdirSync(migrationsPath, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();

    console.log(
      `📦 ${migrationFolders.length} migration(s) trouvée(s)`
    );

    // Migrations déjà exécutées
    const [executedRows] = await connection.query(`
      SELECT migration
      FROM _migrations
      ORDER BY id ASC
    `);

    const executed = new Set(
      executedRows.map((row) => row.migration)
    );

    // Exécuter les migrations une par une
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
          `⚠️ migration.sql introuvable pour ${migration}`
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

        console.error(
          `❌ Erreur dans ${migration}`
        );

        console.error(error.message);

        process.exit(1);
      }
    }

    console.log("");
    console.log("🎉 Migration terminée !");
  } catch (error) {
    console.error("");
    console.error("❌ ERREUR :", error.message);

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();