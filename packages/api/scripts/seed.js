import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
  let connection;

  try {
    console.log("🔌 Connexion à MySQL...");

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "station_service",
    });

    console.log("✅ Connexion MySQL réussie");

    // ---------------------------------------------------------
    // Station / Magasin / Paramètres / Compteur
    // ---------------------------------------------------------
    const [stationRows] = await connection.query(
      "SELECT id FROM Station WHERE code = ? LIMIT 1",
      ["EL-AMAL"],
    );

    let stationId = stationRows[0]?.id;

    if (!stationId) {
      const [result] = await connection.query(
        "INSERT INTO Station (code, nom, updatedAt) VALUES (?, ?, NOW(3))",
        ["EL-AMAL", "Station El Amal"],
      );
      stationId = result.insertId;
      console.log("✅ Station créée");
    } else {
      console.log("⏭️ Station déjà présente");
    }

    const [magasinRows] = await connection.query(
      "SELECT id FROM Magasin WHERE stationId = ? LIMIT 1",
      [stationId],
    );

    let magasinId = magasinRows[0]?.id;

    if (!magasinId) {
      const [result] = await connection.query(
        "INSERT INTO Magasin (stationId, code, nom, updatedAt) VALUES (?, ?, ?, NOW(3))",
        [stationId, "MAG-PRINCIPAL", "Magasin principal"],
      );
      magasinId = result.insertId;
      console.log("✅ Magasin créé");
    } else {
      console.log("⏭️ Magasin déjà présent");
    }

    await connection.query(
      `INSERT INTO SetParam (id, stationId, nomStation, adresse, tel, mf, rc, devise, tauxTVADefaut, timbre, updatedAt)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
       ON DUPLICATE KEY UPDATE nomStation = VALUES(nomStation)`,
      [
        stationId,
        "Station El Amal",
        "Avenue Habib Bourguiba, Tunis",
        "71 000 000",
        "1234567/A/M/000",
        "B123456789",
        "TND",
        19,
        0.6,
      ],
    );
    console.log("✅ Paramètres (SetParam) prêts");

    await connection.query(
      "INSERT IGNORE INTO Compteur (id, updatedAt) VALUES (1, NOW(3))",
    );
    console.log("✅ Compteur prêt");

    // ---------------------------------------------------------
    // Equipe / Caisse
    // ---------------------------------------------------------
    const equipes = [
      ["MATIN", "Matin (06:00-14:00)"],
      ["APRES-MIDI", "Après-midi (14:00-22:00)"],
      ["NUIT", "Nuit (22:00-06:00)"],
    ];

    for (const [code, libelle] of equipes) {
      await connection.query(
        `INSERT INTO Equipe (magasinId, code, libelle, updatedAt)
         VALUES (?, ?, ?, NOW(3))
         ON DUPLICATE KEY UPDATE libelle = VALUES(libelle)`,
        [magasinId, code, libelle],
      );
    }
    console.log("✅ Équipes prêtes");

    const caisses = [
      ["CP", "Caisse Principale"],
      ["CS", "Caisse Secondaire"],
    ];

    for (const [code, libelle] of caisses) {
      await connection.query(
        `INSERT INTO Caisse (magasinId, code, libelle, updatedAt)
         VALUES (?, ?, ?, NOW(3))
         ON DUPLICATE KEY UPDATE libelle = VALUES(libelle)`,
        [magasinId, code, libelle],
      );
    }
    console.log("✅ Caisses prêtes");

    // ---------------------------------------------------------
    // Utilisateur admin
    // ---------------------------------------------------------
    const [adminRows] = await connection.query(
      "SELECT id FROM User WHERE username = ? LIMIT 1",
      ["admin"],
    );

    if (adminRows.length === 0) {
      const passwordHash = await bcrypt.hash("admin123", 12);

      await connection.query(
        `INSERT INTO User (magasinId, username, passwordHash, nom, prenom, role, actif, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW(3))`,
        [magasinId, "admin", passwordHash, "Admin", "Station", "gerant"],
      );

      console.log("✅ Utilisateur admin créé (admin / admin123)");
    } else {
      console.log("⏭️ Utilisateur admin déjà présent");
    }

    // ---------------------------------------------------------
    // Référentiels de base
    // ---------------------------------------------------------
    const famillesPayment = [
      ["Espèces", "531000"],
      ["Effets", "532000"],
      ["Cartes", "533000"],
      ["Créances", "411000"],
    ];

    for (const [libFamille, compteCPT] of famillesPayment) {
      await connection.query(
        `INSERT INTO FamillePayment (libFamille, compteCPT, updatedAt)
         SELECT ?, ?, NOW(3) FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM FamillePayment WHERE libFamille = ?)`,
        [libFamille, compteCPT, libFamille],
      );
    }

    const modesPayment = [
      ["Espèces", "1", "531000"],
      ["Chèque", "2", "532000"],
      ["Virement", "2", "532100"],
      ["Carte bancaire", "3", "533000"],
      ["Crédit client", "4", "411000"],
    ];

    for (const [libelle, famille, compteCPT] of modesPayment) {
      await connection.query(
        `INSERT INTO ModePayment (libelle, famille, compteCPT, updatedAt)
         SELECT ?, ?, ?, NOW(3) FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM ModePayment WHERE libelle = ?)`,
        [libelle, famille, compteCPT, libelle],
      );
    }

    const famillesProduit = [
      ["Lubrifiants", "707100", "607100"],
      ["Accessoires", "707200", "607200"],
      ["Alimentation", "707300", "607300"],
      ["Hygiène", "707400", "607400"],
    ];

    for (const [libelle, compteCPT, compteACH] of famillesProduit) {
      await connection.query(
        `INSERT INTO FamilleProduit (libelle, compteCPT, compteACH, updatedAt)
         SELECT ?, ?, ?, NOW(3) FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM FamilleProduit WHERE libelle = ?)`,
        [libelle, compteCPT, compteACH, libelle],
      );
    }

    const tauxTVA = [
      [19, "TVA 19%"],
      [7, "TVA 7%"],
      [0, "Exonere"],
    ];

    for (const [taux, libelle] of tauxTVA) {
      await connection.query(
        `INSERT INTO TauxTVA (taux, libelle, updatedAt)
         SELECT ?, ?, NOW(3) FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM TauxTVA WHERE libelle = ?)`,
        [taux, libelle, libelle],
      );
    }

    console.log("✅ Référentiels de base prêts");
    console.log("");
    console.log("🎉 Seed terminé !");
    console.log("👉 Connecte-toi avec : admin / admin123");
  } catch (error) {
    console.error("");
    console.error("❌ Erreur :", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();