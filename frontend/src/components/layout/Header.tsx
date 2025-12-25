import { useApp } from '../../contexts/AppContext';

export function Header() {
  const { state, dispatch } = useApp();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <div className="header-logo">BT</div>
          <h1 className="header-title">Backtesting Platform</h1>
          <span className="header-subtitle">Service Dashboard</span>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-tab ${state.activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'dashboard' })}
          >
            Dashboard
          </button>
          <button
            className={`nav-tab ${state.activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'lab' })}
          >
            Testing Lab
          </button>
        </nav>

        <div className="header-status">
          <div className="status-indicator">
            <span className={`status-dot ${state.isPolling ? 'polling' : ''}`} />
            <span>{state.isPolling ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
