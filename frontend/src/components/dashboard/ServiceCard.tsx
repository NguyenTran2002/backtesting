import { useState } from 'react';
import type { ServiceState, EndpointTestResults } from '../../types';
import {
  SERVICE_CONFIGS,
  getServiceStatusLabel,
  getServiceTestPassRate,
  runEndpointTestsOnDemand,
  getTestSummary
} from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import { TestResultsModal } from '../shared/TestResultsModal';
import './ServiceCard.css';

interface ServiceCardProps {
  service: ServiceState;
  animationDelay?: number;
}

function TestBadge({ testResults }: { testResults?: EndpointTestResults }) {
  const summary = getTestSummary(testResults);

  if (summary.status === 'none') {
    return <span className="test-badge none">No tests</span>;
  }

  return (
    <span className={`test-badge ${summary.status}`}>
      {summary.passed}/{summary.total}
    </span>
  );
}

export function ServiceCard({ service, animationDelay = 0 }: ServiceCardProps) {
  const { refreshService, dispatch } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const config = SERVICE_CONFIGS[service.name];
  const testStats = getServiceTestPassRate(service.endpoints);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshService(service.name);
    setIsRefreshing(false);
  };

  const handleEndpointClick = (endpointKey: string) => {
    setSelectedEndpoint(endpointKey);
  };

  const handleCloseModal = () => {
    setSelectedEndpoint(null);
  };

  const handleRunTests = async () => {
    if (!selectedEndpoint) return;

    setIsRunningTests(true);
    try {
      const testResults = await runEndpointTestsOnDemand(service.name, selectedEndpoint);
      dispatch({
        type: 'SET_ENDPOINT_STATUS',
        service: service.name,
        endpoint: selectedEndpoint,
        state: { testResults }
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const selectedEndpointConfig = selectedEndpoint ? config.endpoints[selectedEndpoint] : null;
  const selectedEndpointState = selectedEndpoint ? service.endpoints[selectedEndpoint] : null;

  return (
    <>
      <div
        className={`service-card ${service.status} animate-fade-in animate-delay-${animationDelay}`}
      >
        <div className="service-card-header">
          <div className="service-info">
            <h3 className="service-name">{service.displayName}</h3>
            <span className="service-port">localhost:{service.port}</span>
          </div>
          <span className={`service-status-badge ${service.status}`}>
            <span className="status-icon" />
            {getServiceStatusLabel(service.status)}
          </span>
        </div>

        <div className="service-card-body">
          <div className="endpoints-list">
            {Object.entries(config.endpoints).map(([key, endpointConfig]) => {
              const endpointState = service.endpoints[key];

              return (
                <div key={key}>
                  <div
                    className="endpoint-row clickable"
                    onClick={() => handleEndpointClick(key)}
                  >
                    <div className="endpoint-info">
                      <div className="endpoint-path">
                        <span className="endpoint-method">{endpointConfig.method}</span>
                        {endpointConfig.path.split('?')[0]}
                      </div>
                      <span className="endpoint-description">{endpointConfig.description}</span>
                    </div>
                    <div className="endpoint-status">
                      {endpointState?.responseTime && endpointState.status === 'working' && (
                        <span className="endpoint-response-time">
                          {Math.round(endpointState.responseTime)}ms
                        </span>
                      )}
                      <TestBadge testResults={endpointState?.testResults} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="service-card-footer">
          <div className="service-progress">
            <div className="progress-bar">
              <div
                className={`progress-fill ${testStats.percentage === 100 ? 'complete' : ''}`}
                style={{ width: `${testStats.percentage}%` }}
              />
            </div>
            <span className="progress-text">
              {testStats.total > 0 ? `${testStats.passed}/${testStats.total} tests` : 'No tests'}
            </span>
          </div>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || service.status === 'checking'}
          >
            {isRefreshing ? '↻ Checking...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {selectedEndpoint && selectedEndpointConfig && (
        <TestResultsModal
          isOpen={true}
          onClose={handleCloseModal}
          endpointName={selectedEndpoint}
          method={selectedEndpointConfig.method}
          path={selectedEndpointConfig.path}
          testResults={selectedEndpointState?.testResults || null}
          onRunTests={handleRunTests}
          isRunning={isRunningTests}
        />
      )}
    </>
  );
}
