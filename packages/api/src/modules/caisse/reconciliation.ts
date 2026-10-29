export interface TenderCollection {
  amount: number;
  isCash: boolean;
  source: 'sale' | 'debt';
}

export interface CashExpense extends TenderCollection {}

export interface ReconciliationInput {
  fuelSales: number;
  shopSales: number;
  serviceSales: number;
  creditSales: number;
  collections: TenderCollection[];
  expenses: CashExpense[];
  openingCash: number;
  countedCash: number;
  tolerance: number;
}

export interface ReconciliationResult {
  totalSales: number;
  paidSales: number;
  debtCollections: number;
  expectedCollections: number;
  actualCollections: number;
  collectionVariance: number;
  expectedCash: number;
  cashVariance: number;
  balanced: boolean;
}

function millimes(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite, non-negative amount.`);
  }
  const scaled = value * 1000;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-7) {
    throw new Error(`${label} must have at most three decimal places.`);
  }
  return rounded;
}

export function reconcileShift(input: ReconciliationInput): ReconciliationResult {
  const fuelSales = millimes(input.fuelSales, 'Fuel sales');
  const shopSales = millimes(input.shopSales, 'Shop sales');
  const serviceSales = millimes(input.serviceSales, 'Service sales');
  const creditSales = millimes(input.creditSales, 'Credit sales');
  const openingCash = millimes(input.openingCash, 'Opening cash');
  const countedCash = millimes(input.countedCash, 'Counted cash');
  const tolerance = millimes(input.tolerance, 'Tolerance');

  const totalSales = fuelSales + shopSales + serviceSales;
  if (creditSales > totalSales) {
    throw new Error('Credit sales cannot exceed total sales for the shift.');
  }

  const collections = input.collections.map((item) => ({
    amount: millimes(item.amount, 'Collection'),
    isCash: item.isCash,
    source: item.source,
  }));
  const expenses = input.expenses.map((item) => ({
    amount: millimes(item.amount, 'Expense'),
    isCash: item.isCash,
  }));

  const actualCollections = collections.reduce((sum, item) => sum + item.amount, 0);
  const cashCollections = collections.reduce((sum, item) => sum + (item.isCash ? item.amount : 0), 0);
  const cashExpenses = expenses.reduce((sum, item) => sum + (item.isCash ? item.amount : 0), 0);
  const debtCollections = collections
    .filter((item) => item.source === 'debt')
    .reduce((sum, item) => sum + item.amount, 0);
  const expectedCollections = totalSales - creditSales + debtCollections;
  const expectedCash = openingCash + cashCollections - cashExpenses;
  const collectionVariance = actualCollections - expectedCollections;
  const cashVariance = countedCash - expectedCash;

  return {
    totalSales: totalSales / 1000,
    paidSales: (totalSales - creditSales) / 1000,
    debtCollections: debtCollections / 1000,
    expectedCollections: expectedCollections / 1000,
    actualCollections: actualCollections / 1000,
    collectionVariance: collectionVariance / 1000,
    expectedCash: expectedCash / 1000,
    cashVariance: cashVariance / 1000,
    balanced: Math.abs(collectionVariance) <= tolerance && Math.abs(cashVariance) <= tolerance,
  };
}
