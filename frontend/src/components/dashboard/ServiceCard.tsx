import { useState } from 'react';
import type { ServiceState, EndpointStatus } from '../../types';
import { SERVICE_CONFIGS, getServiceStatusLabel, getEndpointStatusLabel, getServiceCompletion } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

interface ServiceCardProps {
  service: ServiceState;
  animationDelay?: number;
}

function EndpointStatusIcon({ status }: { status: EndpointStatus }) {
  const icons: Record<EndpointStatus, string> = {
    unknown: '○',
    checking: '↻',
    working: '✓',
    missing: '✕',
    error: '!',
    'wrong-format': '⚠'
  };

  return (
    <span className={`endpoint-status-icon ${status}`}>
      {icons[status]}
    </span>
  );
}

export function ServiceCard({ service, animationDelay = 0 }: ServiceCardProps) {
  const { refreshService } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const config = SERVICE_CONFIGS[service.name];
  const completion = getServiceCompletion(service.endpoints);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshService(service.name);
    setIsRefreshing(false);
  };

  return (
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
            const isExpanded = expandedEndpoint === key;
            const hasError = endpointState?.error && ['missing', 'error', 'wrong-format'].includes(endpointState.status);

            return (
              <div key={key}>
                <div
                  className="endpoint-row"
                  onClick={() => hasError && setExpandedEndpoint(isExpanded ? null : key)}
                  style={{ cursor: hasError ? 'pointer' : 'default' }}
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
                    <EndpointStatusIcon status={endpointState?.status || 'unknown'} />
                    <span className="endpoint-status-text">
                      {getEndpointStatusLabel(endpointState?.status || 'unknown')}
                    </span>
                  </div>
                </div>
                {isExpanded && endpointState?.error && (
                  <div className="endpoint-error">
                    <div className="endpoint-error-text">{endpointState.error}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="service-card-footer">
        <div className="service-progress">
          <div className="progress-bar">
            <div
              className={`progress-fill ${completion === 100 ? 'complete' : ''}`}
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="progress-text">{completion}% complete</span>
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
  );
}
