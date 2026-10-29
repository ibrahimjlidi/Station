import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizeInventoryAdjustment, expectedTankStock, netReceivedQuantity, reconcileDip } from '../src/modules/carburant/stock-policy.js';

test('calculates net received quantity from purchases and supplier returns', () => {
  assert.equal(netReceivedQuantity(10000, 50), 9950);
});

test('records a 20 L calibration draw as a non-sale stock movement', () => {
  const actual = expectedTankStock({
    openingStock: 5000,
    purchases: 10000,
    sales: 2500,
    calibrationConsumed: 20,
    calibrationReturned: 0,
    supplierReturns: 50,
  });

  assert.equal(actual, 12430);
});

test('allows a returned calibration draw to reverse the stock movement without creating a sale', () => {
  const actual = expectedTankStock({
    openingStock: 5000,
    purchases: 10000,
    sales: 2500,
    calibrationConsumed: 20,
    calibrationReturned: 12,
    supplierReturns: 50,
  });

  assert.equal(actual, 12442);
});

test('reconciles dip readings against expected tank stock and tolerance', () => {
  const result = reconcileDip({
    openingStock: 5000,
    purchases: 10000,
    sales: 2500,
    calibrationConsumed: 20,
    calibrationReturned: 0,
    supplierReturns: 50,
    actualDip: 12430.5,
    tolerance: 1,
  });

  assert.equal(result.expectedStock, 12430);
  assert.equal(result.actualDip, 12430.5);
  assert.equal(result.variance, 0.5);
  assert.equal(result.balanced, true);
});

test('rejects negative stock values and requires manager authorization for adjustments', () => {
  assert.throws(() => netReceivedQuantity(-1, 0), /non-negative/);
  assert.throws(() => authorizeInventoryAdjustment('caissier', 'reason'), /Only a manager/);
  assert.throws(() => authorizeInventoryAdjustment('gerant'), /A reason is required/);
});
