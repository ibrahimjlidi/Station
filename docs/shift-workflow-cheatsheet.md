# Shift Workflow Cheat Sheet

All calls use the REST bearer token returned by `/auth/login`.

## 1. Check the suggested opening

```http
GET /carburant/session/suggested-opening?date=2026-09-17&equipeId=1&caisseId=1
Authorization: Bearer <TOKEN>
```

Confirm the returned pump indexes, tank levels, and previous cash balance before opening.

## 2. Open the shift

```http
POST /carburant/session/ouvrir
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "date": "2026-09-17",
  "equipeId": 1,
  "caisseId": 1,
  "vendeurId": 1,
  "fondsCaisseOuverture": 200,
  "pompes": [
    { "pompeId": 1, "indexOuverture": 125892.000 },
    { "pompeId": 2, "indexOuverture": 98734.500 }
  ],
  "jaugeagesOuverture": [
    { "cuveId": 1, "stockPhysique": 18500.000 },
    { "cuveId": 2, "stockPhysique": 34200.000 }
  ]
}
```

The response returns `sessionId`, `recetteCaisseId`, and any jaugeage or cash-fund warnings.

## 3. Add a recette

```http
POST /caisse/recettes/{recetteCaisseId}/lignes
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "modePaymentId": 1,
  "montant": 45.500,
  "numero": ""
}
```

## 4. Add a dépense

Create the header first when needed:

```http
POST /caisse/depenses
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "date": "2026-09-17",
  "equipeId": 1,
  "caisseId": 1,
  "vendeurId": 1
}
```

Then add the line:

```http
POST /caisse/depenses/{depenseId}/lignes
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "codeDepense": 3,
  "montant": 20.000,
  "libelle": "Produits nettoyage pompes"
}
```

## 5. Add a client credit

Create the credit header when needed:

```http
POST /caisse/credits
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "date": "2026-09-17",
  "equipeId": 1,
  "caisseId": 1,
  "vendeurId": 1
}
```

Add the credit line. The API also creates the matching `DetailRecetteCaisse` line using the Crédit client payment mode.

```http
POST /caisse/credits/{creditId}/lignes
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "clientId": 3,
  "montant": 155.000,
  "libelle": "Gasoil 100L - Taxi Nabeul",
  "modePayment": "Crédit client"
}
```

## 6. Read the live reconciliation

```http
GET /caisse/resume/2026-09-17/1/1
Authorization: Bearer <TOKEN>
```

Use `recettesTotaux`, `theorique`, and `ecartProvisoire` to correct discrepancies before closing.

## 7. Close the shift

```http
POST /carburant/session/fermer
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "date": "2026-09-17",
  "equipeId": 1,
  "caisseId": 1,
  "releveesPompes": [
    { "pompeId": 1, "indexFermeture": 126350.000, "retourVolume": 0 },
    { "pompeId": 2, "indexFermeture": 99200.000, "retourVolume": 2.000 }
  ],
  "especes": 850.000,
  "cheques": [
    { "montant": 320.000, "numeroCheque": "CH-001", "clientNom": "Client exemple" }
  ],
  "carteBancaire": 420.000,
  "fondsDeCaisseFermeture": 200.000,
  "depotBanque": 650.000,
  "jaugeagesFermeture": [
    { "cuveId": 1, "stockPhysique": 17800.000 },
    { "cuveId": 2, "stockPhysique": 33000.000 }
  ],
  "commentaireEcart": ""
}
```

The response contains the theoretical totals, declared total, discrepancy status, and sales by pump. A closed session cannot accept further recette, dépense, or credit lines.
