import type { ServiceName, TestCategory, TestResult } from '../types';

// Test case definition - what gets registered in test suites
export interface TestCase {
  id: string;
  name: string;
  category: TestCategory;
  description: string;
  // Custom input for this specific test (overrides default endpoint testInput)
  input?: Record<string, unknown>;
  // Validation function that checks the response and returns a result
  validate: (response: unknown, input: Record<string, unknown>) => TestResult;
}

// Test suite for an endpoint
export interface TestSuite {
  service: ServiceName;
  endpoint: string;
  tests: TestCase[];
}

// Helper to create a passing test result
export function pass(testId: string, name: string, category: TestCategory): TestResult {
  return {
    testId,
    name,
    category,
    passed: true,
  };
}

// Helper to create a failing test result
export function fail(
  testId: string,
  name: string,
  category: TestCategory,
  expected: string,
  actual: string,
  message?: string
): TestResult {
  return {
    testId,
    name,
    category,
    passed: false,
    expected,
    actual,
    message,
  };
}

// Price data structure from responses
export interface PriceItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

// Signal structure from strategy responses
export interface SignalItem {
  date: string;
  action: 'BUY' | 'SELL';
  price: number;
  trigger_details?: {
    price_change_pct?: number;
    lookback_price?: number;
    threshold?: number;
    [key: string]: unknown;
  };
}

// Portfolio time series - parallel arrays structure (matches API response)
export interface TimeSeries {
  dates: string[];
  portfolio_value: number[];
  holdings_value: number[];
  cash_balance: number[];
  shares_held: number[];
  cumulative_invested: number[];
  cumulative_dividends: number[];
}

// Portfolio final state
export interface FinalState {
  total_shares: number;
  cash_balance: number;
  holdings_value: number;
  portfolio_value: number;
  total_invested: number;
  total_dividends_received: number;
  total_transaction_costs: number;
}

// Trade record
export interface TradeRecord {
  date: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  cost: number;
  transaction_cost: number;
}

// Portfolio simulation response data
export interface PortfolioData {
  time_series: TimeSeries;
  trades: TradeRecord[];
  final_state: FinalState;
}

// Metrics for a single portfolio (matches API response from docs/architecture.md)
export interface PortfolioMetrics {
  total_return_pct: number;
  annualized_return_pct: number;
  max_drawdown_pct: number;
  max_drawdown_duration_days: number;
  volatility_annualized_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
}

// Dividend data structure
export interface DividendItem {
  ex_date: string;
  payment_date: string;
  amount_per_share: number;
}
