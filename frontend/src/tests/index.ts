import type { ServiceName } from '../types';
import type { TestCase } from './types';

// Import test suites for each service
import { pricesTests, dividendsTests, tickersSearchTests } from './market-data.tests';
import { signalsTests } from './strategy.tests';
import { simulateTests } from './portfolio.tests';
import { calculateTests } from './metrics.tests';
import { testPricesTests, testDividendsTests, sampleRequestTests } from './test-data-fetcher.tests';
import { backtestTests } from './orchestrator.tests';

// Export test suites organized by service and endpoint
export const TEST_SUITES: Record<ServiceName, Record<string, TestCase[]>> = {
  'test-data-fetcher': {
    'test-prices': testPricesTests,
    'test-dividends': testDividendsTests,
    'sample-request': sampleRequestTests,
  },
  'market-data': {
    'prices': pricesTests,
    'dividends': dividendsTests,
    'tickers-search': tickersSearchTests,
  },
  'strategy': {
    'signals': signalsTests,
  },
  'portfolio': {
    'simulate': simulateTests,
  },
  'metrics': {
    'calculate': calculateTests,
  },
  'orchestrator': {
    'backtest': backtestTests,
  },
};

// Get test count for a service
export function getServiceTestCount(service: ServiceName): { total: number; endpoints: number } {
  const suites = TEST_SUITES[service];
  let total = 0;
  const endpoints = Object.keys(suites).length;

  for (const tests of Object.values(suites)) {
    total += tests.length;
  }

  return { total, endpoints };
}

// Get test count for an endpoint
export function getEndpointTestCount(service: ServiceName, endpoint: string): number {
  return TEST_SUITES[service]?.[endpoint]?.length || 0;
}

// Re-export runner functions
export { runEndpointTests, getTestSummary } from './runner';

// Re-export types
export type { TestCase, TestSuite } from './types';
