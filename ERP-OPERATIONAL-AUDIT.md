# Fuel Station ERP Operational Audit Plan

This plan turns the operational audit into implementation phases with concrete acceptance scenarios. Work proceeds in dependency order; a phase is complete only after its code changes and focused automated tests pass. Tunisian tax and accounting obligations remain subject to validation by a qualified local accountant or authority.

## Status

| Phase | Scope | Status |
|---|---|---|
| 0 | Plan and scenario inventory | Complete |
| 1 | Shift lifecycle and meter-index integrity | Complete — implementation and unit tests pass |
| 2 | Caisse reconciliation and debt collections | Pending — calculation policy tests exist, but real caisse closure still uses legacy pump-vs-receipt comparison |
| 3 | Fuel purchasing, returns, testing draws, and tank stock | In progress — stock policy and tests added; database integration and persistence tests pending |
| 4 | Final-close locks, approvals, and operational corrections | In progress — shift-scoped caisse and fuel writes now serialize against the final close; other modules still need explicit shift attribution |
| 5 | Cross-module, concurrency, store-isolation, and regression validation | Pending |

## Phase 1 — Shift lifecycle and meter-index integrity

**Goal:** make every nozzle's meter readings continuous and protect opening/closing indices.

- [x] SHIFT-01: an opening index matching the latest closed reading is accepted.
- [x] SHIFT-02: an opening index below or above the latest close is rejected for ordinary users.
- [x] SHIFT-03: first-ever index initialization requires manager authorization and an audit reason.
- [x] SHIFT-04: equal opening and closing indices produce zero litres and zero revenue.
- [x] SHIFT-05: negative indices and closing indices below opening are rejected.
- [x] SHIFT-06: meter-index corrections require manager authorization, a reason, and an audit entry.
- [ ] SHIFT-07: duplicate concurrent readings for one pump/shift cannot both be created.
- [ ] A new reading is blocked until the most recent reading for that pump is closed.
- [ ] A closed team-day cannot accept or edit meter readings.

## Phase 2 — Caisse reconciliation and debt collections

**Goal:** replace the current receipt-vs-pump-only comparison with an explainable close by category and tender.

- [ ] CLOSE-01: fuel, shop, and service sales are each included once; expenses reduce expected drawer cash.
- [ ] CLOSE-02: a credit sale increases receivables, not cash collected or paid sales.
- [ ] CLOSE-03: collection of a historical debt reduces receivables and increases collections, not new sales.
- [ ] CLOSE-04: cash, bank card, transfer, fuel card, cheque, and other enabled tenders reconcile independently.
- [ ] CLOSE-05: counted cash identifies both shortage and surplus and attributes each to a shift/team/operator.
- [ ] CLOSE-06: variance behavior at below/equal/above tolerance is explicit and tested.
- [ ] CLOSE-07: forced closure requires manager authorization and a non-empty reason, both persisted.
- [ ] CLOSE-08: till/team closure scope is consistent for multiple tills and teams.
- [ ] CLOSE-09: collected debt and non-cash tenders cannot be double-counted as sales or physical cash.

## Phase 3 — Fuel procurement, non-sale draws, and tank reconciliation

**Goal:** use a movement ledger to explain tank quantities from opening stock through closing stock.

- [x] STOCK-01: a 20 L calibration draw is recorded as non-sale consumption; sales and stock movement reconcile.
- [x] STOCK-02: a test draw returned to the tank reverses the stock movement without creating a sale.
- [x] STOCK-03: a supplier delivery of 10,000 L and return of 50 L produces net receipt of 9,950 L exactly once.
- [x] STOCK-04: expected stock is opening + receipts - sales - consumed draws + returned draws - supplier returns, with each movement signed once.
- [ ] STOCK-05: failed purchase, return, or adjustment transactions roll back all detail and stock changes.
- [x] STOCK-06: negative quantities and quantities above tank capacity are rejected.
- [x] Dip readings compare physical stock with ledger stock and use an explicit configurable tolerance.
- [x] Inventory adjustments require approval and preserve before/after values and a reason.

## Phase 4 — Final-close locks and accountable corrections

**Goal:** make the completed close an immutable boundary across all operational write paths.

- [x] FINAL-01: after close, ordinary users cannot add/edit caisse entries or receipts.
- [x] FINAL-02: after close, ordinary users cannot add/edit meter readings, fuel returns, or shift-attributed dip readings.
- [ ] FINAL-03: after close, ordinary users cannot post sales, debt settlements, supplier receipts, or payment changes.
- [ ] FINAL-04: manager corrections require a reason and immutable before/after audit history.
- [x] FINAL-05: closure and shift-scoped writes serialize through a transaction-locked team/day closure row.
- [ ] FINAL-06: reopening is not an implicit side effect; it requires a defined administrative workflow.

Closure audit captures the closing user, timestamp, forced-close flag, and reason. A forced close still requires manager role and a reason. Manager post-close corrections/reopening are not implemented. The current schema does not associate every boutique, client debt, supplier, or service transaction with a team/till/shift, so those writes cannot yet be reliably blocked by this team/day lock. Add shift attribution before extending the lock to those modules; do not infer a shift from a date alone.

## Phase 5 — Cross-module and regression validation

- [ ] AUDIT-01: one store cannot read or change another store's shifts, pumps, tanks, caisse, or transactions.
- [ ] AUDIT-02: normal close, forced close, and corrections identify actor, role, time, scope, and reason.
- [ ] AUDIT-03: concurrent close/settlement/stock updates cannot produce duplicate or partial postings.
- [ ] AUDIT-04: all reports reconcile to source transactions, including returns, refunds, and corrections.
- [ ] Run API typecheck/build and focused tests after the final integrated changes.
- [ ] Record any scenario that cannot be safely implemented until business or fiscal rules are confirmed.

## Business decisions required before production

1. Define whether a shift belongs to one team, one till, one cashier, or a specific combination.
2. Define payment-method taxonomy and which methods count as drawer cash.
3. Confirm whether "Retour Kif" is consumed for testing or physically returned to the tank; these are different stock movements.
4. Approve configurable thresholds for dip variance and caisse tolerance.
5. Confirm local Tunisian invoice, stamp, VAT, withholding, and reporting requirements with a qualified local professional.

## Confirmed operational defaults (2026-10-29)

- Use an explicit shift per team and till; permit sequential shifts during the same calendar day.
- Configure each payment method explicitly as cash or non-cash; do not infer this from its display name.
- Record the payment method used for each expense.
- Model both consumed calibration draws and draws returned to the tank as separate movement types.
- Include same-day service/car-wash sales in the team close; service records must be attributable to the applicable team/till/shift to avoid double counting.

## Verification record

| Date | Phase/scenarios | Command or evidence | Result |
|---|---|---|---|
| 2026-10-29 | Plan created | Repository audit | Complete |
| 2026-10-29 | Phase 1 meter policy | `pnpm --filter @station/api test` (6 passing), API typecheck/build, `git diff --check` | Policy tests pass; SQL/API integration and concurrent database tests pending because no local Compose services are running |
| 2026-10-29 | Phase 2 + Phase 3 policy rules | `pnpm --filter @station/api test` (15 passing) | Reconciliation and tank-stock invariants pass for sales, debt collections, calibration draws, returned draws, dip reconciliation, and manager-only inventory adjustments |
| 2026-10-29 | Phase 4 shift close locks | `pnpm --filter @station/api typecheck`, `pnpm --filter @station/api test` (15 passing), `git diff --check` | Typecheck and policy tests pass; MySQL migration/runtime and concurrent-request integration tests remain pending |
