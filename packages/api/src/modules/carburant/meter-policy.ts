import type { Role } from '../../middleware/auth.js';

type MeterPolicyError = Error & { statusCode: number };
type OpeningDecision = 'continuous' | 'initialization' | 'correction';

function milliLitres(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    const error = new Error(`${label} must be a finite, non-negative value.`) as MeterPolicyError;
    error.statusCode = 400;
    throw error;
  }
  const scaled = value * 1000;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-7) {
    const error = new Error(`${label} must have at most three decimal places.`) as MeterPolicyError;
    error.statusCode = 400;
    throw error;
  }
  return rounded;
}

export function authorizeOpeningIndex(
  proposed: number,
  previous: number | null,
  role: Role,
  reason?: string,
): OpeningDecision {
  const proposedValue = milliLitres(proposed, 'Opening index');
  const previousValue = previous === null ? null : milliLitres(previous, 'Previous closing index');

  if (previousValue !== null && proposedValue === previousValue) return 'continuous';
  if (role !== 'gerant') {
    const error = new Error(previousValue === null
      ? 'First meter index initialization requires manager authorization.'
      : `Opening index must match the previous closing index (${previous?.toFixed(3)}).`) as MeterPolicyError;
    error.statusCode = previousValue === null ? 403 : 409;
    throw error;
  }
  if (!reason?.trim()) {
    const error = new Error('A reason is required for meter index initialization or correction.') as MeterPolicyError;
    error.statusCode = 400;
    throw error;
  }
  return previousValue === null ? 'initialization' : 'correction';
}

export function soldQuantity(opening: number, closing: number) {
  const openingValue = milliLitres(opening, 'Opening index');
  const closingValue = milliLitres(closing, 'Closing index');
  if (closingValue < openingValue) {
    const error = new Error('Closing index must be greater than or equal to opening index.') as MeterPolicyError;
    error.statusCode = 400;
    throw error;
  }
  return (closingValue - openingValue) / 1000;
}

export function authorizeClosedIndexCorrection(role: Role, reason?: string) {
  if (role !== 'gerant') {
    const error = new Error('Only a manager can correct a closed meter index.') as MeterPolicyError;
    error.statusCode = 403;
    throw error;
  }
  if (!reason?.trim()) {
    const error = new Error('A reason is required to correct a closed meter index.') as MeterPolicyError;
    error.statusCode = 400;
    throw error;
  }
}
