# Legacy dump compatibility report

Date: 2026-09-16

## Scope

Compared:

- `station_service.sql`: WinDev/MySQL DDL dump.
- `packages/api/prisma/schema.prisma`: current Prisma/MySQL application schema.
- `packages/api/src/modules/*/router.ts`: current API actions.

## Immediate conclusion

The dump is schema-only. It contains `CREATE TABLE`, indexes, and foreign keys, but no `INSERT INTO` or `LOAD DATA` statements. It cannot restore historical records by itself.

It must be imported into a separate legacy database, never into the Prisma database. A data migration will require a second export containing rows or access to the original legacy database.

## Inventory

| Source | Count | Meaning |
|---|---:|---|
| Legacy SQL tables | 77 | WinDev table definitions |
| Current Prisma models | 56 | Current application persistence models |
| Current Prisma enums | 2 | `Role`, `TypeAchatEssence` |
| Legacy explicit foreign keys | 19 | Several business links remain unenforced |
| Legacy data statements | 0 | No historical rows in this file |

## Direct domain correspondences

| Legacy tables | Current Prisma models | Status |
|---|---|---|
| `Achat_essence`, `Detail_achat_essence` | `AchatEssence`, `DetailAchatEssence` | Needs column and total mapping |
| `Achat_prod`, `Detail_achat_prod` | `AchatProd`, `DetailAchatProd` | Needs column and total mapping |
| `Banque`, `DETMVTBQ`, `ageocomptemode` | `Banque`, `DetMvtBq`, `AgeoCompteMode` | Good domain match; IDs differ |
| `Bonliv`, `Detbonliv` | `Bonliv`, `Detbonliv` | Needs ID and total mapping |
| `facture`, `detfact` | `Facture`, `Detfact` | Needs ID and total mapping |
| `Client` | `Client` | Legacy has more contact/account fields |
| `Fournisseur` | `Fournisseur` | Legacy has more contact/account fields |
| `Produit`, `Famille_produit` | `Produit`, `FamilleProduit` | Needs code and family mapping |
| `Cuve`, `Pompe` | `Cuve`, `Pompe` | Needs price, stock, and ID mapping |
| `Equipe`, `Caisse`, `Vendeur` | `Equipe`, `Caisse`, `Vendeur` | Needs identity mapping |
| `Recettes_caisse`, `Detail_recette_caisse` | `RecetteCaisse`, `DetailRecetteCaisse` | Good domain match |
| `Depenses_caisse`, `Detail_depenses` | `DepensesCaisse`, `DetailDepenses` | Good domain match |
| `Credit_caisse`, `Detail_credit` | `CreditCaisse`, `DetailCredit` | Good domain match |
| `Jours_clotures` | `JoursClotures` | Good domain match |
| `MobVCar_caisse` | `MobVCarCaisse` | Legacy closure is non-null; current closure is nullable |
| `car_prod_siege` | `CarProdSiege` | Needs sales and product mapping |
| `CARTES`, `Bons_station`, `EXTRAIT_CN` | `Cartes`, `BonsStation`, `ExtractCN` | Needs date/identifier mapping |
| `Entretien`, `Detentretien`, `CARWASH` | `Entretien`, `Detentretien`, `CarWash` | Services/vehicles need special handling |
| `INVENT`, `DETINVENT` | `Invent`, `DetInvent` | Operator and stock mapping required |
| `transfert_etranger`, `Dettrans_etranger` | `TransEtranger`, `DetTransEtranger` | Good domain match |
| `ENTAVOIR`, `ENTRAS`, `DETRAS`, `LIBRAS` | `EntAvoir`, `EntRas`, `DetRas`, `LibRas` | Good domain match with renamed fields |
| `Compteur` | `Compteur` | Legacy counters have different names |

## Legacy tables with no direct current model

These require either a new model or an explicit decision to archive/ignore them:

- `COMPTE`: replaced by `User`; passwords cannot be copied as plaintext.
- `Param`: replaced by `SetParam`.
- `SOCIETE`: partially represented by `Station` and `Magasin`.
- `Operation_bancaire`: no current dedicated model.
- `Taux_tva`: current schema stores VAT on business records; no dedicated table.
- `FAMDEPENSE`: currently represented only by `Depenses.numFamDep`.
- `Retour_cuve`, `Detail_retour`: no current return-cuve models or API.
- `Vehicule`: no current vehicle model.
- `Service`: services are currently represented by `Produit` for maintenance lines.
- `INVENTCAR`, `DETINVENTCAR`: no dedicated fuel inventory models.
- `Vente_car_caisse`, `Vente_prod_caisse`, `Vente_ser_caisse`: behavior is consolidated into `MobVCarCaisse` and `CarProdSiege`.
- `RapportMail`, `PAPENTETE`, `PROJET`: technical/legacy features with no current equivalent.
- `Intermed_*`: legacy reporting/intermediate tables; not application source-of-truth models.

## Current models absent from the legacy dump

- `User`
- `Station`
- `Magasin`
- `SetParam` as the current configuration model

The current multi-site hierarchy is new:

```text
Station
└── Magasin
    ├── Caisse
    ├── Equipe
    ├── Cuve
    └── Pompe (through Cuve)
```

## Relation differences

| Legacy relation | Current behavior | Migration impact |
|---|---|---|
| `Pompe.id_caisse` | Caisse is attached to each operation; pump points to `Cuve` | Resolve historical caisse per reading/sale |
| `Vendeur.IDEquipe` | Team is attached to each operation | Map each historical row, not only the seller |
| `Achat_essence.id_fournisseur` | `AchatEssence.fournisseurId` | Map legacy supplier IDs |
| `Produit.id_fournisseur` | Nullable `Produit.fournisseurId` | Preserve zero/unmatched suppliers as null and report them |
| `Produit.code_famille` | `Produit.familleId` | Map legacy family IDs |
| `Jaugeage.IDCuve` | `Jaugeage.cuveId` with team/caisse required | Historical rows may need default team/caisse policy |
| `Bonliv.IDClient` | `Bonliv.clientId` with required FK | Orphan BL rows must be rejected or quarantined |
| `facture.NUMBL` | `Facture.numBL` with required FK | Invoice/BL identity must be mapped before import |
| `Detail_*` parent IDs | Explicit Prisma relations with cascade/restrict rules | Import parents before children |
| No legacy station/store relation | `Station` and `Magasin` scope resources | Assign all imported resources to `Station El Amal / Magasin principal` |

## Type and identity differences

- Legacy money uses `DOUBLE`, `REAL`, or `NUMERIC` inconsistently.
- Current financial fields use `Decimal(15,3)`.
- Legacy IDs are manually supplied business identifiers; current IDs are mostly auto-increment integers.
- Legacy product IDs are `VARCHAR(13)`; current `Produit.id` is integer and `code` is unique text.
- Legacy booleans use `TINYINT`; current schema uses Prisma `Boolean`.
- Legacy account passwords are `VARCHAR(50)`; current `User.passwordHash` requires bcrypt-compatible hashes.
- Legacy naming includes accents, uppercase names, and encoding problems such as `R�glement_four`; mappings must use explicit aliases.

## Current API coverage

Current API already covers:

- authentication and user management;
- stations and automatic store creation;
- caisses, équipes, cuves and pompes;
- pump readings and closure;
- caisse recettes, dépenses, crédits and closure;
- clients, BL, invoices, payments and unpaid balances;
- suppliers, purchases, payments and withholding taxes;
- banks, movements, reconciliation and position;
- products, families, purchases, inventories and transfers;
- cards, station vouchers and CN imports;
- maintenance and car wash;
- daily/monthly reports and PDF exports.

Current API/model gaps relative to the legacy domain:

- vehicle master data and vehicle history;
- dedicated maintenance service catalog;
- fuel-tank returns;
- dedicated fuel inventory;
- dedicated VAT reference table;
- dedicated bank operation catalog;
- full jaugeage CRUD;
- full supplier credit-note CRUD;
- strict station/store filtering on every operational query.

## Safe migration plan

1. Create a separate `station_service_legacy` database.
2. Import this DDL there only.
3. Obtain a separate data export or connect to the original populated legacy database.
4. Back up the current Prisma database before any data migration.
5. Create explicit legacy-to-current mapping tables.
6. Import referentials first, then transactional parents, then detail rows.
7. Convert all money values to `Decimal(15,3)`.
8. Assign imported resources to `Station El Amal / Magasin principal`.
9. Quarantine orphaned rows instead of inventing foreign keys.
10. Generate an import report with read/imported/skipped/error counts.
11. Re-run validation queries and business totals before enabling imported data.

No data import should be attempted from this file until a populated legacy data source is available.
