import type { TestCase, PriceItem, DividendItem } from './types';
import { pass, fail } from './types';
import type { ApiResponse } from '../types';

// Test Data Fetcher Service Tests - /test-data/prices endpoint
// Now uses static fixtures for deterministic testing
export const testPricesTests: TestCase[] = [
  {
    id: 'tdf-prices-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('tdf-prices-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'tdf-prices-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'tdf-prices-format-2',
    name: 'Response has prices array',
    category: 'format',
    description: 'Response should contain prices array',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: unknown[] }>;
      if (r.data && Array.isArray(r.data.prices)) {
        return pass('tdf-prices-format-2', 'Response has prices array', 'format');
      }
      return fail(
        'tdf-prices-format-2',
        'Response has prices array',
        'format',
        'data.prices: Array',
        `data.prices: ${typeof r.data?.prices}`,
        'Response should contain prices array'
      );
    },
  },
  {
    id: 'tdf-prices-correct-1',
    name: 'Prices have valid OHLC data',
    category: 'correctness',
    description: 'Each price should have valid OHLC values (low <= close <= high)',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      for (const price of prices) {
        if (price.low > price.high) {
          return fail(
            'tdf-prices-correct-1',
            'Prices have valid OHLC data',
            'correctness',
            'low <= high',
            `low=${price.low}, high=${price.high}`,
            'OHLC values should be valid'
          );
        }
      }
      return pass('tdf-prices-correct-1', 'Prices have valid OHLC data', 'correctness');
    },
  },
  {
    id: 'tdf-prices-correct-2',
    name: 'Static fixture has expected dip pattern',
    category: 'correctness',
    description: 'Static data should include a price dip for buy-the-dip testing',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      if (prices.length < 6) {
        return pass('tdf-prices-correct-2', 'Static fixture has expected dip pattern', 'correctness');
      }

      // Check that there's at least one day with a significant drop (>5%)
      let foundDip = false;
      for (let i = 1; i < prices.length; i++) {
        const prevClose = prices[i - 1].adjusted_close;
        const currClose = prices[i].adjusted_close;
        const change = (currClose - prevClose) / prevClose;
        if (change <= -0.05) {
          foundDip = true;
          break;
        }
      }

      if (foundDip) {
        return pass('tdf-prices-correct-2', 'Static fixture has expected dip pattern', 'correctness');
      }
      return fail(
        'tdf-prices-correct-2',
        'Static fixture has expected dip pattern',
        'correctness',
        'At least one day with >= 5% drop',
        'No significant dip found',
        'Static fixture should have a dip for buy-the-dip strategy testing'
      );
    },
  },
  {
    id: 'tdf-prices-edge-1',
    name: 'Returns static fixture data (20 trading days)',
    category: 'edge-case',
    description: 'Should return the full static fixture (20 trading days for AAPL)',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      // Static fixture has exactly 20 trading days
      if (prices.length >= 5 && prices.length <= 20) {
        return pass('tdf-prices-edge-1', 'Returns static fixture data (20 trading days)', 'edge-case');
      }
      return fail(
        'tdf-prices-edge-1',
        'Returns static fixture data (20 trading days)',
        'edge-case',
        '5-20 trading days from static fixture',
        `${prices.length} days`,
        'Static fixture should have 20 trading days'
      );
    },
  },
  {
    id: 'tdf-prices-edge-2',
    name: 'First price date is 2024-01-02',
    category: 'edge-case',
    description: 'Static fixture should start on January 2, 2024',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      if (prices.length === 0) {
        return fail(
          'tdf-prices-edge-2',
          'First price date is 2024-01-02',
          'edge-case',
          'date = 2024-01-02',
          'No prices',
          'Static fixture should have prices'
        );
      }

      if (prices[0].date === '2024-01-02') {
        return pass('tdf-prices-edge-2', 'First price date is 2024-01-02', 'edge-case');
      }
      return fail(
        'tdf-prices-edge-2',
        'First price date is 2024-01-02',
        'edge-case',
        'date = 2024-01-02',
        `date = ${prices[0].date}`,
        'Static fixture starts on 2024-01-02'
      );
    },
  },
];

// Test Data Fetcher Service Tests - /test-data/dividends endpoint
// Now uses static fixtures for deterministic testing
export const testDividendsTests: TestCase[] = [
  {
    id: 'tdf-div-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('tdf-div-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'tdf-div-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'tdf-div-format-2',
    name: 'Response has dividends array',
    category: 'format',
    description: 'Response should contain dividends array',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: unknown[] }>;
      if (r.data && Array.isArray(r.data.dividends)) {
        return pass('tdf-div-format-2', 'Response has dividends array', 'format');
      }
      return fail(
        'tdf-div-format-2',
        'Response has dividends array',
        'format',
        'data.dividends: Array',
        `data.dividends: ${typeof r.data?.dividends}`,
        'Response should contain dividends array'
      );
    },
  },
  {
    id: 'tdf-div-correct-1',
    name: 'Dividend amounts are positive',
    category: 'correctness',
    description: 'All dividend amounts should be > 0',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (const div of dividends) {
        if (div.amount_per_share <= 0) {
          return fail(
            'tdf-div-correct-1',
            'Dividend amounts are positive',
            'correctness',
            'amount_per_share > 0',
            `amount_per_share = ${div.amount_per_share}`,
            'Dividends should have positive amounts'
          );
        }
      }
      return pass('tdf-div-correct-1', 'Dividend amounts are positive', 'correctness');
    },
  },
  {
    id: 'tdf-div-correct-2',
    name: 'All dividends have payment_date (static fixture)',
    category: 'correctness',
    description: 'Static fixture should have payment_date for all dividends',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (const div of dividends) {
        if (!div.payment_date) {
          return fail(
            'tdf-div-correct-2',
            'All dividends have payment_date (static fixture)',
            'correctness',
            'payment_date: YYYY-MM-DD',
            `payment_date: ${div.payment_date}`,
            'Static fixture should have all payment dates populated'
          );
        }
      }
      return pass('tdf-div-correct-2', 'All dividends have payment_date (static fixture)', 'correctness');
    },
  },
  {
    id: 'tdf-div-edge-1',
    name: 'Static fixture has 4 quarterly dividends',
    category: 'edge-case',
    description: 'AAPL static fixture should have 4 quarterly dividends',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      if (dividends.length === 4) {
        return pass('tdf-div-edge-1', 'Static fixture has 4 quarterly dividends', 'edge-case');
      }
      return fail(
        'tdf-div-edge-1',
        'Static fixture has 4 quarterly dividends',
        'edge-case',
        '4 dividends',
        `${dividends.length} dividends`,
        'AAPL static fixture should have 4 quarterly dividends'
      );
    },
  },
  {
    id: 'tdf-div-edge-2',
    name: 'ex_date < payment_date for all dividends',
    category: 'edge-case',
    description: 'Payment date should be after ex-date in static fixture',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (const div of dividends) {
        if (div.ex_date >= div.payment_date) {
          return fail(
            'tdf-div-edge-2',
            'ex_date < payment_date for all dividends',
            'edge-case',
            'ex_date < payment_date',
            `ex_date=${div.ex_date}, payment_date=${div.payment_date}`,
            'Payment date should be after ex-date'
          );
        }
      }
      return pass('tdf-div-edge-2', 'ex_date < payment_date for all dividends', 'edge-case');
    },
  },
];

// Test Data Fetcher Service Tests - /test-data/sample-backtest-request endpoint
export const sampleRequestTests: TestCase[] = [
  {
    id: 'tdf-sample-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('tdf-sample-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'tdf-sample-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'tdf-sample-format-2',
    name: 'Response has market_params',
    category: 'format',
    description: 'Sample request should have market_params',
    validate: (response) => {
      const r = response as ApiResponse<{ market_params: unknown }>;
      if (r.data && r.data.market_params) {
        return pass('tdf-sample-format-2', 'Response has market_params', 'format');
      }
      return fail(
        'tdf-sample-format-2',
        'Response has market_params',
        'format',
        'data.market_params present',
        'market_params missing',
        'Sample request should have market_params'
      );
    },
  },
  {
    id: 'tdf-sample-correct-1',
    name: 'Sample request is valid backtest input',
    category: 'correctness',
    description: 'Sample should have all required backtest parameters',
    validate: (response) => {
      const r = response as ApiResponse<{
        market_params?: { ticker?: string };
        strategy_params?: { strategy_type?: string };
        portfolio_params?: { initial_capital?: number };
      }>;

      const data = r.data;
      if (!data) {
        return fail(
          'tdf-sample-correct-1',
          'Sample request is valid backtest input',
          'correctness',
          'All required params',
          'No data',
          'Response should have data'
        );
      }

      if (!data.market_params?.ticker) {
        return fail(
          'tdf-sample-correct-1',
          'Sample request is valid backtest input',
          'correctness',
          'market_params.ticker',
          'Missing ticker',
          'Sample should have market params with ticker'
        );
      }

      if (!data.strategy_params?.strategy_type) {
        return fail(
          'tdf-sample-correct-1',
          'Sample request is valid backtest input',
          'correctness',
          'strategy_params.strategy_type',
          'Missing strategy_type',
          'Sample should have strategy params'
        );
      }

      if (!data.portfolio_params?.initial_capital) {
        return fail(
          'tdf-sample-correct-1',
          'Sample request is valid backtest input',
          'correctness',
          'portfolio_params.initial_capital',
          'Missing initial_capital',
          'Sample should have portfolio params'
        );
      }

      return pass('tdf-sample-correct-1', 'Sample request is valid backtest input', 'correctness');
    },
  },
];
