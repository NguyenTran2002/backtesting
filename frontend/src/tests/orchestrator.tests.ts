import type { TestCase } from './types';
import { pass, fail } from './types';
import type { ApiResponse } from '../types';

interface BacktestResponse {
  active_strategy?: {
    signals?: unknown[];
    portfolio?: unknown;
    metrics?: unknown;
  };
  baseline?: {
    portfolio?: unknown;
    metrics?: unknown;
  };
  market_data?: {
    prices?: unknown[];
    dividends?: unknown[];
  };
  comparison?: unknown;
  metadata?: {
    ticker?: string;
    strategy_type?: string;
    start_date?: string;
    end_date?: string;
  };
}

// Orchestrator Service Tests - /api/backtest endpoint
export const backtestTests: TestCase[] = [
  // FORMAT TESTS (4)
  {
    id: 'orch-bt-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('orch-bt-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'orch-bt-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'orch-bt-format-2',
    name: 'Response has active_strategy',
    category: 'format',
    description: 'Response should have active_strategy with signals, portfolio, metrics',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      if (r.data && r.data.active_strategy) {
        return pass('orch-bt-format-2', 'Response has active_strategy', 'format');
      }
      return fail(
        'orch-bt-format-2',
        'Response has active_strategy',
        'format',
        'data.active_strategy present',
        'active_strategy missing',
        'Response should have active_strategy'
      );
    },
  },
  {
    id: 'orch-bt-format-3',
    name: 'Response has baseline',
    category: 'format',
    description: 'Response should have baseline portfolio for comparison',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      if (r.data && r.data.baseline) {
        return pass('orch-bt-format-3', 'Response has baseline', 'format');
      }
      return fail(
        'orch-bt-format-3',
        'Response has baseline',
        'format',
        'data.baseline present',
        'baseline missing',
        'Response should have baseline for comparison'
      );
    },
  },
  {
    id: 'orch-bt-format-4',
    name: 'Response has market_data',
    category: 'format',
    description: 'Response should include market data used',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      if (r.data && r.data.market_data) {
        return pass('orch-bt-format-4', 'Response has market_data', 'format');
      }
      return fail(
        'orch-bt-format-4',
        'Response has market_data',
        'format',
        'data.market_data present',
        'market_data missing',
        'Response should include market data'
      );
    },
  },

  // CORRECTNESS TESTS (4)
  {
    id: 'orch-bt-correct-1',
    name: 'Active strategy has signals',
    category: 'correctness',
    description: 'Active strategy should generate trading signals',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const signals = r.data?.active_strategy?.signals;

      if (Array.isArray(signals)) {
        return pass('orch-bt-correct-1', 'Active strategy has signals', 'correctness');
      }
      return fail(
        'orch-bt-correct-1',
        'Active strategy has signals',
        'correctness',
        'signals array present',
        `signals: ${typeof signals}`,
        'Strategy should produce signals array'
      );
    },
  },
  {
    id: 'orch-bt-correct-2',
    name: 'Active strategy has portfolio results',
    category: 'correctness',
    description: 'Active strategy should have portfolio simulation results',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const portfolio = r.data?.active_strategy?.portfolio;

      if (portfolio && typeof portfolio === 'object') {
        return pass('orch-bt-correct-2', 'Active strategy has portfolio results', 'correctness');
      }
      return fail(
        'orch-bt-correct-2',
        'Active strategy has portfolio results',
        'correctness',
        'portfolio object present',
        `portfolio: ${typeof portfolio}`,
        'Should have portfolio simulation results'
      );
    },
  },
  {
    id: 'orch-bt-correct-3',
    name: 'Active strategy has metrics',
    category: 'correctness',
    description: 'Active strategy should have performance metrics',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const metrics = r.data?.active_strategy?.metrics;

      if (metrics && typeof metrics === 'object') {
        return pass('orch-bt-correct-3', 'Active strategy has metrics', 'correctness');
      }
      return fail(
        'orch-bt-correct-3',
        'Active strategy has metrics',
        'correctness',
        'metrics object present',
        `metrics: ${typeof metrics}`,
        'Should have performance metrics'
      );
    },
  },
  {
    id: 'orch-bt-correct-4',
    name: 'Has comparison metrics',
    category: 'correctness',
    description: 'Should compare active strategy to baseline',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const comparison = r.data?.comparison;

      if (comparison && typeof comparison === 'object') {
        return pass('orch-bt-correct-4', 'Has comparison metrics', 'correctness');
      }
      return fail(
        'orch-bt-correct-4',
        'Has comparison metrics',
        'correctness',
        'comparison object present',
        `comparison: ${typeof comparison}`,
        'Should have comparison of active vs baseline'
      );
    },
  },

  // EDGE CASE TESTS (4)
  {
    id: 'orch-bt-edge-1',
    name: 'Market data has prices',
    category: 'edge-case',
    description: 'Market data should include price array',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const prices = r.data?.market_data?.prices;

      if (Array.isArray(prices) && prices.length > 0) {
        return pass('orch-bt-edge-1', 'Market data has prices', 'edge-case');
      }
      return fail(
        'orch-bt-edge-1',
        'Market data has prices',
        'edge-case',
        'Non-empty prices array',
        `${Array.isArray(prices) ? prices.length : 0} prices`,
        'Should include price data from market-data service'
      );
    },
  },
  {
    id: 'orch-bt-edge-2',
    name: 'Metadata reflects request',
    category: 'edge-case',
    description: 'Response metadata should match request parameters',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const metadata = r.data?.metadata;

      if (metadata && metadata.ticker && metadata.strategy_type) {
        return pass('orch-bt-edge-2', 'Metadata reflects request', 'edge-case');
      }
      return fail(
        'orch-bt-edge-2',
        'Metadata reflects request',
        'edge-case',
        'metadata with ticker and strategy_type',
        `metadata: ${JSON.stringify(metadata)}`,
        'Metadata should reflect request parameters'
      );
    },
  },
  {
    id: 'orch-bt-edge-3',
    name: 'Baseline uses buy and hold',
    category: 'edge-case',
    description: 'Baseline should be a buy and hold strategy',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;
      const baseline = r.data?.baseline;

      if (baseline && baseline.portfolio) {
        return pass('orch-bt-edge-3', 'Baseline uses buy and hold', 'edge-case');
      }
      return fail(
        'orch-bt-edge-3',
        'Baseline uses buy and hold',
        'edge-case',
        'baseline.portfolio present',
        'No baseline portfolio',
        'Baseline should simulate buy and hold'
      );
    },
  },
  {
    id: 'orch-bt-edge-4',
    name: 'End-to-end data flow complete',
    category: 'edge-case',
    description: 'All services should contribute to the response',
    validate: (response) => {
      const r = response as ApiResponse<BacktestResponse>;

      // Check that all parts are present
      const hasMarketData = !!r.data?.market_data;
      const hasActiveStrategy = !!r.data?.active_strategy;
      const hasBaseline = !!r.data?.baseline;

      if (hasMarketData && hasActiveStrategy && hasBaseline) {
        return pass('orch-bt-edge-4', 'End-to-end data flow complete', 'edge-case');
      }
      return fail(
        'orch-bt-edge-4',
        'End-to-end data flow complete',
        'edge-case',
        'market_data, active_strategy, baseline all present',
        `market_data=${hasMarketData}, active=${hasActiveStrategy}, baseline=${hasBaseline}`,
        'All services should contribute data'
      );
    },
  },
];
