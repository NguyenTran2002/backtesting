import type { ServiceName, EndpointTestResults, TestResult } from '../types';
import { TEST_SUITES } from './index';
import { getServiceUrl, SERVICE_CONFIGS } from '../services/api';

// Run all tests for a specific endpoint
export async function runEndpointTests(
  service: ServiceName,
  endpointKey: string,
  existingResponse?: unknown
): Promise<EndpointTestResults> {
  const suites = TEST_SUITES[service];
  const testCases = suites?.[endpointKey] || [];

  if (testCases.length === 0) {
    return {
      passed: 0,
      failed: 0,
      total: 0,
      results: [],
      lastRun: new Date(),
    };
  }

  const config = SERVICE_CONFIGS[service];
  const endpoint = config.endpoints[endpointKey];
  const defaultInput = endpoint.testInput || {};

  const results: TestResult[] = [];

  for (const testCase of testCases) {
    const input = testCase.input || defaultInput;

    // If we have a custom input for this test, we need to make a new request
    // Otherwise, use the existing response if available
    let response: unknown;

    if (testCase.input || !existingResponse) {
      try {
        response = await fetchEndpoint(service, endpointKey, input);
      } catch (error) {
        results.push({
          testId: testCase.id,
          name: testCase.name,
          category: testCase.category,
          passed: false,
          expected: 'Successful response',
          actual: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          message: 'Failed to fetch endpoint',
          rawRequest: input,
          rawResponse: undefined,
        });
        continue;
      }
    } else {
      response = existingResponse;
    }

    try {
      const result = testCase.validate(response, input);
      // Attach raw request/response data to the result
      results.push({
        ...result,
        rawRequest: input,
        rawResponse: response,
      });
    } catch (error) {
      results.push({
        testId: testCase.id,
        name: testCase.name,
        category: testCase.category,
        passed: false,
        expected: 'Validation to complete',
        actual: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message: 'Validation function threw an error',
        rawRequest: input,
        rawResponse: response,
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    passed,
    failed,
    total: results.length,
    results,
    lastRun: new Date(),
  };
}

// Fetch an endpoint with custom input
async function fetchEndpoint(
  service: ServiceName,
  endpointKey: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const config = SERVICE_CONFIGS[service];
  const endpoint = config.endpoints[endpointKey];

  let url = `${getServiceUrl(service)}${endpoint.path}`;

  // For GET requests, rebuild query string from input
  if (endpoint.method === 'GET' && Object.keys(input).length > 0) {
    const basePath = endpoint.path.split('?')[0];
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
      params.append(key, String(value));
    }
    url = `${getServiceUrl(service)}${basePath}?${params.toString()}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const options: RequestInit = {
    method: endpoint.method,
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (endpoint.method === 'POST') {
    options.body = JSON.stringify(input);
  }

  const response = await fetch(url, options);
  clearTimeout(timeoutId);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

// Get test count summary for display
export function getTestSummary(testResults?: EndpointTestResults): {
  passed: number;
  total: number;
  status: 'pass' | 'partial' | 'fail' | 'none';
} {
  if (!testResults || testResults.total === 0) {
    return { passed: 0, total: 0, status: 'none' };
  }

  const { passed, total } = testResults;

  if (passed === total) {
    return { passed, total, status: 'pass' };
  } else if (passed === 0) {
    return { passed, total, status: 'fail' };
  } else {
    return { passed, total, status: 'partial' };
  }
}
