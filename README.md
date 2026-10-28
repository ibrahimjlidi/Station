# ⛽ Station El Amal — ERP Web Application

Station El Amal est une application ERP full-stack pour gérer une station-service tunisienne : carburant, boutique, caisse, clients, fournisseurs, banque, rapports et entretien des véhicules.

[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/) [![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![MySQL 8](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/) [![License MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)

**Built with:** Express · mysql2 · React · Vite · Ant Design · TanStack Query · Zustand · Docker · MySQL

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Running Both Packages](#running-both-packages)
- [Docker Deployment](#docker-deployment)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [User Roles](#user-roles)
- [API Overview](#api-overview)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **⛽ Carburant** - cuves, pompes, relevés par équipe et caisse, achats, jaugeage et suivi des stocks.
- **🏪 Boutique** - produits, familles, achats, ventes, inventaires et transferts.
- **💰 Caisse** - recettes, dépenses, crédits et clôture journalière multi-équipe.
- **👥 Clients** - bons de livraison, factures, règlements et impayés.
- **🚚 Fournisseurs** - achats, règlements, avoirs et retenues à la source pour la fiscalité tunisienne.
- **🏦 Banque** - mouvements, rapprochement et position par banque.
- **🎴 Cartes & Bons** - cartes CN/Total, bons station et import CSV des extraits.
- **🔧 Entretien véhicules** - fiches d'entretien, services et lave-auto.
- **📊 Rapports** - journalier, mensuel, soldes clients/fournisseurs, export PDF et CSV.
- **👤 Utilisateurs** - comptes, rôles, activation et réinitialisation de mot de passe.
- **⚙️ Paramètres** - configuration de la station, logo, TVA, timbre et devise.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- pnpm >= 8.0.0 (le dépôt utilise pnpm 10)

```bash
npm install -g pnpm
```

- [MySQL](https://www.mysql.com/) 8.0, ou un serveur MySQL équivalent. phpMyAdmin est facultatif et peut servir à administrer la base.
- Git

## Project Structure

```text
station-service/
├── packages/
│   ├── api/                         # Express + mysql2 backend, port 4000
│   │   ├── sql/migrations/          # Migrations SQL MySQL à appliquer dans l'ordre
│   │   ├── src/
│   │   │   ├── modules/              # Modules métier et routes API
│   │   │   ├── middleware/           # Authentification et gestion d'erreurs
│   │   │   ├── lib/                  # Pool mysql2, PDF et utilitaires
│   │   │   └── index.ts              # Point d'entrée Express
│   │   ├── .env                      # Non versionné, à créer depuis .env.example
│   │   └── package.json
│   └── web/                          # React + Vite frontend, port 5173
│       ├── src/
│       │   ├── modules/              # Pages et hooks par module métier
│       │   ├── components/           # Composants partagés
│       │   ├── hooks/               # Hooks partagés et permissions
│       │   ├── lib/                  # Axios, auth et export CSV
│       │   └── main.tsx              # Point d'entrée React
│       ├── index.html
│       └── package.json
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/ibrahimjlidi/station-service.git
cd station-service
```

### 2. Install all dependencies

```bash
pnpm install
```

Cette commande installe les dépendances des deux packages via le workspace pnpm.

### 3. Configure the API environment

```bash
cd packages/api
cp .env.example .env
```

Configurez ensuite `packages/api/.env` :

```env
DB_HOST="127.0.0.1"
DB_USER="station"
DB_PASSWORD="change-this-password"
DB_NAME="station_service"
DB_PORT=3306
JWT_SECRET="change-this-to-a-long-random-string-minimum-32-chars"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

Générez une clé JWT aléatoire avec :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Configure the web environment

Le frontend utilise `http://localhost:4000` par défaut. Pour personnaliser cette URL :

```bash
cd ../web
Copy-Item .env.example .env
```

Sur macOS/Linux, utilisez `cp .env.example .env`.

```env
VITE_API_URL="http://localhost:4000"
```

### 5. Create the MySQL database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE station_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

Créez la base et l'utilisateur dans phpMyAdmin (ou avec le client MySQL). Les cinq variables `DB_*` doivent correspondre à cette base et à son compte.

### 6. Apply the MySQL migrations

Importez les fichiers SQL de `packages/api/sql/migrations/` dans phpMyAdmin, dans l'ordre alphabétique des dossiers de migration (les préfixes sont des horodatages). Ne réimportez pas une migration déjà appliquée. `station_service.sql` est un ancien dump de compatibilité et ne constitue pas le schéma courant de l'application.

### 7. Add optional demo data

Après avoir appliqué toutes les migrations, importez `packages/api/sql/seed.sql` dans phpMyAdmin pour ajouter des données de démonstration. Le script peut être relancé sans supprimer les enregistrements opérationnels. Les noms et les prix fournis sont des exemples : remplacez-les par vos données réelles avant utilisation.

### 8. Start the API server

```bash
pnpm dev
```

L'API écoute sur `http://localhost:4000`.

Vérifiez son état :

```bash
Invoke-WebRequest http://localhost:4000/health
```

Sur macOS/Linux :

```bash
curl http://localhost:4000/health
```

Réponse attendue : `{"status":"ok"}`.

### 9. Start the React frontend

Ouvrez un second terminal :

```bash
cd packages/web
pnpm dev
```

Ouvrez ensuite [http://localhost:5173](http://localhost:5173).

### 10. Create the first user

L'API n'expose pas d'inscription publique. Générez un hash bcrypt pour un mot de passe choisi dans `packages/api` :

```bash
node --input-type=module -e 'import bcrypt from "bcryptjs"; console.log(await bcrypt.hash(process.argv[1], 12))' 'CHOOSE_A_STRONG_PASSWORD'
```

Insérez le compte gérant dans phpMyAdmin en remplaçant `PASTE_BCRYPT_HASH` par le résultat :

```sql
INSERT INTO `User` (`magasinId`, `username`, `passwordHash`, `nom`, `prenom`, `role`, `actif`, `createdAt`, `updatedAt`)
VALUES (NULL, 'admin', 'PASTE_BCRYPT_HASH', 'Administrateur', 'Admin', 'gerant', TRUE, NOW(3), NOW(3));
```

Connectez-vous avec le mot de passe choisi. Ne stockez pas le mot de passe en clair dans la base.

## Running Both Packages

Depuis la racine, le script workspace démarre l'API et le frontend en parallèle :

```bash
pnpm dev
```

Les commandes ciblées restent disponibles :

```bash
pnpm --filter @station/api dev
pnpm --filter @station/web dev
```

## Docker Deployment

La stack Docker Compose lance MySQL 8.4, l'API Express et le frontend Nginx dans des conteneurs séparés. phpMyAdmin est également disponible pour administrer la base depuis un navigateur.

1. Installez Docker avec le plugin Docker Compose, puis créez le fichier de configuration local :

```bash
cp .env.docker.example .env
```

Remplacez les mots de passe et `JWT_SECRET` dans `.env` par des valeurs fortes avant de démarrer. Ce fichier est ignoré par Git.

2. Construisez et démarrez les conteneurs :

```bash
docker compose up -d --build
```

Lors de sa première initialisation, MySQL applique automatiquement les migrations dans l'ordre puis charge `packages/api/sql/seed.sql`. Les données sont conservées dans le volume `station_mysql_data`.

- Frontend : [http://localhost:5173](http://localhost:5173)
- API : [http://localhost:4000/health](http://localhost:4000/health)
- phpMyAdmin : [http://localhost:8080](http://localhost:8080) — connectez-vous avec `DB_USER` et `DB_PASSWORD` du fichier `.env`.
- MySQL depuis l'hôte : `127.0.0.1:3307`

Pour suivre le démarrage :

```bash
docker compose logs -f db api frontend phpmyadmin
```

Pour arrêter les conteneurs sans supprimer les données :

```bash
docker compose down
```

Les migrations et le seed ne sont lancés automatiquement que lors de la création initiale du volume. **Ne faites pas `docker compose down -v` sauf si vous souhaitez supprimer définitivement la base locale.**

## Available Scripts

| Package | Command | Description |
|---|---|---|
| Root | `pnpm dev` | Démarre l'API et le frontend en parallèle. |
| Root | `pnpm build` | Compile l'API et construit le frontend. |
| Root | `pnpm typecheck` | Vérifie les types des deux packages. |
| `packages/api` | `pnpm dev` | Démarre l'API avec rechargement via `tsx watch`. |
| `packages/api` | `pnpm build` | Compile l'API TypeScript dans `dist/`. |
| `packages/api` | `pnpm typecheck` | Vérifie les types de l'API. |
| `packages/api` | `pnpm start` | Lance l'API compilée. |
| `packages/web` | `pnpm dev` | Démarre Vite sur le port 5173. |
| `packages/web` | `pnpm build` | Vérifie TypeScript et construit `dist/`. |
| `packages/web` | `pnpm typecheck` | Vérifie les types du frontend. |
| `packages/web` | `pnpm preview` | Prévisualise le build frontend. |

## Environment Variables

### `packages/api/.env`

| Variable | Description | Exemple | Requise |
|---|---|---|---|
| `DB_HOST` | Hôte du serveur MySQL. | `127.0.0.1` | Oui |
| `DB_USER` | Utilisateur MySQL de l’API. | `station` | Oui |
| `DB_PASSWORD` | Mot de passe MySQL. | *(secret)* | Oui |
| `DB_NAME` | Nom de la base MySQL. | `station_service` | Oui |
| `DB_PORT` | Port MySQL. | `3306` | Non |
| `JWT_SECRET` | Secret de signature JWT. | `a8f3...` | Oui |
| `PORT` | Port d'écoute de l'API. | `4000` | Non |
| `CORS_ORIGIN` | Origines frontend autorisées. | `http://localhost:5173` | Non |

### `packages/web/.env`

| Variable | Description | Exemple | Requise |
|---|---|---|---|
| `VITE_API_URL` | URL de base de l'API. | `http://localhost:4000` | Non |

## User Roles

| Role | Description | Permissions |
|---|---|---|
| `gerant` | Responsable de station | Accès complet, rapports, utilisateurs et paramètres. |
| `caissier` | Opérateur de caisse | Caisse, recettes, dépenses, crédits, ventes, cartes et opérations autorisées. |
| `vendeur` | Personnel de vente | Accès aux données opérationnelles autorisées ; pas d'accès à la saisie ou clôture de caisse. |

## API Overview

Toutes les routes métier nécessitent un jeton Bearer, sauf `/health` et l'authentification.

### Authentification et utilisateurs

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/login` | Ouvre une session et retourne un jeton. |
| PATCH | `/auth/change-password` | Change le mot de passe de l'utilisateur connecté. |
| GET/POST | `/users` | Liste ou crée des utilisateurs. |
| PUT | `/users/:id` | Modifie un utilisateur. |
| PATCH | `/users/:id/reset-password` | Réinitialise un mot de passe. |

### Carburant

| Méthode | Route | Description |
|---|---|---|
| GET | `/cuves` | Liste les cuves. |
| GET | `/pompes` | Liste les pompes et leurs cuves. |
| GET | `/equipes` | Liste les équipes actives. |
| GET | `/caisses` | Liste les caisses actives. |
| GET | `/releves` | Liste les relevés de pompes. |
| POST | `/pompes/relever` | Ouvre un relevé. |
| PATCH | `/pompes/relever/:id/fermer` | Ferme un relevé. |
| GET | `/cuves/stock` | Calcule le stock des cuves. |

### Caisse

| Méthode | Route | Description |
|---|---|---|
| GET | `/caisse/modes-payment` | Liste les modes de paiement. |
| POST | `/caisse/recettes` | Crée ou récupère une session de recettes. |
| POST | `/caisse/recettes/:id/lignes` | Ajoute une recette. |
| POST | `/caisse/depenses` | Crée ou récupère une session de dépenses. |
| POST | `/caisse/depenses/:id/lignes` | Ajoute une dépense. |
| POST | `/caisse/credits` | Crée ou récupère une session de crédits. |
| POST | `/caisse/credits/:id/lignes` | Ajoute un crédit client. |
| POST | `/caisse/cloturer` | Clôture une équipe pour une date. |
| GET | `/caisse/resume/:date/:equipeId/:caisseId` | Retourne le résumé de caisse. |

### Clients et fournisseurs

| Méthode | Route | Description |
|---|---|---|
| GET/POST | `/clients` | Liste ou crée des clients. |
| GET | `/clients/:id` | Affiche le détail d'un client. |
| POST | `/bons-livraison` | Crée un bon de livraison. |
| POST | `/bons-livraison/:id/facturer` | Transforme un BL en facture. |
| GET | `/factures` | Liste les factures. |
| POST | `/reglements` | Enregistre un règlement client. |
| GET | `/impayes` | Liste les impayés. |
| GET/POST | `/fournisseurs` | Liste ou crée des fournisseurs. |
| POST | `/reglements-fournisseurs` | Enregistre un règlement fournisseur. |
| POST | `/retenues-source` | Enregistre une retenue à la source. |
| GET | `/libras` | Liste les taux de retenue. |

### Banque, boutique et cartes

| Méthode | Route | Description |
|---|---|---|
| GET/POST | `/banques` | Liste ou crée des banques. |
| GET | `/banques/:id/mouvements` | Liste les mouvements d'une banque. |
| POST | `/banques/mouvements` | Crée un mouvement bancaire. |
| PATCH | `/banques/mouvements/:id/rapprocher` | Rapproche un mouvement. |
| GET | `/banques/position/:id` | Calcule la position bancaire. |
| GET/POST | `/produits` | Liste ou crée des produits. |
| GET/POST | `/familles-produits` | Liste ou crée des familles. |
| POST | `/achats-produits` | Enregistre un achat boutique. |
| POST | `/inventaires` | Crée un inventaire. |
| PATCH | `/inventaires/:id/cloturer` | Clôture un inventaire. |
| GET | `/ventes/resume` | Retourne le résumé des ventes. |
| GET/POST | `/cartes` | Liste ou crée des cartes. |
| POST | `/cartes/import-cn` | Importe des extraits CN. |
| GET | `/cartes/extraits-cn` | Liste les extraits importés. |
| GET/POST | `/bons-station` | Liste ou crée des bons station. |

### Entretien, rapports, paramètres et santé

| Méthode | Route | Description |
|---|---|---|
| GET/POST | `/entretiens` | Liste ou crée des entretiens. |
| GET/POST | `/carwash` | Liste ou crée des opérations de lave-auto. |
| GET | `/rapports/journalier` | Génère un rapport journalier. |
| GET | `/rapports/mensuel` | Génère un rapport mensuel. |
| GET | `/rapports/stock-cuves` | Génère le rapport de stock. |
| GET | `/rapports/clients-soldes` | Liste les soldes clients. |
| GET | `/rapports/fournisseurs-soldes` | Liste les soldes fournisseurs. |
| POST | `/rapports/journalier/pdf` | Exporte le rapport journalier en PDF. |
| POST | `/rapports/facture/:id/pdf` | Exporte une facture en PDF. |
| GET/PUT | `/parametres` | Lit ou modifie la configuration station. |
| GET | `/parametres/compteur` | Lit les compteurs documentaires. |
| GET | `/health` | Vérifie que l'API répond. |

## Troubleshooting

1. **MySQL inaccessible** : vérifiez que le serveur fonctionne et que `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` et `DB_NAME` correspondent à votre configuration.
2. **Table ou colonne introuvable** : confirmez que toutes les migrations SQL ont été importées dans l'ordre et dans la bonne base.
3. **`Invalid JWT` sur toutes les requêtes** : `JWT_SECRET` diffère entre le token et le processus API. Déconnectez-vous, vérifiez `.env`, puis redémarrez l'API.
4. **`EADDRINUSE: port 4000`** : un autre processus utilise le port 4000. Arrêtez-le ou modifiez `PORT` et `VITE_API_URL` ensemble.
5. **Le frontend affiche `ERR_CONNECTION_REFUSED`** : l'API n'est pas démarrée sur l'URL configurée dans `VITE_API_URL`.
6. **Les listes affichent `No data`** : vérifiez le rôle connecté, le token et les réponses réseau. Les opérations de caisse sont réservées aux gérants et caissiers.
7. **`pnpm` est introuvable** : installez-le avec `npm install -g pnpm`, puis ouvrez un nouveau terminal.
8. **Un export PDF est vide ou échoue** : installez le navigateur Puppeteer avec `pnpm exec puppeteer browsers install chrome`.

## Changelog

### v1.1.0 — Legacy gap closure (2026)

#### New models
- `Vehicule` — autonomous vehicle registry linked to clients
- `Service` — service catalog for vehicle maintenance
- `RetourCuve` + `DetailRetour` — fuel return to tank workflow
- `InventaireCarburant` + `DetailInventaireCarburant` — dedicated fuel inventory
- `TauxTVA` — centralized VAT rate registry
- `FAMDEPENSE` — expense family referential with accounting codes

#### Updated models
- `Vendeur` — added default equipeId and magasinId
- `Pompe` — added default caisseId and magasinId
- `Depenses` — famDepenseId is a real FK to `FAMDEPENSE`
- `Entretien` and `Detentretien` — vehicle and service catalog links
- Fuel inventory and jaugeage fields now support physical stock workflows

#### New API routes
- Fuel returns, fuel inventories, and jaugeage comparisons
- Vehicle registry and maintenance history
- Maintenance service catalog
- Supplier credit notes
- TVA and expense-family referentials

#### New frontend pages
- Carburant: Retour Cuve, Inventaire Carburant, Jaugeages
- Entretien: Véhicules, Services
- Fournisseurs: Avoirs fournisseurs
- Référentiels: TVA, Familles dépenses, Services

#### Architecture
- JWTs carry `magasinId` and new operational workflows scope reads by store.
- The frontend auth store exposes `useMagasinId()`.

## License

MIT License

Copyright (c) 2026 Ibrahim Jlidi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
