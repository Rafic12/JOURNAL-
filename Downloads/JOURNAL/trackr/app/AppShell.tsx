'use client';

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ImportModal from './components/ImportModal';
import StrategyManager from './components/StrategyManager';
import TagManager from './components/TagManager';
import LoginPage, { getStoredUser, AUTH_KEY, AuthUser } from './components/LoginPage';
import { StoreProvider } from '@/lib/store';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [importOpen, setImportOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  // Loading state
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#09090b', color: '#fafafa',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #27272a',
            borderTop: '3px solid #3b82f6', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: '#a1a1aa' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  // Logged in → show app
  return (
    <StoreProvider>
      <div className="app-layout">
        <Sidebar
          onImport={() => setImportOpen(true)}
          onStrategies={() => setStrategyOpen(true)}
          onTags={() => setTagOpen(true)}
          user={user}
          onLogout={handleLogout}
        />
        <main className="main-content">
          {children}
        </main>
        <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
        <StrategyManager open={strategyOpen} onClose={() => setStrategyOpen(false)} />
        <TagManager open={tagOpen} onClose={() => setTagOpen(false)} />
      </div>
    </StoreProvider>
  );
}
