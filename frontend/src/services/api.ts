import type {
  ServiceName,
  ServiceConfig,
  ServiceStatus,
  EndpointStatus,
  EndpointState,
  ApiResponse
} from '../types';

// Service configurations with new port mappings (8010-8016)
export const SERVICE_CONFIGS: Record<ServiceName, ServiceConfig> = {
  'test-data-fetcher': {
    name: 'test-data-fetcher',
    displayName: 'Test Data Fetcher',
    port: 8016,
    endpoints: {
      'test-prices': {
        method: 'GET',
        path: '/test-data/prices?ticker=AAPL&days=5',
        description: 'Fetch sample price data from Yahoo Finance',
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 Array.isArray((r.data as { prices?: unknown[] })?.prices);
        }
      },
      'test-dividends': {
        method: 'GET',
        path: '/test-data/dividends?ticker=AAPL&years=1',
        description: 'Fetch sample dividend data from Yahoo Finance',
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 Array.isArray((r.data as { dividends?: unknown[] })?.dividends);
        }
      },
      'sample-request': {
        method: 'GET',
        path: '/test-data/sample-backtest-request',
        description: 'Get a sample backtest request payload',
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 (r.data as { market_params?: unknown })?.market_params !== undefined;
        }
      }
    }
  },
  'market-data': {
    name: 'market-data',
    displayName: 'Market Data',
    port: 8012,
    endpoints: {
      'prices': {
        method: 'POST',
        path: '/prices',
        description: 'Fetch OHLCV price data for a ticker',
        testInput: {
          ticker: 'AAPL',
          market_type: 'Stock',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          frequency: 'daily'
        },
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 Array.isArray((r.data as { prices?: unknown[] })?.prices);
        }
      },
      'dividends': {
        method: 'POST',
        path: '/dividends',
        description: 'Fetch dividend history for a ticker',
        testInput: {
          ticker: 'AAPL',
          start_date: '2023-01-01',
          end_date: '2024-01-01'
        },
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 Array.isArray((r.data as { dividends?: unknown[] })?.dividends);
        }
      },
      'tickers-search': {
        method: 'GET',
        path: '/tickers/search?q=AAPL',
        description: 'Search for tickers by name or symbol',
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 Array.isArray((r.data as { results?: unknown[] })?.results);
        }
      }
    }
  },
  'strategy': {
    name: 'strategy',
    displayName: 'Strategy',
    port: 8013,
    endpoints: {
      'signals': {
        method: 'POST',
        path: '/signals',
        description: 'Generate trading signals based on price data',
        testInput: {
          strategy_type: 'buy_the_dip',
          config: {
            price_change_threshold: -0.05,
            lookback_period: 'daily'
          },
          price_data: [
            { date: '2024-01-02', adjusted_close: 100.00 },
            { date: '2024-01-03', adjusted_close: 94.00 },
            { date: '2024-01-04', adjusted_close: 95.00 }
          ]
        },
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 Array.isArray((r.data as { signals?: unknown[] })?.signals);
        }
      }
    }
  },
  'portfolio': {
    name: 'portfolio',
    displayName: 'Portfolio',
    port: 8014,
    endpoints: {
      'simulate': {
        method: 'POST',
        path: '/simulate',
        description: 'Simulate portfolio evolution based on signals',
        testInput: {
          initial_capital: 10000,
          investment_per_trade: 100,
          reinvest_dividends: true,
          transaction_cost_pct: 0,
          cash_interest_rate_pct: 0,
          signals: [
            { date: '2024-01-03', action: 'BUY', price: 94.00 }
          ],
          price_data: [
            { date: '2024-01-02', adjusted_close: 100.00 },
            { date: '2024-01-03', adjusted_close: 94.00 },
            { date: '2024-01-04', adjusted_close: 95.00 }
          ],
          dividend_data: []
        },
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 (r.data as { time_series?: unknown })?.time_series !== undefined;
        }
      }
    }
  },
  'metrics': {
    name: 'metrics',
    displayName: 'Metrics',
    port: 8015,
    endpoints: {
      'calculate': {
        method: 'POST',
        path: '/calculate',
        description: 'Calculate performance and risk metrics',
        testInput: {
          risk_free_rate_annual: 0.02,
          portfolios: {
            active: {
              time_series: {
                dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
                portfolio_value: [10000, 10000, 10100]
              },
              final_state: {
                portfolio_value: 10100,
                total_invested: 100
              }
            }
          },
          start_date: '2024-01-02',
          end_date: '2024-01-04'
        },
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 (r.data as { active?: unknown })?.active !== undefined;
        }
      }
    }
  },
  'orchestrator': {
    name: 'orchestrator',
    displayName: 'Orchestrator',
    port: 8011,
    endpoints: {
      'backtest': {
        method: 'POST',
        path: '/api/backtest',
        description: 'Execute a complete backtest',
        testInput: {
          market_params: {
            ticker: 'AAPL',
            market_type: 'Stock',
            start_date: '2024-01-01',
            end_date: '2024-02-01',
            frequency: 'daily'
          },
          strategy_params: {
            strategy_type: 'buy_the_dip',
            config: {
              price_change_threshold: -0.05,
              lookback_period: 'daily'
            }
          },
          portfolio_params: {
            initial_capital: 10000,
            investment_per_trade: 100,
            reinvest_dividends: true,
            transaction_cost_pct: 0,
            cash_interest_rate_pct: 0
          },
          baseline_params: {
            initial_capital: 10000,
            reinvest_dividends: true
          }
        },
        validateResponse: (res: unknown) => {
          const r = res as ApiResponse;
          return r.success === true &&
                 (r.data as { active_strategy?: unknown })?.active_strategy !== undefined;
        }
      }
    }
  }
};

// Get base URL for a service
export function getServiceUrl(service: ServiceName): string {
  const config = SERVICE_CONFIGS[service];
  return `http://localhost:${config.port}`;
}

// Check service health
export async function checkServiceHealth(service: ServiceName): Promise<ServiceStatus> {
  const url = `${getServiceUrl(service)}/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return 'unhealthy';
    }

    const data = await response.json();
    return data.status === 'healthy' ? 'healthy' : 'unhealthy';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'disconnected';
    }
    return 'disconnected';
  }
}

// Check a single endpoint
export async function checkEndpoint(
  service: ServiceName,
  endpointKey: string
): Promise<EndpointState> {
  const config = SERVICE_CONFIGS[service];
  const endpoint = config.endpoints[endpointKey];
  const url = `${getServiceUrl(service)}${endpoint.path}`;

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const options: RequestInit = {
      method: endpoint.method,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (endpoint.method === 'POST' && endpoint.testInput) {
      options.body = JSON.stringify(endpoint.testInput);
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    const responseTime = performance.now() - startTime;

    if (response.status === 404) {
      return {
        status: 'missing',
        lastChecked: new Date(),
        error: 'Endpoint not implemented (404 Not Found)',
        responseTime
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: 'error',
        lastChecked: new Date(),
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        responseTime
      };
    }

    const data = await response.json();

    // Validate response format
    if (endpoint.validateResponse && !endpoint.validateResponse(data)) {
      return {
        status: 'wrong-format',
        lastChecked: new Date(),
        lastResult: data,
        error: 'Response format does not match expected schema',
        responseTime
      };
    }

    return {
      status: 'working',
      lastChecked: new Date(),
      lastResult: data,
      responseTime
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 'error',
          lastChecked: new Date(),
          error: 'Request timed out after 10 seconds',
          responseTime
        };
      }
      return {
        status: 'error',
        lastChecked: new Date(),
        error: error.message,
        responseTime
      };
    }

    return {
      status: 'error',
      lastChecked: new Date(),
      error: 'Unknown error occurred',
      responseTime
    };
  }
}

// Run a custom endpoint call (for Testing Lab)
export async function runEndpointCall(
  service: ServiceName,
  endpointKey: string,
  customInput?: Record<string, unknown>
): Promise<{ response: unknown; responseTime: number; error?: string }> {
  const config = SERVICE_CONFIGS[service];
  const endpoint = config.endpoints[endpointKey];

  let url = `${getServiceUrl(service)}${endpoint.path}`;

  // For GET requests with custom input, we might need to rebuild the query string
  if (endpoint.method === 'GET' && customInput) {
    const basePath = endpoint.path.split('?')[0];
    const params = new URLSearchParams(customInput as Record<string, string>);
    url = `${getServiceUrl(service)}${basePath}?${params.toString()}`;
  }

  const startTime = performance.now();

  try {
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (endpoint.method === 'POST') {
      options.body = JSON.stringify(customInput || endpoint.testInput);
    }

    const response = await fetch(url, options);
    const responseTime = performance.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        response: null,
        responseTime,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    return { response: data, responseTime };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return {
      response: null,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get endpoint status label
export function getEndpointStatusLabel(status: EndpointStatus): string {
  switch (status) {
    case 'unknown': return 'Not Tested';
    case 'checking': return 'Checking...';
    case 'working': return 'Working';
    case 'missing': return 'Not Implemented';
    case 'error': return 'Error';
    case 'wrong-format': return 'Wrong Format';
  }
}

// Get service status label
export function getServiceStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'unknown': return 'Unknown';
    case 'checking': return 'Checking...';
    case 'healthy': return 'Healthy';
    case 'unhealthy': return 'Unhealthy';
    case 'disconnected': return 'Disconnected';
  }
}

// Get all non-health endpoints for a service
export function getServiceEndpoints(service: ServiceName): string[] {
  return Object.keys(SERVICE_CONFIGS[service].endpoints);
}

// Calculate service completion percentage
export function getServiceCompletion(endpoints: Record<string, EndpointState>): number {
  const endpointKeys = Object.keys(endpoints);
  if (endpointKeys.length === 0) return 0;

  const working = endpointKeys.filter(k => endpoints[k].status === 'working').length;
  return Math.round((working / endpointKeys.length) * 100);
}
