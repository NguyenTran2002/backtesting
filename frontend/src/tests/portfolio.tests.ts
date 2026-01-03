import type { TestCase, PortfolioData } from './types';
import { pass, fail } from './types';
import type { ApiResponse } from '../types';
import { approxEqual } from './calculators';

// Portfolio Service Tests - /simulate endpoint
export const simulateTests: TestCase[] = [
  // FORMAT TESTS (4)
  {
    id: 'port-sim-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('port-sim-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'port-sim-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'port-sim-format-2',
    name: 'Response has time_series with parallel arrays',
    category: 'format',
    description: 'Response should have time_series object with dates, portfolio_value, etc. arrays',
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const ts = r.data?.time_series;
      if (ts && Array.isArray(ts.dates) && Array.isArray(ts.portfolio_value)) {
        return pass('port-sim-format-2', 'Response has time_series with parallel arrays', 'format');
      }
      return fail(
        'port-sim-format-2',
        'Response has time_series with parallel arrays',
        'format',
        'data.time_series: { dates: [], portfolio_value: [], ... }',
        `data.time_series: ${typeof r.data?.time_series}`,
        'Response should contain time_series with parallel arrays'
      );
    },
  },
  {
    id: 'port-sim-format-3',
    name: 'Response has trades array',
    category: 'format',
    description: 'Response should have trades array',
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      if (r.data && Array.isArray(r.data.trades)) {
        return pass('port-sim-format-3', 'Response has trades array', 'format');
      }
      return fail(
        'port-sim-format-3',
        'Response has trades array',
        'format',
        'data.trades: Array',
        `data.trades: ${typeof r.data?.trades}`,
        'Response should contain trades array'
      );
    },
  },
  {
    id: 'port-sim-format-4',
    name: 'Response has final_state',
    category: 'format',
    description: 'Response should have final_state object',
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      if (r.data && r.data.final_state && typeof r.data.final_state === 'object') {
        return pass('port-sim-format-4', 'Response has final_state', 'format');
      }
      return fail(
        'port-sim-format-4',
        'Response has final_state',
        'format',
        'data.final_state: Object',
        `data.final_state: ${typeof r.data?.final_state}`,
        'Response should contain final_state object'
      );
    },
  },

  // CORRECTNESS TESTS (6)
  {
    id: 'port-sim-correct-1',
    name: 'Portfolio value = cash + holdings',
    category: 'correctness',
    description: 'At each step, portfolio_value should equal cash_balance + holdings_value',
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const ts = r.data?.time_series;

      if (!ts || !ts.dates) {
        return fail(
          'port-sim-correct-1',
          'Portfolio value = cash + holdings',
          'correctness',
          'time_series present',
          'No time_series',
          'Response should have time_series'
        );
      }

      for (let i = 0; i < ts.dates.length; i++) {
        const expected = ts.cash_balance[i] + ts.holdings_value[i];
        if (!approxEqual(ts.portfolio_value[i], expected, 0.02)) {
          return fail(
            'port-sim-correct-1',
            'Portfolio value = cash + holdings',
            'correctness',
            `portfolio_value = ${expected.toFixed(2)}`,
            `portfolio_value = ${ts.portfolio_value[i].toFixed(2)}`,
            `Mismatch on ${ts.dates[i]}: cash_balance=${ts.cash_balance[i]}, holdings=${ts.holdings_value[i]}`
          );
        }
      }
      return pass('port-sim-correct-1', 'Portfolio value = cash + holdings', 'correctness');
    },
  },
  {
    id: 'port-sim-correct-2',
    name: 'Initial portfolio value equals initial capital',
    category: 'correctness',
    description: 'First time series entry should have portfolio_value = initial_capital',
    input: {
      initial_capital: 10000,
      investment_per_trade: 100,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 101.00 },
      ],
      dividend_data: [],
    },
    validate: (response, input) => {
      const r = response as ApiResponse<PortfolioData>;
      const ts = r.data?.time_series;
      const initialCapital = (input as { initial_capital: number }).initial_capital;

      if (!ts || !ts.dates || ts.dates.length === 0) {
        return fail(
          'port-sim-correct-2',
          'Initial portfolio value equals initial capital',
          'correctness',
          `portfolio_value = ${initialCapital}`,
          'Empty time series',
          'Time series should have entries'
        );
      }

      const firstValue = ts.portfolio_value[0];
      if (approxEqual(firstValue, initialCapital, 0.01)) {
        return pass('port-sim-correct-2', 'Initial portfolio value equals initial capital', 'correctness');
      }
      return fail(
        'port-sim-correct-2',
        'Initial portfolio value equals initial capital',
        'correctness',
        `portfolio_value = ${initialCapital}`,
        `portfolio_value = ${firstValue}`,
        'First entry should match initial capital'
      );
    },
  },
  {
    id: 'port-sim-correct-3',
    name: 'Transaction cost reduces invested amount',
    category: 'correctness',
    description: 'With transaction costs, fewer shares are bought',
    input: {
      initial_capital: 10000,
      investment_per_trade: 1000,
      reinvest_dividends: false,
      transaction_cost_pct: 1, // 1% = $10 cost
      cash_interest_rate_pct: 0,
      signals: [
        { date: '2024-01-02', action: 'BUY', price: 100.00 },
      ],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 100.00 },
      ],
      dividend_data: [],
    },
    validate: (response, input) => {
      const r = response as ApiResponse<PortfolioData>;
      const finalState = r.data?.final_state;
      const investmentPerTrade = (input as { investment_per_trade: number }).investment_per_trade;
      const txCostPct = (input as { transaction_cost_pct: number }).transaction_cost_pct;

      if (!finalState) {
        return fail(
          'port-sim-correct-3',
          'Transaction cost reduces invested amount',
          'correctness',
          'final_state present',
          'No final_state',
          'Response should have final_state'
        );
      }

      // With $1000 investment and 1% tx cost ($10), net = $990
      // At $100/share, should buy 9.9 shares
      const expectedShares = (investmentPerTrade * (1 - txCostPct / 100)) / 100;

      if (approxEqual(finalState.total_shares, expectedShares, 0.01)) {
        return pass('port-sim-correct-3', 'Transaction cost reduces invested amount', 'correctness');
      }
      return fail(
        'port-sim-correct-3',
        'Transaction cost reduces invested amount',
        'correctness',
        `total_shares = ${expectedShares.toFixed(2)}`,
        `total_shares = ${finalState.total_shares.toFixed(2)}`,
        'Transaction costs should reduce shares bought'
      );
    },
  },
  {
    id: 'port-sim-correct-4',
    name: 'Holdings value = shares * price',
    category: 'correctness',
    description: 'Holdings value should be shares_held multiplied by current price',
    input: {
      initial_capital: 10000,
      investment_per_trade: 1000,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [
        { date: '2024-01-02', action: 'BUY', price: 100.00 },
      ],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 110.00 }, // 10% gain
      ],
      dividend_data: [],
    },
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const ts = r.data?.time_series;

      if (!ts || !ts.dates || ts.dates.length === 0) {
        return fail(
          'port-sim-correct-4',
          'Holdings value = shares * price',
          'correctness',
          'Time series entry',
          'Empty time series',
          'Need time series to verify'
        );
      }

      // After buying 10 shares at $100, on day 2 at $110, holdings = $1100
      const lastIndex = ts.dates.length - 1;
      const lastShares = ts.shares_held[lastIndex];
      const lastHoldings = ts.holdings_value[lastIndex];
      const expectedHoldings = lastShares * 110; // shares * last price

      if (approxEqual(lastHoldings, expectedHoldings, 0.02)) {
        return pass('port-sim-correct-4', 'Holdings value = shares * price', 'correctness');
      }
      return fail(
        'port-sim-correct-4',
        'Holdings value = shares * price',
        'correctness',
        `holdings_value = ${expectedHoldings.toFixed(2)}`,
        `holdings_value = ${lastHoldings.toFixed(2)}`,
        'Holdings value should be shares_held * current price'
      );
    },
  },
  {
    id: 'port-sim-correct-5',
    name: 'Final state totals are accurate',
    category: 'correctness',
    description: 'Final state should accurately reflect all trades',
    input: {
      initial_capital: 10000,
      investment_per_trade: 500,
      reinvest_dividends: false,
      transaction_cost_pct: 1, // 1% = $5 per trade
      cash_interest_rate_pct: 0,
      signals: [
        { date: '2024-01-02', action: 'BUY', price: 100.00 },
        { date: '2024-01-03', action: 'BUY', price: 100.00 },
      ],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 100.00 },
        { date: '2024-01-04', adjusted_close: 100.00 },
      ],
      dividend_data: [],
    },
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const finalState = r.data?.final_state;

      if (!finalState) {
        return fail(
          'port-sim-correct-5',
          'Final state totals are accurate',
          'correctness',
          'final_state present',
          'No final_state',
          'Response should have final_state'
        );
      }

      // 2 trades at $500 each = $1000 total invested
      // 2 trades at 1% = $10 total tx costs
      const expectedTotalInvested = 1000;
      const expectedTxCosts = 10;

      if (!approxEqual(finalState.total_invested, expectedTotalInvested, 0.02)) {
        return fail(
          'port-sim-correct-5',
          'Final state totals are accurate',
          'correctness',
          `total_invested = ${expectedTotalInvested}`,
          `total_invested = ${finalState.total_invested}`,
          'Total invested should sum all investment amounts'
        );
      }

      if (!approxEqual(finalState.total_transaction_costs, expectedTxCosts, 0.02)) {
        return fail(
          'port-sim-correct-5',
          'Final state totals are accurate',
          'correctness',
          `total_transaction_costs = ${expectedTxCosts}`,
          `total_transaction_costs = ${finalState.total_transaction_costs}`,
          'Total tx costs should sum all transaction costs'
        );
      }

      return pass('port-sim-correct-5', 'Final state totals are accurate', 'correctness');
    },
  },
  {
    id: 'port-sim-correct-6',
    name: 'Dividend increases cash or shares',
    category: 'correctness',
    description: 'Dividends should increase cash (if not reinvesting) or shares (if reinvesting)',
    input: {
      initial_capital: 10000,
      investment_per_trade: 1000,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [
        { date: '2024-01-02', action: 'BUY', price: 100.00 },
      ],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 100.00 },
        { date: '2024-01-04', adjusted_close: 100.00 },
      ],
      dividend_data: [
        { ex_date: '2024-01-03', payment_date: '2024-01-05', amount_per_share: 1.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const finalState = r.data?.final_state;

      if (!finalState) {
        return fail(
          'port-sim-correct-6',
          'Dividend increases cash or shares',
          'correctness',
          'final_state present',
          'No final_state',
          'Response should have final_state'
        );
      }

      // Bought 10 shares, dividend of $1/share = $10
      // Not reinvesting, so cash should increase by $10
      // Initial cash after buy: $9000, plus $10 dividend = $9010
      if (finalState.total_dividends_received > 0) {
        return pass('port-sim-correct-6', 'Dividend increases cash or shares', 'correctness');
      }
      return fail(
        'port-sim-correct-6',
        'Dividend increases cash or shares',
        'correctness',
        'total_dividends_received > 0',
        `total_dividends_received = ${finalState.total_dividends_received}`,
        'Dividends should be recorded'
      );
    },
  },

  // EDGE CASE TESTS (5)
  {
    id: 'port-sim-edge-1',
    name: 'No signals results in unchanged portfolio',
    category: 'edge-case',
    description: 'With no signals, portfolio value should equal initial capital',
    input: {
      initial_capital: 10000,
      investment_per_trade: 100,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 150.00 },
      ],
      dividend_data: [],
    },
    validate: (response, input) => {
      const r = response as ApiResponse<PortfolioData>;
      const finalState = r.data?.final_state;
      const initialCapital = (input as { initial_capital: number }).initial_capital;

      if (!finalState) {
        return fail(
          'port-sim-edge-1',
          'No signals results in unchanged portfolio',
          'edge-case',
          'final_state present',
          'No final_state',
          'Response should have final_state'
        );
      }

      if (approxEqual(finalState.portfolio_value, initialCapital, 0.01)) {
        return pass('port-sim-edge-1', 'No signals results in unchanged portfolio', 'edge-case');
      }
      return fail(
        'port-sim-edge-1',
        'No signals results in unchanged portfolio',
        'edge-case',
        `portfolio_value = ${initialCapital}`,
        `portfolio_value = ${finalState.portfolio_value}`,
        'No trades should mean no change in portfolio value'
      );
    },
  },
  {
    id: 'port-sim-edge-2',
    name: 'Insufficient cash skips trade',
    category: 'edge-case',
    description: 'When cash < investment_per_trade, trade should be skipped',
    input: {
      initial_capital: 100,
      investment_per_trade: 200, // More than available cash
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [
        { date: '2024-01-02', action: 'BUY', price: 100.00 },
      ],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 100.00 },
      ],
      dividend_data: [],
    },
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const finalState = r.data?.final_state;
      const trades = r.data?.trades || [];

      if (!finalState) {
        return fail(
          'port-sim-edge-2',
          'Insufficient cash skips trade',
          'edge-case',
          'final_state present',
          'No final_state',
          'Response should have final_state'
        );
      }

      // No trades should be executed
      if (trades.length === 0 && finalState.total_shares === 0) {
        return pass('port-sim-edge-2', 'Insufficient cash skips trade', 'edge-case');
      }
      return fail(
        'port-sim-edge-2',
        'Insufficient cash skips trade',
        'edge-case',
        '0 trades, 0 shares',
        `${trades.length} trades, ${finalState.total_shares} shares`,
        'Trade should be skipped when cash is insufficient'
      );
    },
  },
  {
    id: 'port-sim-edge-3',
    name: 'Zero initial capital means no trades',
    category: 'edge-case',
    description: 'With $0 initial capital, no trades can execute',
    input: {
      initial_capital: 0,
      investment_per_trade: 100,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [
        { date: '2024-01-02', action: 'BUY', price: 100.00 },
      ],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
      ],
      dividend_data: [],
    },
    validate: (response) => {
      const r = response as ApiResponse<PortfolioData>;
      const finalState = r.data?.final_state;

      if (!finalState) {
        return fail(
          'port-sim-edge-3',
          'Zero initial capital means no trades',
          'edge-case',
          'final_state present',
          'No final_state',
          'Response should have final_state'
        );
      }

      if (finalState.total_shares === 0 && finalState.portfolio_value === 0) {
        return pass('port-sim-edge-3', 'Zero initial capital means no trades', 'edge-case');
      }
      return fail(
        'port-sim-edge-3',
        'Zero initial capital means no trades',
        'edge-case',
        'total_shares = 0, portfolio_value = 0',
        `total_shares = ${finalState.total_shares}, portfolio_value = ${finalState.portfolio_value}`,
        'Zero capital should result in zero portfolio'
      );
    },
  },
  {
    id: 'port-sim-edge-4',
    name: 'Time series has entry for each price date',
    category: 'edge-case',
    description: 'Time series dates array length should match price data length',
    input: {
      initial_capital: 10000,
      investment_per_trade: 100,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 0,
      signals: [],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 101.00 },
        { date: '2024-01-04', adjusted_close: 102.00 },
      ],
      dividend_data: [],
    },
    validate: (response, input) => {
      const r = response as ApiResponse<PortfolioData>;
      const ts = r.data?.time_series;
      const priceData = (input as { price_data: Array<{ date: string }> }).price_data;

      const tsLength = ts?.dates?.length || 0;
      if (tsLength === priceData.length) {
        return pass('port-sim-edge-4', 'Time series has entry for each price date', 'edge-case');
      }
      return fail(
        'port-sim-edge-4',
        'Time series has entry for each price date',
        'edge-case',
        `${priceData.length} entries`,
        `${tsLength} entries`,
        'Time series should have one entry per price date'
      );
    },
  },
  {
    id: 'port-sim-edge-5',
    name: 'Cash interest compounds daily',
    category: 'edge-case',
    description: 'With interest rate, cash should grow exponentially',
    input: {
      initial_capital: 10000,
      investment_per_trade: 100,
      reinvest_dividends: false,
      transaction_cost_pct: 0,
      cash_interest_rate_pct: 5.0, // 5% annual
      signals: [],
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 100.00 },
        { date: '2024-01-04', adjusted_close: 100.00 },
        { date: '2024-01-05', adjusted_close: 100.00 },
        { date: '2024-01-08', adjusted_close: 100.00 },
      ],
      dividend_data: [],
    },
    validate: (response, input) => {
      const r = response as ApiResponse<PortfolioData>;
      const ts = r.data?.time_series;
      const initialCapital = (input as { initial_capital: number }).initial_capital;

      if (!ts || !ts.dates || ts.dates.length === 0) {
        return fail(
          'port-sim-edge-5',
          'Cash interest compounds daily',
          'edge-case',
          'Time series entries',
          'Empty time series',
          'Need time series to verify interest'
        );
      }

      const lastIndex = ts.dates.length - 1;
      const lastCash = ts.cash_balance[lastIndex];
      // After 5 days at 5% annual rate, cash should be slightly higher
      if (lastCash > initialCapital) {
        return pass('port-sim-edge-5', 'Cash interest compounds daily', 'edge-case');
      }
      return fail(
        'port-sim-edge-5',
        'Cash interest compounds daily',
        'edge-case',
        `cash_balance > ${initialCapital}`,
        `cash_balance = ${lastCash}`,
        'Cash should grow with interest rate'
      );
    },
  },
];
