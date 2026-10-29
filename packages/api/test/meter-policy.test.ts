import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeClosedIndexCorrection, authorizeOpeningIndex, soldQuantity } from '../src/modules/carburant/meter-policy.js';

test('accepts an opening index equal to the latest closing index', () => {
  assert.equal(authorizeOpeningIndex(12500, 12500, 'caissier'), 'continuous');
});

test('rejects a discontinuous opening index for a cashier', () => {
  assert.throws(
    () => authorizeOpeningIndex(12499, 12500, 'caissier'),
    (error: Error & { statusCode?: number }) => error.statusCode === 409,
  );
  assert.throws(
    () => authorizeOpeningIndex(12501, 12500, 'caissier'),
    (error: Error & { statusCode?: number }) => error.statusCode === 409,
  );
});

test('requires a manager and reason to initialize or correct the opening index', () => {
  assert.throws(
    () => authorizeOpeningIndex(100, null, 'caissier'),
    (error: Error & { statusCode?: number }) => error.statusCode === 403,
  );
  assert.throws(
    () => authorizeOpeningIndex(100, null, 'gerant'),
    (error: Error & { statusCode?: number }) => error.statusCode === 400,
  );
  assert.equal(authorizeOpeningIndex(100, null, 'gerant', 'Initial meter commissioning'), 'initialization');
  assert.equal(authorizeOpeningIndex(100.5, 100, 'gerant', 'Approved correction'), 'correction');
});

test('calculates sold litres at three-decimal meter precision, including zero sales', () => {
  assert.equal(soldQuantity(100, 120.125), 20.125);
  assert.equal(soldQuantity(100, 100), 0);
});

test('rejects invalid indices and a closing index below opening', () => {
  assert.throws(() => soldQuantity(100, 99.999), /greater than or equal/);
  assert.throws(() => soldQuantity(-1, 0), /non-negative/);
  assert.throws(() => soldQuantity(1.0001, 2), /three decimal places/);
});

test('requires elevated permission and a reason to alter a closed index', () => {
  assert.throws(
    () => authorizeClosedIndexCorrection('caissier', 'Correction'),
    (error: Error & { statusCode?: number }) => error.statusCode === 403,
  );
  assert.throws(
    () => authorizeClosedIndexCorrection('gerant'),
    (error: Error & { statusCode?: number }) => error.statusCode === 400,
  );
  assert.doesNotThrow(() => authorizeClosedIndexCorrection('gerant', 'Approved correction'));
});
