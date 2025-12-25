import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { ServiceName, ServiceState, AppState, AppAction, EndpointState } from '../types';
import { SERVICE_CONFIGS, checkServiceHealth, checkEndpoint, getServiceEndpoints } from '../services/api';

// Initial state for all services
function createInitialServiceState(name: ServiceName): ServiceState {
  const config = SERVICE_CONFIGS[name];
  const endpoints: Record<string, EndpointState> = {};

  for (const key of Object.keys(config.endpoints)) {
    endpoints[key] = { status: 'unknown' };
  }

  return {
    name,
    displayName: config.displayName,
    port: config.port,
    status: 'unknown',
    endpoints
  };
}

const initialState: AppState = {
  services: {
    'test-data-fetcher': createInitialServiceState('test-data-fetcher'),
    'market-data': createInitialServiceState('market-data'),
    'strategy': createInitialServiceState('strategy'),
    'portfolio': createInitialServiceState('portfolio'),
    'metrics': createInitialServiceState('metrics'),
    'orchestrator': createInitialServiceState('orchestrator')
  },
  activeTab: 'dashboard',
  isPolling: true
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SERVICE_STATUS':
      return {
        ...state,
        services: {
          ...state.services,
          [action.service]: {
            ...state.services[action.service],
            status: action.status,
            lastChecked: new Date()
          }
        }
      };

    case 'SET_ENDPOINT_STATUS':
      return {
        ...state,
        services: {
          ...state.services,
          [action.service]: {
            ...state.services[action.service],
            endpoints: {
              ...state.services[action.service].endpoints,
              [action.endpoint]: {
                ...state.services[action.service].endpoints[action.endpoint],
                ...action.state
              }
            }
          }
        }
      };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

    case 'SET_POLLING':
      return { ...state, isPolling: action.isPolling };

    case 'RESET_SERVICE':
      return {
        ...state,
        services: {
          ...state.services,
          [action.service]: createInitialServiceState(action.service)
        }
      };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  checkService: (service: ServiceName) => Promise<void>;
  checkAllServices: () => Promise<void>;
  refreshService: (service: ServiceName) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const pollingTimeouts = useRef<Map<ServiceName, ReturnType<typeof setTimeout>>>(new Map());

  // Check a single service and its endpoints
  const checkService = useCallback(async (service: ServiceName) => {
    // Set service to checking
    dispatch({ type: 'SET_SERVICE_STATUS', service, status: 'checking' });

    // Check health first
    const healthStatus = await checkServiceHealth(service);
    dispatch({ type: 'SET_SERVICE_STATUS', service, status: healthStatus });

    // If healthy, check all endpoints
    if (healthStatus === 'healthy') {
      const endpoints = getServiceEndpoints(service);

      for (const endpoint of endpoints) {
        dispatch({
          type: 'SET_ENDPOINT_STATUS',
          service,
          endpoint,
          state: { status: 'checking' }
        });

        const endpointState = await checkEndpoint(service, endpoint);
        dispatch({
          type: 'SET_ENDPOINT_STATUS',
          service,
          endpoint,
          state: endpointState
        });
      }
    } else {
      // Mark all endpoints as unknown if service is not healthy
      const endpoints = getServiceEndpoints(service);
      for (const endpoint of endpoints) {
        dispatch({
          type: 'SET_ENDPOINT_STATUS',
          service,
          endpoint,
          state: { status: 'unknown' }
        });
      }
    }
  }, []);

  // Check all services
  const checkAllServices = useCallback(async () => {
    const services: ServiceName[] = [
      'test-data-fetcher',
      'market-data',
      'strategy',
      'portfolio',
      'metrics',
      'orchestrator'
    ];

    // Check all services in parallel
    await Promise.all(services.map(service => checkService(service)));
  }, [checkService]);

  // Refresh a single service (reset and recheck)
  const refreshService = useCallback(async (service: ServiceName) => {
    dispatch({ type: 'RESET_SERVICE', service });
    await checkService(service);
  }, [checkService]);

  // Polling effect
  useEffect(() => {
    if (!state.isPolling) return;

    const services: ServiceName[] = [
      'test-data-fetcher',
      'market-data',
      'strategy',
      'portfolio',
      'metrics',
      'orchestrator'
    ];

    // Initial check
    checkAllServices();

    // Set up polling for each service based on its status
    const setupPolling = (service: ServiceName) => {
      const currentStatus = state.services[service].status;

      // Polling intervals based on status
      let interval: number;
      switch (currentStatus) {
        case 'unknown':
        case 'disconnected':
          interval = 5000; // Check frequently if disconnected
          break;
        case 'checking':
          interval = 3000;
          break;
        case 'unhealthy':
          interval = 4000;
          break;
        case 'healthy':
          interval = 15000; // Less frequent if healthy
          break;
        default:
          interval = 5000;
      }

      const timeoutId = setTimeout(async () => {
        await checkService(service);
        setupPolling(service);
      }, interval);

      pollingTimeouts.current.set(service, timeoutId);
    };

    // Start polling for each service
    services.forEach(service => {
      setupPolling(service);
    });

    // Cleanup
    return () => {
      pollingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pollingTimeouts.current.clear();
    };
  }, [state.isPolling]); // Only re-run when polling state changes

  return (
    <AppContext.Provider value={{ state, dispatch, checkService, checkAllServices, refreshService }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Convenience hook for getting a specific service
export function useServiceStatus(service: ServiceName) {
  const { state } = useApp();
  return state.services[service];
}
