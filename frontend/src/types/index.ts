// Service names
export type ServiceName =
  | 'test-data-fetcher'
  | 'market-data'
  | 'strategy'
  | 'portfolio'
  | 'metrics'
  | 'orchestrator';

// Service status states
export type ServiceStatus =
  | 'unknown'
  | 'checking'
  | 'healthy'
  | 'unhealthy'
  | 'disconnected';

// Endpoint status states
export type EndpointStatus =
  | 'unknown'
  | 'checking'
  | 'working'
  | 'missing'        // 404 - not implemented
  | 'error'          // 500 or network error
  | 'wrong-format';  // Response doesn't match expected schema

// Endpoint state
export interface EndpointState {
  status: EndpointStatus;
  lastChecked?: Date;
  lastResult?: unknown;
  error?: string;
  responseTime?: number;
}

// Service state
export interface ServiceState {
  name: ServiceName;
  displayName: string;
  port: number;
  status: ServiceStatus;
  endpoints: Record<string, EndpointState>;
  lastChecked?: Date;
}

// Endpoint configuration
export interface EndpointConfig {
  method: 'GET' | 'POST';
  path: string;
  testInput?: Record<string, unknown>;
  validateResponse?: (response: unknown) => boolean;
  description: string;
}

// Service configuration
export interface ServiceConfig {
  name: ServiceName;
  displayName: string;
  port: number;
  endpoints: Record<string, EndpointConfig>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Price data
export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

// Dividend data
export interface DividendData {
  ex_date: string;
  payment_date: string;
  amount_per_share: number;
}

// Test data response
export interface TestPricesResponse {
  ticker: string;
  frequency: string;
  prices: PriceData[];
}

export interface TestDividendsResponse {
  ticker: string;
  dividends: DividendData[];
}

// App state
export interface AppState {
  services: Record<ServiceName, ServiceState>;
  activeTab: 'dashboard' | 'lab';
  isPolling: boolean;
}

// UI action types
export type AppAction =
  | { type: 'SET_SERVICE_STATUS'; service: ServiceName; status: ServiceStatus }
  | { type: 'SET_ENDPOINT_STATUS'; service: ServiceName; endpoint: string; state: Partial<EndpointState> }
  | { type: 'SET_ACTIVE_TAB'; tab: 'dashboard' | 'lab' }
  | { type: 'SET_POLLING'; isPolling: boolean }
  | { type: 'RESET_SERVICE'; service: ServiceName };
