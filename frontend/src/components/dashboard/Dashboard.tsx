import { useApp } from '../../contexts/AppContext';
import { ServiceCard } from './ServiceCard';
import type { ServiceName } from '../../types';

// Order services logically: Test Data first, then the pipeline order
const SERVICE_ORDER: ServiceName[] = [
  'test-data-fetcher',
  'market-data',
  'strategy',
  'portfolio',
  'metrics',
  'orchestrator'
];

export function Dashboard() {
  const { state, checkAllServices } = useApp();

  const healthyCount = Object.values(state.services).filter(s => s.status === 'healthy').length;
  const totalCount = Object.keys(state.services).length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Service Status Overview</h2>
        <p className="dashboard-description">
          Monitoring {totalCount} microservices.{' '}
          <span className={healthyCount === totalCount ? 'text-success' : 'text-warning'}>
            {healthyCount} of {totalCount} healthy
          </span>
          .{' '}
          <button
            onClick={checkAllServices}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-amber-base)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            Refresh all
          </button>
        </p>
      </div>

      {SERVICE_ORDER.map((serviceName, index) => (
        <ServiceCard
          key={serviceName}
          service={state.services[serviceName]}
          animationDelay={index + 1}
        />
      ))}
    </div>
  );
}
