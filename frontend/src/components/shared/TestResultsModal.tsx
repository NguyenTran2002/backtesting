import React, { useState } from 'react';
import { Modal } from './Modal';
import type { EndpointTestResults, TestResult, TestCategory } from '../../types';
import './TestResultsModal.css';

interface TestResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpointName: string;
  method: string;
  path: string;
  testResults: EndpointTestResults | null;
  onRunTests: () => void;
  isRunning: boolean;
}

interface CategorySectionProps {
  category: TestCategory;
  label: string;
  results: TestResult[];
  defaultExpanded: boolean;
}

function CategorySection({ category, label, results, defaultExpanded }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (results.length === 0) return null;

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const allPassed = failed === 0;

  return (
    <div className={`test-category ${category}`}>
      <button
        className="category-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={`category-chevron ${isExpanded ? 'expanded' : ''}`}>›</span>
        <span className="category-label">{label}</span>
        <span className={`category-count ${allPassed ? 'all-passed' : 'has-failures'}`}>
          {passed}/{results.length}
        </span>
      </button>

      {isExpanded && (
        <div className="category-tests">
          {results.map((result) => (
            <TestResultRow key={result.testId} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

// Extract field info from expected/actual strings
// Handles patterns like: "field: value", "field = value", "field[0] = value", "data.field: value"
function extractFieldInfo(str: string): { field: string; value: string }[] {
  const results: { field: string; value: string }[] = [];

  // Pattern for "field = value" or "field: value" (captures last segment of dotted path)
  // e.g., "portfolio_value = 100" -> field: "portfolio_value", value: "100"
  // e.g., "data.time_series: Object" -> field: "time_series", value: "Object"
  const patterns = [
    /([a-z_][a-z0-9_]*)(?:\[\d+\])?\s*=\s*(.+?)(?:,|$)/gi,  // field = value or field[0] = value
    /([a-z_][a-z0-9_]*)\s*:\s*(.+?)(?:,|$)/gi,              // field: value
  ];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(str)) !== null) {
      const field = match[1];
      const value = match[2].trim();
      // Skip if value looks like it's just another field definition
      if (value && !results.some(r => r.field === field)) {
        results.push({ field, value });
      }
    }
  }

  return results;
}

// Render JSON with GitHub-style inline diffs for failed fields
function renderJsonWithDiff(
  data: unknown,
  expected: string | undefined,
  actual: string | undefined,
  passed: boolean
): React.ReactNode {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const lines = jsonStr.split('\n');

    // If test passed or no expected/actual info, just render plain JSON
    if (passed || (!expected && !actual)) {
      return <span>{jsonStr}</span>;
    }

    // Extract field info from actual string (these are the problematic fields)
    const actualInfo = actual ? extractFieldInfo(actual) : [];
    const problemFields = new Set(actualInfo.map(info => info.field));

    // Extract expected values
    const expectedInfo = expected ? extractFieldInfo(expected) : [];
    const corrections: Record<string, string> = {};
    expectedInfo.forEach(info => {
      corrections[info.field] = info.value;
    });

    return (
      <>
        {lines.map((line, idx) => {
          // Check if this line contains a problematic field
          const fieldMatch = line.match(/"([a-z_][a-z0-9_]*)"\s*:/i);
          const fieldName = fieldMatch ? fieldMatch[1] : null;
          const isProblem = fieldName && problemFields.has(fieldName);

          if (isProblem && fieldName) {
            const correction = corrections[fieldName];
            // Get the indentation from the current line
            const indent = line.match(/^(\s*)/)?.[1] || '';

            // Determine what to show as correction:
            // 1. If we have a specific correction for this field, use it
            // 2. Otherwise, use the general expected string as the expected format
            const correctionValue = correction || (expected ? `"${expected}"` : null);
            const correctionLabel = correction ? '← expected' : '← expected format';

            return (
              <React.Fragment key={idx}>
                <span className="json-diff-line wrong">
                  <span className="json-diff-prefix">−</span>
                  {line}
                  <span className="json-diff-comment">{" // ← wrong"}</span>
                </span>
                {'\n'}
                {correctionValue && (
                  <>
                    <span className="json-diff-line correct">
                      <span className="json-diff-prefix">+</span>
                      {`${indent}"${fieldName}": ${correctionValue},`}
                      <span className="json-diff-comment">{` // ${correctionLabel}`}</span>
                    </span>
                    {'\n'}
                  </>
                )}
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={idx}>
              {line}
              {idx < lines.length - 1 ? '\n' : ''}
            </React.Fragment>
          );
        })}
      </>
    );
  } catch {
    return <span>{String(data)}</span>;
  }
}

function TestResultRow({ result }: { result: TestResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const hasRawData = Boolean(result.rawRequest || result.rawResponse !== undefined);
  const hasFailureDetails = !result.passed && Boolean(result.expected || result.actual || result.message);
  const canExpand = hasFailureDetails || hasRawData;

  const formatJson = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className={`test-row ${result.passed ? 'passed' : 'failed'}`}>
      <div
        className={`test-row-main ${canExpand ? 'expandable' : ''}`}
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
      >
        <span className="test-icon">{result.passed ? '✓' : '✕'}</span>
        <span className="test-name">{result.name}</span>
        {canExpand && (
          <span className={`test-expand-icon ${isExpanded ? 'expanded' : ''}`}>›</span>
        )}
      </div>

      {isExpanded && canExpand && (
        <div className="test-details">
          {result.message && (
            <div className="test-message">{result.message}</div>
          )}
          {result.expected && (
            <div className="test-diff expected">
              <span className="diff-label">Expected:</span>
              <code className="diff-value">{result.expected}</code>
            </div>
          )}
          {result.actual && (
            <div className="test-diff actual">
              <span className="diff-label">Actual:</span>
              <code className="diff-value">{result.actual}</code>
            </div>
          )}

          {hasRawData && (
            <div className="raw-data-section">
              <button
                className="raw-data-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRawData(!showRawData);
                }}
              >
                <span className={`raw-data-chevron ${showRawData ? 'expanded' : ''}`}>›</span>
                {showRawData ? 'Hide' : 'View'} Raw Request/Response
              </button>

              {showRawData && (
                <div className="raw-data-content">
                  {result.rawRequest && (
                    <div className="raw-data-block">
                      <div className="raw-data-label">Request Input</div>
                      <pre className="raw-data-json">{formatJson(result.rawRequest)}</pre>
                    </div>
                  )}
                  {result.rawResponse !== undefined && (
                    <div className="raw-data-block">
                      <div className="raw-data-label">Response{!result.passed && ' (with inline corrections)'}</div>
                      <pre className="raw-data-json">
                        {renderJsonWithDiff(result.rawResponse, result.expected, result.actual, result.passed)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TestResultsModal({
  isOpen,
  onClose,
  endpointName: _endpointName,
  method,
  path,
  testResults,
  onRunTests,
  isRunning,
}: TestResultsModalProps) {
  void _endpointName; // Used for title display
  if (!testResults) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Test Results" size="large">
        <div className="test-results-empty">
          <p>No test results available.</p>
          <button className="run-tests-btn primary" onClick={onRunTests} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>
        </div>
      </Modal>
    );
  }

  const { passed, failed, total, results, lastRun } = testResults;
  const allPassed = failed === 0;

  // Group results by category
  const formatTests = results.filter(r => r.category === 'format');
  const correctnessTests = results.filter(r => r.category === 'correctness');
  const edgeCaseTests = results.filter(r => r.category === 'edge-case');

  // All sections start collapsed - user clicks to expand
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="test-results-modal">
        <div className="test-results-header">
          <div className="endpoint-info">
            <span className="endpoint-method">{method}</span>
            <span className="endpoint-path">{path}</span>
          </div>
          <div className="header-right">
            <div className={`test-summary-badge ${allPassed ? 'all-passed' : 'has-failures'}`}>
              {passed}/{total} passing
            </div>
            <button
              className="modal-close-icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="test-results-meta">
          <span className="last-run">
            Last run: {lastRun.toLocaleTimeString()}
          </span>
        </div>

        <div className="test-categories">
          <CategorySection
            category="format"
            label="Format Tests"
            results={formatTests}
            defaultExpanded={false}
          />
          <CategorySection
            category="correctness"
            label="Correctness Tests"
            results={correctnessTests}
            defaultExpanded={false}
          />
          <CategorySection
            category="edge-case"
            label="Edge Case Tests"
            results={edgeCaseTests}
            defaultExpanded={false}
          />
        </div>

        <div className="test-results-footer">
          <button
            className="run-tests-btn"
            onClick={onRunTests}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
