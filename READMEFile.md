# Station Service ERP

Monorepo pnpm pour la gestion d'une station-service: API Express/Prisma/MySQL et interface React/Ant Design.

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

Adapter `DATABASE_URL` dans `packages/api/.env`, puis generer le client et appliquer la premiere migration:

```bash
pnpm --filter @station/api prisma:generate
pnpm --filter @station/api prisma:migrate -- --name init
```

Pour appliquer les modules suivants et initialiser les taux tunisiens de retenue à la source:

```bash
pnpm --filter @station/api prisma:migrate -- --name add_caisse_module
pnpm --filter @station/api prisma:migrate -- --name add_clients_fournisseurs
pnpm --filter @station/api prisma:seed
```

Pour Banque & Boutique, la migration demandee est:

```bash
pnpm --filter @station/api prisma:migrate -- --name add_banque_boutique
```

Si Prisma affiche une confirmation interactive dans PowerShell, generer puis appliquer sans prompt:

```bash
pnpm --filter @station/api prisma:migrate -- --name add_banque_boutique --create-only
pnpm --filter @station/api exec prisma migrate deploy
```

La migration finale demandee est:

```bash
pnpm --filter @station/api prisma:migrate -- --name add_rapports_finitions
```

## Checklist fonctionnelle

### API

- Auth: `POST /auth/login`, `POST /auth/register`
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
- `pnpm db:generate`: regenere le client Prisma
- `pnpm db:migrate`: lance Prisma Migrate dans l'API
