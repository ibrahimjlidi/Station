# Station Service ERP

Monorepo pnpm pour la gestion d'une station-service: API Express/mysql2/MySQL et interface React/Ant Design.

## Prerequis

- Node.js 20+
- pnpm 10+
- MySQL 8

## Installation

```bash
pnpm install
```

Creer une base MySQL et copier les fichiers d'environnement:

```bash
Copy-Item packages/api/.env.example packages/api/.env
Copy-Item packages/web/.env.example packages/web/.env
```

Configurer les variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` et `DB_PORT` dans `packages/api/.env`. Créer la base dans phpMyAdmin puis appliquer les migrations SQL dans `packages/api/sql/migrations/`, dans l'ordre des préfixes de dossiers:

```bash
ls packages/api/sql/migrations
```

Importer le contenu de chaque `migration.sql` dans phpMyAdmin. Les migrations sont des instructions MySQL natives; ne les réexécutez pas sur une base déjà migrée.

## Checklist fonctionnelle

### API

- Auth: `POST /auth/login`; bootstrap du premier gérant via phpMyAdmin, puis gestion des comptes avec les routes protégées `/users`.
- Carburant: `GET /cuves`, `GET /pompes`, `GET /equipes`, `GET /caisses`, `GET /vendeurs`, `GET /releves`, `POST /pompes/relever`, `PATCH /pompes/relever/:id/fermer`, `GET /cuves/stock`
- Caisse: sessions et lignes `POST /caisse/recettes`, `POST /caisse/recettes/:id/lignes`, `POST /caisse/depenses`, `POST /caisse/depenses/:id/lignes`, `POST /caisse/credits`, `POST /caisse/credits/:id/lignes`, `POST /caisse/cloturer`, `GET /caisse/resume/:date/:equipeId/:caisseId`
- Clients: `GET|POST /clients`, `GET|PUT /clients/:id`, `GET|POST /bons-livraison`, `POST /bons-livraison/:id/facturer`, `GET /factures`, `POST /reglements`, `GET /impayes`, `GET /produits`
- Fournisseurs: `GET|POST /fournisseurs`, `PUT /fournisseurs/:id`, `GET /achats`, `POST|GET /reglements-fournisseurs`, `POST|GET /retenues-source`, `GET /libras`
- Banque: `GET|POST /banques`, `GET /banques/:id/mouvements`, `POST /banques/mouvements`, `PATCH /banques/mouvements/:id/rapprocher`, `GET /banques/position/:banqueId`, `GET|POST /banques/config`
- Boutique: `GET|POST /produits`, `PUT /produits/:id`, `GET|POST /familles-produits`, `POST|GET /achats-produits`, `POST /inventaires`, `PATCH /inventaires/:id/cloturer`, `GET /inventaires`, `GET /ventes/resume`, `POST /transferts`
- Cartes: `GET|POST /cartes`, `PATCH /cartes/:id/valider`, `POST /cartes/import-cn`, `GET /cartes/extraits-cn`, `POST|GET /bons-station`
- Entretien: `GET|POST /entretiens`, `GET /entretiens/:id`, `GET|POST /carwash`
- Parametres: `GET|PUT /parametres`, `GET /parametres/compteur`
- Rapports: `GET /rapports/journalier`, `GET /rapports/mensuel`, `GET /rapports/stock-cuves`, `GET /rapports/clients-soldes`, `GET /rapports/fournisseurs-soldes`, `POST /rapports/journalier/pdf`, `POST /rapports/facture/:id/pdf`

### Pages React

- Dashboard: `/`
- Carburant: `/carburant/releves`, `/carburant/stock`
- Caisse: `/caisse/saisie`, `/caisse/cloture`
- Clients: `/clients`, `/clients/bl`, `/clients/factures`, `/clients/impayes`
- Fournisseurs: `/fournisseurs`, `/fournisseurs/reglements`, `/fournisseurs/retenues`
- Banque: `/banque/mouvements`, `/banque/position`
- Boutique: `/boutique/produits`, `/boutique/achats`, `/boutique/inventaire`, `/boutique/ventes`
- Cartes: `/cartes`, `/cartes/import`
- Entretien: `/entretien`, `/entretien/carwash`
- Rapports: `/rapports/journalier`, `/rapports/mensuel`, `/rapports/clients`, `/rapports/fournisseurs`
- Parametres: `/systeme`

Lancer les deux applications:

```bash
pnpm dev
```

- Interface: http://localhost:5173
- API: http://localhost:4000/health

Le premier utilisateur peut etre cree par `POST /auth/register` avec `username`, `password`, `nom` et `role`. Les roles disponibles sont `gerant`, `caissier` et `vendeur`.

## Scripts

- `pnpm build`: construit l'API et le frontend
- `pnpm typecheck`: verifie les types des deux packages
