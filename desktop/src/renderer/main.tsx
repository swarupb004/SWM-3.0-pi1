import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import CaseDrawer from './components/CaseDrawer';

const MainView: React.FC = () => (
  <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <h1 style={{ marginBottom: '12px' }}>BPO Tracker Desktop</h1>
    <p style={{ margin: 0 }}>
      The desktop app is running. Use <strong>Ctrl+Shift+C</strong> to open the drawer or click the tray icon.
    </p>
  </div>
);

const App: React.FC = () => {
  const [route, setRoute] = useState<string>(window.location.hash || '#/');

  useEffect(() => {
    const handler = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (route === '#/drawer') {
    return <CaseDrawer />;
  }

  return <MainView />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
