'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import ImportModal from './components/ImportModal';
import StrategyManager from './components/StrategyManager';
import TagManager from './components/TagManager';
import LoginPage from './components/LoginPage';
import { StoreProvider } from '@/lib/store';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [importOpen, setImportOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    setUser(null);
  };

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

  if (!user) {
    return <LoginPage onLoggedIn={() => { /* state will refresh via onAuthStateChange */ }} />;
  }

  const sidebarUser = {
    email: user.email ?? '',
    name: (user.user_metadata?.name as string) || (user.email?.split('@')[0] ?? 'Trader'),
    avatar: (user.email?.charAt(0).toUpperCase()) ?? 'T',
  };

  return (
    <StoreProvider userId={user.id}>
      <div className="app-layout">
        <Sidebar
          onImport={() => setImportOpen(true)}
          onStrategies={() => setStrategyOpen(true)}
          onTags={() => setTagOpen(true)}
          user={sidebarUser}
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
