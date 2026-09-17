import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { promotionSchema, ticketSchema } from './schema.js';

describe('POS workflow contracts', () => {
  it('requires a payment and rejects empty ticket lines', () => {
    assert.throws(() => ticketSchema.parse({ caisseId: 2, equipeId: 1, vendeurId: 1, lignes: [], paiements: [] }));
  });

  it('accepts POS promotions and decimal-friendly ticket inputs', () => {
    const promotion = promotionSchema.parse({ libelle: 'Cafe du matin', dateDebut: '2026-09-17', dateFin: '2026-09-30', remise: '0.300', produitIds: [10] });
    const ticket = ticketSchema.parse({ caisseId: 2, equipeId: 1, vendeurId: 1, lignes: [{ produitId: 10, quantite: '2', remise: '0.300' }], paiements: [{ modePaymentId: 1, montant: '4.500' }] });
    const total = new Prisma.Decimal('2').times('2.100').minus('0.300');
    assert.equal(promotion.remise, 0.3);
    assert.equal(ticket.lignes[0].quantite, 2);
    assert.equal(total.toFixed(3), '3.900');
  });
});
