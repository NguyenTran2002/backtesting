import type { TestCase, SignalItem, PriceItem } from './types';
import { pass, fail } from './types';
import type { ApiResponse } from '../types';
import { approxEqual } from './calculators';

// Strategy Service Tests - /signals endpoint
export const signalsTests: TestCase[] = [
  // FORMAT TESTS (4)
  {
    id: 'strat-signals-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('strat-signals-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'strat-signals-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'strat-signals-format-2',
    name: 'Response has signals array',
    category: 'format',
    description: 'Response data should contain a signals array',
    validate: (response) => {
      const r = response as ApiResponse<{ signals: unknown[] }>;
      if (r.data && Array.isArray(r.data.signals)) {
        return pass('strat-signals-format-2', 'Response has signals array', 'format');
      }
      return fail(
        'strat-signals-format-2',
        'Response has signals array',
        'format',
        'data.signals: Array',
        `data.signals: ${typeof r.data?.signals}`,
        'Response should contain signals array'
      );
    },
  },
  {
    id: 'strat-signals-format-3',
    name: 'Each signal has required fields',
    category: 'format',
    description: 'Each signal should have date, action, price',
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      for (const signal of signals) {
        if (!signal.date || !signal.action || signal.price === undefined) {
          return fail(
            'strat-signals-format-3',
            'Each signal has required fields',
            'format',
            'All signals have date, action, price',
            `Found signal missing fields`,
            'Each signal must have required fields'
          );
        }
      }
      return pass('strat-signals-format-3', 'Each signal has required fields', 'format');
    },
  },
  {
    id: 'strat-signals-format-4',
    name: 'Signal action is valid',
    category: 'format',
    description: 'Signal action should be BUY or SELL',
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      for (const signal of signals) {
        if (signal.action !== 'BUY' && signal.action !== 'SELL') {
          return fail(
            'strat-signals-format-4',
            'Signal action is valid',
            'format',
            'BUY or SELL',
            signal.action,
            'Signal action must be BUY or SELL'
          );
        }
      }
      return pass('strat-signals-format-4', 'Signal action is valid', 'format');
    },
  },

  // CORRECTNESS TESTS - Buy the Dip (6)
  {
    id: 'strat-signals-correct-1',
    name: 'Buy the Dip: Signal on price drop',
    category: 'correctness',
    description: 'Signal generated when price drops by threshold',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.05,
        lookback_period: 'daily',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 94.00 }, // -6% drop, should trigger
        { date: '2024-01-04', adjusted_close: 95.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      // With -6% drop on day 2, should have a signal
      const hasSignalOnDrop = signals.some(s => s.date === '2024-01-03');

      if (hasSignalOnDrop) {
        return pass('strat-signals-correct-1', 'Buy the Dip: Signal on price drop', 'correctness');
      }
      return fail(
        'strat-signals-correct-1',
        'Buy the Dip: Signal on price drop',
        'correctness',
        'Signal on 2024-01-03 (6% drop)',
        `Signals on: ${signals.map(s => s.date).join(', ') || 'none'}`,
        'Should generate signal when price drops by threshold'
      );
    },
  },
  {
    id: 'strat-signals-correct-2',
    name: 'Buy the Dip: No signal above threshold',
    category: 'correctness',
    description: 'No signal when price drop is less than threshold',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.10, // 10% threshold
        lookback_period: 'daily',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 94.00 }, // -6% drop, should NOT trigger
        { date: '2024-01-04', adjusted_close: 95.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      // With 10% threshold and only 6% drop, should have no signals
      if (signals.length === 0) {
        return pass('strat-signals-correct-2', 'Buy the Dip: No signal above threshold', 'correctness');
      }
      return fail(
        'strat-signals-correct-2',
        'Buy the Dip: No signal above threshold',
        'correctness',
        '0 signals (6% drop < 10% threshold)',
        `${signals.length} signals generated`,
        'Should not generate signal when drop is less than threshold'
      );
    },
  },
  {
    id: 'strat-signals-correct-3',
    name: 'Buy the Dip: Price change calculation',
    category: 'correctness',
    description: 'Price change percentage is calculated correctly',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.05,
        lookback_period: 'daily',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 94.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      if (signals.length === 0) {
        return fail(
          'strat-signals-correct-3',
          'Buy the Dip: Price change calculation',
          'correctness',
          'Signal with price_change_pct',
          'No signals generated',
          'Expected a signal to verify calculation'
        );
      }

      const signal = signals[0];
      const expectedChange = (94 - 100) / 100; // -0.06

      if (signal.trigger_details?.price_change_pct !== undefined) {
        const actualChange = signal.trigger_details.price_change_pct;
        if (approxEqual(actualChange, expectedChange, 0.001)) {
          return pass('strat-signals-correct-3', 'Buy the Dip: Price change calculation', 'correctness');
        }
        return fail(
          'strat-signals-correct-3',
          'Buy the Dip: Price change calculation',
          'correctness',
          `price_change_pct = ${expectedChange.toFixed(4)}`,
          `price_change_pct = ${actualChange.toFixed(4)}`,
          'Price change calculation should be (current - previous) / previous'
        );
      }

      return pass('strat-signals-correct-3', 'Buy the Dip: Price change calculation', 'correctness');
    },
  },
  {
    id: 'strat-signals-correct-4',
    name: 'Buy the Dip: Weekly lookback offset',
    category: 'correctness',
    description: 'Weekly lookback uses 5 trading days',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.05,
        lookback_period: 'weekly',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 99.00 },
        { date: '2024-01-04', adjusted_close: 98.00 },
        { date: '2024-01-05', adjusted_close: 97.00 },
        { date: '2024-01-08', adjusted_close: 96.00 },
        { date: '2024-01-09', adjusted_close: 90.00 }, // Day 6, compares to day 1 (100 -> 90 = -10%)
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      // First 5 days should have no signals (insufficient lookback)
      // Day 6 compares to day 1: (90 - 100) / 100 = -10%, should trigger
      const signalOnDay6 = signals.some(s => s.date === '2024-01-09');

      if (signalOnDay6) {
        return pass('strat-signals-correct-4', 'Buy the Dip: Weekly lookback offset', 'correctness');
      }
      return fail(
        'strat-signals-correct-4',
        'Buy the Dip: Weekly lookback offset',
        'correctness',
        'Signal on 2024-01-09 (day 6, -10% from day 1)',
        `Signals on: ${signals.map(s => s.date).join(', ') || 'none'}`,
        'Weekly lookback should compare to 5 days ago'
      );
    },
  },
  {
    id: 'strat-signals-correct-5',
    name: 'Buy the Dip: No early signals',
    category: 'correctness',
    description: 'No signals before sufficient lookback history',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.01,
        lookback_period: 'weekly',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 50.00 }, // Huge drop, but only day 2
        { date: '2024-01-04', adjusted_close: 40.00 },
        { date: '2024-01-05', adjusted_close: 30.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      // With weekly lookback (5 days), first 5 days should have no signals
      // We only have 4 days of data, so no signals expected
      if (signals.length === 0) {
        return pass('strat-signals-correct-5', 'Buy the Dip: No early signals', 'correctness');
      }
      return fail(
        'strat-signals-correct-5',
        'Buy the Dip: No early signals',
        'correctness',
        '0 signals (insufficient lookback)',
        `${signals.length} signals`,
        'Should not generate signals before 5 days of history for weekly lookback'
      );
    },
  },
  {
    id: 'strat-signals-correct-6',
    name: 'Signal price matches input price',
    category: 'correctness',
    description: 'Signal price should match the price data adjusted_close',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.05,
        lookback_period: 'daily',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 94.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      if (signals.length === 0) {
        return fail(
          'strat-signals-correct-6',
          'Signal price matches input price',
          'correctness',
          'Signal with price',
          'No signals',
          'Expected signal to verify price'
        );
      }

      const signal = signals.find(s => s.date === '2024-01-03');
      if (signal && approxEqual(signal.price, 94.00, 0.01)) {
        return pass('strat-signals-correct-6', 'Signal price matches input price', 'correctness');
      }
      return fail(
        'strat-signals-correct-6',
        'Signal price matches input price',
        'correctness',
        'price = 94.00',
        `price = ${signal?.price}`,
        'Signal price should match adjusted_close from input'
      );
    },
  },

  // EDGE CASE TESTS (4)
  {
    id: 'strat-signals-edge-1',
    name: 'Empty price data returns empty signals',
    category: 'edge-case',
    description: 'No prices should result in no signals',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.05,
        lookback_period: 'daily',
      },
      price_data: [],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      if (signals.length === 0) {
        return pass('strat-signals-edge-1', 'Empty price data returns empty signals', 'edge-case');
      }
      return fail(
        'strat-signals-edge-1',
        'Empty price data returns empty signals',
        'edge-case',
        '0 signals',
        `${signals.length} signals`,
        'Empty input should produce empty output'
      );
    },
  },
  {
    id: 'strat-signals-edge-2',
    name: 'Single price returns no signals (buy_the_dip)',
    category: 'edge-case',
    description: 'Need at least 2 prices to compare for buy_the_dip',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.05,
        lookback_period: 'daily',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      if (signals.length === 0) {
        return pass('strat-signals-edge-2', 'Single price returns no signals (buy_the_dip)', 'edge-case');
      }
      return fail(
        'strat-signals-edge-2',
        'Single price returns no signals (buy_the_dip)',
        'edge-case',
        '0 signals',
        `${signals.length} signals`,
        'Single price has no previous price to compare'
      );
    },
  },
  {
    id: 'strat-signals-edge-3',
    name: 'Buy and Hold: Single signal on first day',
    category: 'edge-case',
    description: 'Buy and hold generates exactly 1 BUY signal on first day',
    input: {
      strategy_type: 'buy_and_hold',
      config: {},
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 105.00 },
        { date: '2024-01-04', adjusted_close: 110.00 },
      ],
    },
    validate: (response, input) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];
      const priceData = (input as { price_data: PriceItem[] }).price_data;

      if (signals.length !== 1) {
        return fail(
          'strat-signals-edge-3',
          'Buy and Hold: Single signal on first day',
          'edge-case',
          '1 signal',
          `${signals.length} signals`,
          'Buy and hold should generate exactly 1 signal'
        );
      }

      const signal = signals[0];
      if (signal.date !== priceData[0].date) {
        return fail(
          'strat-signals-edge-3',
          'Buy and Hold: Single signal on first day',
          'edge-case',
          `Signal on ${priceData[0].date}`,
          `Signal on ${signal.date}`,
          'Signal should be on first trading day'
        );
      }

      if (signal.action !== 'BUY') {
        return fail(
          'strat-signals-edge-3',
          'Buy and Hold: Single signal on first day',
          'edge-case',
          'action: BUY',
          `action: ${signal.action}`,
          'Buy and hold signal should be BUY'
        );
      }

      return pass('strat-signals-edge-3', 'Buy and Hold: Single signal on first day', 'edge-case');
    },
  },
  {
    id: 'strat-signals-edge-4',
    name: 'Signals have chronological dates',
    category: 'edge-case',
    description: 'Multiple signals should be in date order',
    input: {
      strategy_type: 'buy_the_dip',
      config: {
        price_change_threshold: -0.01, // Low threshold to get multiple signals
        lookback_period: 'daily',
      },
      price_data: [
        { date: '2024-01-02', adjusted_close: 100.00 },
        { date: '2024-01-03', adjusted_close: 98.00 },
        { date: '2024-01-04', adjusted_close: 96.00 },
        { date: '2024-01-05', adjusted_close: 94.00 },
      ],
    },
    validate: (response) => {
      const r = response as ApiResponse<{ signals: SignalItem[] }>;
      const signals = r.data?.signals || [];

      for (let i = 1; i < signals.length; i++) {
        if (signals[i].date < signals[i - 1].date) {
          return fail(
            'strat-signals-edge-4',
            'Signals have chronological dates',
            'edge-case',
            'Dates in ascending order',
            `${signals[i - 1].date} > ${signals[i].date}`,
            'Signals should be in chronological order'
          );
        }
      }
      return pass('strat-signals-edge-4', 'Signals have chronological dates', 'edge-case');
    },
  },
];
