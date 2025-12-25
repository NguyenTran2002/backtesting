import { useState, useEffect } from 'react';
import type { ServiceName } from '../../types';
import { SERVICE_CONFIGS, runEndpointCall, getServiceUrl } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

interface TestResult {
  response: unknown;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export function TestingLab() {
  const { state } = useApp();

  const [selectedService, setSelectedService] = useState<ServiceName>('test-data-fetcher');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [requestBody, setRequestBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const serviceConfig = SERVICE_CONFIGS[selectedService];
  const endpoints = Object.keys(serviceConfig.endpoints);
  const currentEndpoint = serviceConfig.endpoints[selectedEndpoint];
  const serviceStatus = state.services[selectedService]?.status;

  // Update endpoint and request body when service changes
  useEffect(() => {
    const firstEndpoint = endpoints[0];
    setSelectedEndpoint(firstEndpoint);
    const config = serviceConfig.endpoints[firstEndpoint];
    if (config?.testInput) {
      setRequestBody(JSON.stringify(config.testInput, null, 2));
    } else {
      setRequestBody('');
    }
    setResult(null);
  }, [selectedService]);

  // Update request body when endpoint changes
  useEffect(() => {
    if (currentEndpoint?.testInput) {
      setRequestBody(JSON.stringify(currentEndpoint.testInput, null, 2));
    } else {
      setRequestBody('');
    }
    setResult(null);
  }, [selectedEndpoint]);

  const handleRun = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      let input: Record<string, unknown> | undefined;

      if (requestBody.trim()) {
        try {
          input = JSON.parse(requestBody);
        } catch {
          setResult({
            response: null,
            responseTime: 0,
            error: 'Invalid JSON in request body',
            timestamp: new Date()
          });
          setIsLoading(false);
          return;
        }
      }

      const testResult = await runEndpointCall(selectedService, selectedEndpoint, input);
      setResult({
        ...testResult,
        timestamp: new Date()
      });
    } catch (err) {
      setResult({
        response: null,
        responseTime: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFullUrl = () => {
    if (!currentEndpoint) return '';
    return `${getServiceUrl(selectedService)}${currentEndpoint.path}`;
  };

  return (
    <div className="lab">
      {/* Request Panel */}
      <div className="lab-panel animate-fade-in animate-delay-1">
        <div className="lab-panel-header">
          <span className="lab-panel-title">Request Configuration</span>
        </div>
        <div className="lab-panel-body">
          {/* Service selector */}
          <div className="form-group">
            <label className="form-label">Service</label>
            <select
              className="form-select"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as ServiceName)}
            >
              {Object.entries(SERVICE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.displayName} (:{config.port})
                </option>
              ))}
            </select>
          </div>

          {/* Endpoint selector */}
          <div className="form-group">
            <label className="form-label">Endpoint</label>
            <select
              className="form-select"
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
            >
              {endpoints.map((key) => {
                const ep = serviceConfig.endpoints[key];
                return (
                  <option key={key} value={key}>
                    {ep.method} {ep.path.split('?')[0]}
                  </option>
                );
              })}
            </select>
          </div>

          {/* URL display */}
          <div className="form-group">
            <label className="form-label">Request URL</label>
            <div className="code-block">
              <pre>
                <span style={{ color: 'var(--color-amber-base)' }}>
                  {currentEndpoint?.method}
                </span>{' '}
                {getFullUrl()}
              </pre>
            </div>
          </div>

          {/* Request body (for POST) */}
          {currentEndpoint?.method === 'POST' && (
            <div className="form-group">
              <label className="form-label">Request Body (JSON)</label>
              <textarea
                className="form-textarea"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder="Enter JSON request body..."
              />
            </div>
          )}

          {/* Run button */}
          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={isLoading || serviceStatus !== 'healthy'}
            style={{ width: '100%' }}
          >
            {isLoading ? '↻ Running...' : 'Run Request'}
          </button>

          {serviceStatus !== 'healthy' && (
            <p style={{
              marginTop: 'var(--space-3)',
              fontSize: '0.75rem',
              color: 'var(--color-warning)'
            }}>
              Service is {serviceStatus || 'not available'}. Start the service first.
            </p>
          )}
        </div>
      </div>

      {/* Response Panel */}
      <div className="lab-panel animate-fade-in animate-delay-2">
        <div className="lab-panel-header">
          <span className="lab-panel-title">Response</span>
          {result && (
            <span className="response-time">
              {Math.round(result.responseTime)}ms
            </span>
          )}
        </div>
        <div className="lab-panel-body">
          {!result && !isLoading && (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-10)',
              color: 'var(--color-text-muted)'
            }}>
              <p style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>○</p>
              <p>Run a request to see the response</p>
            </div>
          )}

          {isLoading && (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-10)',
              color: 'var(--color-amber-base)'
            }}>
              <p style={{
                fontSize: '2rem',
                marginBottom: 'var(--space-4)',
                animation: 'spin 1s linear infinite',
                display: 'inline-block'
              }}>↻</p>
              <p>Sending request...</p>
            </div>
          )}

          {result && (
            <div className="response-section">
              <div className="response-header">
                <span className={`response-status ${result.error ? 'error' : 'success'}`}>
                  {result.error ? 'Error' : 'Success'}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {result.error ? (
                <div className="endpoint-error" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="endpoint-error-text">{result.error}</div>
                </div>
              ) : (
                <div className="code-block" style={{ marginTop: 'var(--space-4)' }}>
                  <pre>{JSON.stringify(result.response, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
