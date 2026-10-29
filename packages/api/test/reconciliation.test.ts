import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileShift } from '../src/modules/caisse/reconciliation.js';

test('reconciles category sales, credit sales, debt collections, tenders, and cash expenses', () => {
  const result = reconcileShift({
    fuelSales: 100,
    shopSales: 20,
    serviceSales: 10,
    creditSales: 30,
    openingCash: 20,
    countedCash: 101.5,
    tolerance: 0.5,
    collections: [
      { amount: 80, isCash: true, source: 'sale' },
      { amount: 15, isCash: false, source: 'sale' },
      { amount: 10, isCash: true, source: 'debt' },
    ],
    expenses: [{ amount: 8, isCash: true }],
  });

  assert.deepEqual(result, {
    totalSales: 130,
    paidSales: 100,
    debtCollections: 10,
    expectedCollections: 110,
    actualCollections: 105,
    collectionVariance: -5,
    expectedCash: 102,
    cashVariance: -0.5,
    balanced: false,
  });
});

test('does not count credit sales as collections or non-cash tenders as drawer cash', () => {
  const result = reconcileShift({
    fuelSales: 50,
    shopSales: 0,
    serviceSales: 0,
    creditSales: 20,
    openingCash: 5,
    countedCash: 10,
    tolerance: 0,
    collections: [
      { amount: 30, isCash: true, source: 'sale' },
      { amount: 20, isCash: false, source: 'sale' },
      { amount: 15, isCash: false, source: 'debt' },
    ],
    expenses: [{ amount: 10, isCash: false }],
  });

  assert.equal(result.paidSales, 30);
  assert.equal(result.expectedCollections, 45);
  assert.equal(result.actualCollections, 65);
  assert.equal(result.expectedCash, 35);
  assert.equal(result.cashVariance, -25);
});

test('accepts a variance exactly at tolerance and identifies excess cash', () => {
  const result = reconcileShift({
    fuelSales: 10,
    shopSales: 0,
    serviceSales: 0,
    creditSales: 0,
    openingCash: 2,
    countedCash: 12.5,
    tolerance: 0.5,
    collections: [{ amount: 10, isCash: true, source: 'sale' }],
    expenses: [],
  });

  assert.equal(result.cashVariance, 0.5);
  assert.equal(result.balanced, true);
});

test('rejects invalid amounts and credit sales exceeding total sales', () => {
  assert.throws(() => reconcileShift({
    fuelSales: 10,
    shopSales: 0,
    serviceSales: 0,
    creditSales: 11,
    openingCash: 0,
    countedCash: 0,
    tolerance: 0,
    collections: [],
    expenses: [],
  }), /cannot exceed total sales/);

  assert.throws(() => reconcileShift({
    fuelSales: 10.0001,
    shopSales: 0,
    serviceSales: 0,
    creditSales: 0,
    openingCash: 0,
    countedCash: 0,
    tolerance: 0,
    collections: [],
    expenses: [],
  }), /three decimal places/);
});
