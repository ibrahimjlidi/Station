import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_RULES } from '../../lib/business-rules.js';
import { fermerSessionSchema, ouvrirSessionSchema } from './schemas.js';

describe('Shift workflow contracts', () => {
  it('requires one opening reading per pump and one opening jaugeage per tank', () => {
    const parsed = ouvrirSessionSchema.parse({ date: '2026-09-16', equipeId: 1, caisseId: 1, vendeurId: 1, fondsCaisseOuverture: 200, pompes: [{ pompeId: 1, indexOuverture: 125892 }], jaugeagesOuverture: [{ cuveId: 1, stockPhysique: 18500 }] });
    assert.equal(parsed.pompes[0].indexOuverture, 125892);
    assert.equal(parsed.jaugeagesOuverture[0].stockPhysique, 18500);
  });

  it('rejects duplicate pumps and duplicate tanks in an opening payload', () => {
    assert.throws(() => ouvrirSessionSchema.parse({ date: '2026-09-16', equipeId: 1, caisseId: 1, vendeurId: 1, fondsCaisseOuverture: 200, pompes: [{ pompeId: 1, indexOuverture: 10 }, { pompeId: 1, indexOuverture: 10 }], jaugeagesOuverture: [{ cuveId: 1, stockPhysique: 100 }, { cuveId: 1, stockPhysique: 100 }] }));
  });

  it('rejects a closing payload without physical cash and pump readings', () => {
    assert.throws(() => fermerSessionSchema.parse({ date: '2026-09-16', equipeId: 1, caisseId: 1, especes: 200, carteBancaire: 0, fondsDeCaisseFermeture: 200, depotBanque: 0, jaugeagesFermeture: [] }));
  });

  it('keeps the business rules for indexes, jaugeage, funds, returns, and credit lines', () => {
    assert.equal(BUSINESS_RULES.INDEX_FERMETURE_MIN_DELTA, 0);
    assert.equal(BUSINESS_RULES.JAUGEAGE_BLOCK_THRESHOLD_LITRES, 500);
    assert.equal(BUSINESS_RULES.FONDS_CAISSE_TOLERANCE_TND, 1);
    assert.equal(BUSINESS_RULES.MAX_RETOUR_CUVE_LITRES_PER_POMPE, 20);
    assert.equal(BUSINESS_RULES.CREDIT_CREATES_RECETTE_LINE, true);
  });
});
