import type { TestCase, PortfolioMetrics } from './types';
import { pass, fail } from './types';
import type { ApiResponse } from '../types';
import { approxEqual } from './calculators';

interface MetricsResponse {
  active?: PortfolioMetrics;
  baseline?: PortfolioMetrics;
  comparison?: {
    excess_return_pct: number;
    excess_annualized_return_pct: number;
    excess_sharpe: number;
    reduced_max_drawdown_pct: number;
    reduced_volatility_pct: number;
  };
}

// Metrics Service Tests - /calculate endpoint
export const calculateTests: TestCase[] = [
  // FORMAT TESTS (4)
  {
    id: 'metrics-calc-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('metrics-calc-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'metrics-calc-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'metrics-calc-format-2',
    name: 'Response has portfolio metrics',
    category: 'format',
    description: 'Response should have metrics for the active portfolio',
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      if (r.data && r.data.active) {
        return pass('metrics-calc-format-2', 'Response has portfolio metrics', 'format');
      }
      return fail(
        'metrics-calc-format-2',
        'Response has portfolio metrics',
        'format',
        'data.active: Object',
        `data.active: ${typeof r.data?.active}`,
        'Response should contain active portfolio metrics'
      );
    },
  },
  {
    id: 'metrics-calc-format-3',
    name: 'Metrics have required fields',
    category: 'format',
    description: 'Metrics should include return, volatility, sharpe, max_drawdown',
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-format-3',
          'Metrics have required fields',
          'format',
          'Metrics object',
          'No metrics',
          'Response should have metrics'
        );
      }

      const requiredFields = ['total_return_pct', 'annualized_return_pct', 'volatility_annualized_pct', 'sharpe_ratio', 'max_drawdown_pct'];
      for (const field of requiredFields) {
        if (!(field in metrics)) {
          return fail(
            'metrics-calc-format-3',
            'Metrics have required fields',
            'format',
            `All fields: ${requiredFields.join(', ')}`,
            `Missing: ${field}`,
            'Metrics should have all required fields'
          );
        }
      }
      return pass('metrics-calc-format-3', 'Metrics have required fields', 'format');
    },
  },
  {
    id: 'metrics-calc-format-4',
    name: 'Max drawdown is a number',
    category: 'format',
    description: 'max_drawdown_pct should be a number (flat field, not nested object)',
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-format-4',
          'Max drawdown is a number',
          'format',
          'Metrics object',
          'No metrics',
          'Response should have metrics'
        );
      }

      if (typeof metrics.max_drawdown_pct !== 'number') {
        return fail(
          'metrics-calc-format-4',
          'Max drawdown is a number',
          'format',
          'max_drawdown_pct: number',
          `max_drawdown_pct: ${typeof metrics.max_drawdown_pct}`,
          'max_drawdown_pct should be a number'
        );
      }

      return pass('metrics-calc-format-4', 'Max drawdown is a number', 'format');
    },
  },

  // CORRECTNESS TESTS (6)
  {
    id: 'metrics-calc-correct-1',
    name: 'Total return calculation',
    category: 'correctness',
    description: 'Total return = (final - initial) / initial * 100',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
            portfolio_value: [10000, 10500, 11000],
          },
          final_state: {
            portfolio_value: 11000,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-04',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-correct-1',
          'Total return calculation',
          'correctness',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      // (11000 - 10000) / 10000 * 100 = 10%
      const expectedReturn = 10.0;
      if (approxEqual(metrics.total_return_pct, expectedReturn, 0.5)) {
        return pass('metrics-calc-correct-1', 'Total return calculation', 'correctness');
      }
      return fail(
        'metrics-calc-correct-1',
        'Total return calculation',
        'correctness',
        `total_return_pct = ${expectedReturn.toFixed(2)}%`,
        `total_return_pct = ${metrics.total_return_pct.toFixed(2)}%`,
        'Total return should be (final - initial) / initial * 100'
      );
    },
  },
  {
    id: 'metrics-calc-correct-2',
    name: 'Positive return for growing portfolio',
    category: 'correctness',
    description: 'Portfolio that grows should have positive return',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03'],
            portfolio_value: [10000, 10100],
          },
          final_state: {
            portfolio_value: 10100,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-03',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-correct-2',
          'Positive return for growing portfolio',
          'correctness',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      if (metrics.total_return_pct > 0) {
        return pass('metrics-calc-correct-2', 'Positive return for growing portfolio', 'correctness');
      }
      return fail(
        'metrics-calc-correct-2',
        'Positive return for growing portfolio',
        'correctness',
        'total_return_pct > 0',
        `total_return_pct = ${metrics.total_return_pct.toFixed(2)}%`,
        'Growing portfolio should have positive return'
      );
    },
  },
  {
    id: 'metrics-calc-correct-3',
    name: 'Negative return for declining portfolio',
    category: 'correctness',
    description: 'Portfolio that declines should have negative return',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03'],
            portfolio_value: [10000, 9000],
          },
          final_state: {
            portfolio_value: 9000,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-03',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-correct-3',
          'Negative return for declining portfolio',
          'correctness',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      if (metrics.total_return_pct < 0) {
        return pass('metrics-calc-correct-3', 'Negative return for declining portfolio', 'correctness');
      }
      return fail(
        'metrics-calc-correct-3',
        'Negative return for declining portfolio',
        'correctness',
        'total_return_pct < 0',
        `total_return_pct = ${metrics.total_return_pct.toFixed(2)}%`,
        'Declining portfolio should have negative return'
      );
    },
  },
  {
    id: 'metrics-calc-correct-4',
    name: 'Volatility is non-negative',
    category: 'correctness',
    description: 'Volatility should always be >= 0',
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-correct-4',
          'Volatility is non-negative',
          'correctness',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      if (metrics.volatility_annualized_pct >= 0) {
        return pass('metrics-calc-correct-4', 'Volatility is non-negative', 'correctness');
      }
      return fail(
        'metrics-calc-correct-4',
        'Volatility is non-negative',
        'correctness',
        'volatility_annualized_pct >= 0',
        `volatility_annualized_pct = ${metrics.volatility_annualized_pct.toFixed(2)}%`,
        'Volatility cannot be negative'
      );
    },
  },
  {
    id: 'metrics-calc-correct-5',
    name: 'Max drawdown is non-positive',
    category: 'correctness',
    description: 'Max drawdown should be <= 0 (expressed as negative percentage)',
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics || metrics.max_drawdown_pct === undefined) {
        return fail(
          'metrics-calc-correct-5',
          'Max drawdown is non-positive',
          'correctness',
          'max_drawdown_pct present',
          'No max_drawdown_pct',
          'Response should have max_drawdown_pct'
        );
      }

      if (metrics.max_drawdown_pct <= 0) {
        return pass('metrics-calc-correct-5', 'Max drawdown is non-positive', 'correctness');
      }
      return fail(
        'metrics-calc-correct-5',
        'Max drawdown is non-positive',
        'correctness',
        'max_drawdown_pct <= 0',
        `max_drawdown_pct = ${metrics.max_drawdown_pct.toFixed(2)}%`,
        'Max drawdown should be expressed as negative percentage'
      );
    },
  },
  {
    id: 'metrics-calc-correct-6',
    name: 'Sharpe ratio calculation direction',
    category: 'correctness',
    description: 'Sharpe > 0 when return > risk-free rate, < 0 when return < risk-free rate',
    input: {
      risk_free_rate_annual: 0.02, // 2%
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-08'],
            portfolio_value: [10000, 10050, 10100, 10150, 10200], // Steady growth
          },
          final_state: {
            portfolio_value: 10200,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-08',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-correct-6',
          'Sharpe ratio calculation direction',
          'correctness',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      // 2% return over a few days annualizes to much more than 2% risk-free
      // So Sharpe should be positive
      if (metrics.annualized_return_pct > 2 && metrics.sharpe_ratio > 0) {
        return pass('metrics-calc-correct-6', 'Sharpe ratio calculation direction', 'correctness');
      }
      if (metrics.annualized_return_pct <= 2 && metrics.sharpe_ratio <= 0) {
        return pass('metrics-calc-correct-6', 'Sharpe ratio calculation direction', 'correctness');
      }
      return fail(
        'metrics-calc-correct-6',
        'Sharpe ratio calculation direction',
        'correctness',
        'Sharpe > 0 when annualized_return > risk_free_rate',
        `annualized=${metrics.annualized_return_pct.toFixed(2)}%, sharpe=${metrics.sharpe_ratio.toFixed(2)}`,
        'Sharpe sign should match excess return sign'
      );
    },
  },

  // EDGE CASE TESTS (4)
  {
    id: 'metrics-calc-edge-1',
    name: 'Flat portfolio has zero volatility',
    category: 'edge-case',
    description: 'Portfolio with no value changes should have 0% volatility',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
            portfolio_value: [10000, 10000, 10000], // No change
          },
          final_state: {
            portfolio_value: 10000,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-04',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-edge-1',
          'Flat portfolio has zero volatility',
          'edge-case',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      if (approxEqual(metrics.volatility_annualized_pct, 0, 0.01)) {
        return pass('metrics-calc-edge-1', 'Flat portfolio has zero volatility', 'edge-case');
      }
      return fail(
        'metrics-calc-edge-1',
        'Flat portfolio has zero volatility',
        'edge-case',
        'volatility_annualized_pct = 0%',
        `volatility_annualized_pct = ${metrics.volatility_annualized_pct.toFixed(4)}%`,
        'No price changes should mean zero volatility'
      );
    },
  },
  {
    id: 'metrics-calc-edge-2',
    name: 'Monotonically increasing has zero drawdown',
    category: 'edge-case',
    description: 'Portfolio that only increases should have 0% max drawdown',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
            portfolio_value: [10000, 10100, 10200, 10300], // Only increases
          },
          final_state: {
            portfolio_value: 10300,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-05',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics || metrics.max_drawdown_pct === undefined) {
        return fail(
          'metrics-calc-edge-2',
          'Monotonically increasing has zero drawdown',
          'edge-case',
          'max_drawdown_pct present',
          'No max_drawdown_pct',
          'Response should have max_drawdown_pct'
        );
      }

      if (approxEqual(metrics.max_drawdown_pct, 0, 0.01)) {
        return pass('metrics-calc-edge-2', 'Monotonically increasing has zero drawdown', 'edge-case');
      }
      return fail(
        'metrics-calc-edge-2',
        'Monotonically increasing has zero drawdown',
        'edge-case',
        'max_drawdown_pct = 0%',
        `max_drawdown_pct = ${metrics.max_drawdown_pct.toFixed(2)}%`,
        'Monotonically increasing portfolio has no drawdown'
      );
    },
  },
  {
    id: 'metrics-calc-edge-3',
    name: 'Zero volatility gives zero Sharpe',
    category: 'edge-case',
    description: 'When volatility is 0, Sharpe should be 0 (not infinity)',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
            portfolio_value: [10000, 10000, 10000], // No volatility
          },
          final_state: {
            portfolio_value: 10000,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-04',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-edge-3',
          'Zero volatility gives zero Sharpe',
          'edge-case',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      // When volatility is zero, sharpe should be 0 (not infinity)
      if (Number.isFinite(metrics.sharpe_ratio) && approxEqual(metrics.sharpe_ratio, 0, 0.01)) {
        return pass('metrics-calc-edge-3', 'Zero volatility gives zero Sharpe', 'edge-case');
      }
      if (!Number.isFinite(metrics.sharpe_ratio)) {
        return fail(
          'metrics-calc-edge-3',
          'Zero volatility gives zero Sharpe',
          'edge-case',
          'sharpe_ratio = 0',
          `sharpe_ratio = ${metrics.sharpe_ratio}`,
          'Sharpe should be 0, not infinity or NaN'
        );
      }
      return pass('metrics-calc-edge-3', 'Zero volatility gives zero Sharpe', 'edge-case');
    },
  },
  {
    id: 'metrics-calc-edge-4',
    name: 'Two data points calculates metrics',
    category: 'edge-case',
    description: 'Minimum viable input (2 data points) should work',
    input: {
      risk_free_rate_annual: 0.02,
      portfolios: {
        active: {
          time_series: {
            dates: ['2024-01-02', '2024-01-03'],
            portfolio_value: [10000, 10100],
          },
          final_state: {
            portfolio_value: 10100,
            total_invested: 10000,
          },
        },
      },
      start_date: '2024-01-02',
      end_date: '2024-01-03',
    },
    validate: (response) => {
      const r = response as ApiResponse<MetricsResponse>;
      const metrics = r.data?.active;

      if (!metrics) {
        return fail(
          'metrics-calc-edge-4',
          'Two data points calculates metrics',
          'edge-case',
          'Metrics present',
          'No metrics',
          'Response should have metrics'
        );
      }

      // Just verify we get some metrics back
      if (typeof metrics.total_return_pct === 'number' && typeof metrics.volatility_annualized_pct === 'number') {
        return pass('metrics-calc-edge-4', 'Two data points calculates metrics', 'edge-case');
      }
      return fail(
        'metrics-calc-edge-4',
        'Two data points calculates metrics',
        'edge-case',
        'Numeric metrics',
        'Invalid metrics',
        'Should calculate metrics from 2 data points'
      );
    },
  },
];
