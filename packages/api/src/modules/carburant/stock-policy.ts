import type { Role } from '../../middleware/auth.js';

type StockPolicyError = Error & { statusCode: number };

function litres(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    const error = new Error(`${label} must be a finite, non-negative value.`) as StockPolicyError;
    error.statusCode = 400;
    throw error;
  }

  const scaled = value * 1000;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-7) {
    const error = new Error(`${label} must have at most three decimal places.`) as StockPolicyError;
    error.statusCode = 400;
    throw error;
  }

  return rounded;
}

export function netReceivedQuantity(purchased: number, returnedToSupplier: number) {
  const purchasedLitres = litres(purchased, 'Purchased quantity');
  const returnedLitres = litres(returnedToSupplier, 'Returned quantity');
  return (purchasedLitres - returnedLitres) / 1000;
}

export interface StockMovementInput {
  openingStock: number;
  purchases: number;
  sales: number;
  calibrationConsumed: number;
  calibrationReturned: number;
  supplierReturns: number;
  adjustments?: number;
}

export function expectedTankStock(input: StockMovementInput) {
  const openingStock = litres(input.openingStock, 'Opening stock');
  const purchases = litres(input.purchases, 'Purchases');
  const sales = litres(input.sales, 'Sales');
  const calibrationConsumed = litres(input.calibrationConsumed, 'Calibration draw');
  const calibrationReturned = litres(input.calibrationReturned, 'Calibration return');
  const supplierReturns = litres(input.supplierReturns, 'Supplier returns');
  const adjustments = litres(input.adjustments ?? 0, 'Inventory adjustments');

  const expected = openingStock + purchases - sales - calibrationConsumed + calibrationReturned - supplierReturns + adjustments;
  return expected / 1000;
}

export interface DipReconciliationInput extends StockMovementInput {
  actualDip: number;
  tolerance: number;
}

export function reconcileDip(input: DipReconciliationInput) {
  const actualDip = litres(input.actualDip, 'Actual dip reading');
  const tolerance = litres(input.tolerance, 'Tolerance');
  const expected = expectedTankStock(input);
  const expectedValue = litres(expected, 'Expected stock');
  const variance = actualDip - expectedValue;

  return {
    expectedStock: expected,
    actualDip: actualDip / 1000,
    variance: variance / 1000,
    balanced: Math.abs(variance) <= tolerance,
  };
}

export function authorizeInventoryAdjustment(role: Role, reason?: string) {
  if (role !== 'gerant') {
    const error = new Error('Only a manager can approve an inventory adjustment.') as StockPolicyError;
    error.statusCode = 403;
    throw error;
  }

  if (!reason?.trim()) {
    const error = new Error('A reason is required to approve an inventory adjustment.') as StockPolicyError;
    error.statusCode = 400;
    throw error;
  }
}
