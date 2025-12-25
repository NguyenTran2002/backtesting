import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { TestingLab } from './components/lab/TestingLab';

function AppContent() {
  const { state } = useApp();

  return (
    <Layout>
      {state.activeTab === 'dashboard' && <Dashboard />}
      {state.activeTab === 'lab' && <TestingLab />}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
