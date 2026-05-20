'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, Account, Trade, Strategy, Tag, DayNote } from './types';
import {
  dbGetAccounts, dbCreateAccount, dbUpdateAccount, dbDeleteAccount,
  dbGetTrades, dbCreateTrades, dbUpdateTrade, dbDeleteTrade,
  dbGetStrategies, dbCreateStrategy, dbUpdateStrategy, dbDeleteStrategy,
  dbGetTags, dbCreateTag, dbUpdateTag, dbDeleteTag,
  dbGetDayNotes, dbSetDayNote, dbResetAll, dbCheckConnection
} from './actions';

const PREFS_KEY_PREFIX = 'trackr-prefs:'; // local-only UI prefs (theme, active account, settings)

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface LocalPrefs {
  activeAccountId: string | null;
  theme: string;
  symbolSettings: Record<string, { multiplier: number }>;
  apiKeys: Record<string, string>;
  fontNumbers?: string;
  fontLetters?: string;
}

function loadPrefs(userId: string): LocalPrefs {
  if (typeof window === 'undefined') {
    return { 
      activeAccountId: null, 
      theme: 'green', 
      symbolSettings: {}, 
      apiKeys: { twelveData: '93775736c5474430ab18f4d1dcfea75b' },
      fontNumbers: 'Share Tech Mono',
      fontLetters: 'Inter'
    };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.apiKeys) parsed.apiKeys = {};
      if (!parsed.apiKeys.twelveData) {
        parsed.apiKeys.twelveData = '93775736c5474430ab18f4d1dcfea75b';
      }
      if (!parsed.fontNumbers) parsed.fontNumbers = 'Share Tech Mono';
      if (!parsed.fontLetters) parsed.fontLetters = 'Inter';
      return parsed;
    }
  } catch { /* ignore */ }
  return {
    activeAccountId: null,
    theme: 'green',
    symbolSettings: { 'US30': { multiplier: 10 }, 'EURUSD': { multiplier: 100000 } },
    apiKeys: { twelveData: '93775736c5474430ab18f4d1dcfea75b' },
    fontNumbers: 'Share Tech Mono',
    fontLetters: 'Inter'
  };
}

function savePrefs(userId: string, prefs: LocalPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFS_KEY_PREFIX + userId, JSON.stringify(prefs));
}

interface StoreContextType {
  state: AppState;
  loadError: string | null;
  // Accounts
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setActiveAccount: (id: string | null) => void;
  // Trades
  addTrades: (trades: Trade[]) => void;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  // Strategies
  addStrategy: (strategy: Omit<Strategy, 'id'>) => void;
  updateStrategy: (id: string, updates: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;
  // Tags
  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  // Notes
  setDayNote: (date: string, note: string) => void;
  // Filtered
  getFilteredTrades: () => Trade[];
  // Settings
  setTheme: (theme: string) => void;
  updateSettings: (updates: { 
    symbolSettings?: Record<string, { multiplier: number }>; 
    apiKeys?: Record<string, string>; 
    fontNumbers?: string; 
    fontLetters?: string; 
  }) => void;
  // Reset
  resetData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [state, setState] = useState<AppState>(() => {
    const prefs = loadPrefs(userId);
    return {
      accounts: [], trades: [], strategies: [], tags: [], dayNotes: [],
      activeAccountId: prefs.activeAccountId,
      theme: prefs.theme,
      symbolSettings: prefs.symbolSettings,
      apiKeys: prefs.apiKeys,
      fontNumbers: prefs.fontNumbers,
      fontLetters: prefs.fontLetters,
    };
  });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load data from Supabase whenever userId changes
  useEffect(() => {
    let cancelled = false;
    async function syncFromDb() {
      const prefs = loadPrefs(userId);

      try {
        const check = await dbCheckConnection();
        if (!check.success) {
          throw new Error(check.error);
        }

        const settled = await Promise.allSettled([
          dbGetAccounts(),
          dbGetTrades(),
          dbGetStrategies(),
          dbGetTags(),
          dbGetDayNotes(),
        ]);
        const labels = ['accounts', 'trades', 'strategies', 'tags', 'dayNotes'];
        const failures = settled
          .map((r, i) => r.status === 'rejected' ? `${labels[i]}: ${(r.reason as any)?.message ?? r.reason}` : null)
          .filter(Boolean);
        if (failures.length > 0) {
          console.error('Supabase load failures:', failures);
          throw new Error(failures.join(' | '));
        }
        const [dbAccsR, dbTrdsR, dbStratsR, dbTgsR, dbNotesR] = settled as PromiseFulfilledResult<any>[];
        const dbAccs = dbAccsR.value;
        const dbTrds = dbTrdsR.value;
        const dbStrats = dbStratsR.value;
        const dbTgs = dbTgsR.value;
        const dbNotes = dbNotesR.value;

        if (cancelled) return;

        const accounts = dbAccs.map((a: any) => ({
          ...a,
          createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
        })) as Account[];

        const activeAccountId =
          prefs.activeAccountId && accounts.some(a => a.id === prefs.activeAccountId)
            ? prefs.activeAccountId
            : (accounts[0]?.id ?? null);

        setState({
          accounts,
          trades: dbTrds as Trade[],
          strategies: dbStrats as Strategy[],
          tags: dbTgs as Tag[],
          dayNotes: dbNotes as DayNote[],
          activeAccountId,
          theme: prefs.theme,
          symbolSettings: prefs.symbolSettings,
          apiKeys: prefs.apiKeys,
          fontNumbers: prefs.fontNumbers,
          fontLetters: prefs.fontLetters,
        });
        setLoadError(null);
      } catch (e: any) {
        if (cancelled) return;
        console.error('Erreur de synchronisation Supabase :', e);
        setLoadError(e?.message ?? 'Erreur Supabase');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    syncFromDb();
    return () => { cancelled = true; };
  }, [userId]);

  // Persist UI prefs (theme, settings, active account) per user
  useEffect(() => {
    if (!loaded) return;
    savePrefs(userId, {
      activeAccountId: state.activeAccountId,
      theme: state.theme,
      symbolSettings: state.symbolSettings,
      apiKeys: state.apiKeys,
      fontNumbers: state.fontNumbers,
      fontLetters: state.fontLetters,
    });
  }, [loaded, userId, state.activeAccountId, state.theme, state.symbolSettings, state.apiKeys, state.fontNumbers, state.fontLetters]);

  useEffect(() => {
    if (state.theme && state.theme !== 'green') {
      document.documentElement.setAttribute('data-theme', state.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.theme]);

  useEffect(() => {
    if (!loaded) return;
    const numFont = state.fontNumbers || 'Share Tech Mono';
    const letFont = state.fontLetters || 'Inter';

    // Set the CSS variables dynamically
    document.documentElement.style.setProperty('--font-numbers', `'${numFont}', monospace`);
    document.documentElement.style.setProperty('--font-letters', `'${letFont}', sans-serif`);

    // Ensure we load the Google Fonts dynamically
    const fontId = 'dynamic-google-fonts';
    let link = document.getElementById(fontId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    const encodedNum = encodeURIComponent(numFont);
    const encodedLet = encodeURIComponent(letFont);
    link.href = `https://fonts.googleapis.com/css2?family=${encodedNum}&family=${encodedLet}:wght@300;400;500;600;700;800&display=swap`;
  }, [loaded, state.fontNumbers, state.fontLetters]);

  const addAccount = useCallback((account: Omit<Account, 'id' | 'createdAt'>) => {
    const newAcc = { ...account, id: uid(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, accounts: [...prev.accounts, newAcc] }));
    dbCreateAccount(newAcc).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setState(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a) }));
    dbUpdateAccount(id, updates).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
      trades: prev.trades.filter(t => t.accountId !== id),
      activeAccountId: prev.activeAccountId === id ? null : prev.activeAccountId,
    }));
    dbDeleteAccount(id).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const setActiveAccount = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeAccountId: id }));
  }, []);

  const addTrades = useCallback((trades: Trade[]) => {
    setState(prev => ({ ...prev, trades: [...prev.trades, ...trades] }));
    dbCreateTrades(trades).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setState(prev => ({ ...prev, trades: prev.trades.map(t => t.id === id ? { ...t, ...updates } : t) }));
    dbUpdateTrade(id, updates).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setState(prev => ({ ...prev, trades: prev.trades.filter(t => t.id !== id) }));
    dbDeleteTrade(id).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const addStrategy = useCallback((strategy: Omit<Strategy, 'id'>) => {
    const newStrat = { ...strategy, id: uid() };
    setState(prev => ({ ...prev, strategies: [...prev.strategies, newStrat] }));
    dbCreateStrategy(newStrat).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const updateStrategy = useCallback((id: string, updates: Partial<Strategy>) => {
    setState(prev => ({ ...prev, strategies: prev.strategies.map(s => s.id === id ? { ...s, ...updates } : s) }));
    dbUpdateStrategy(id, updates).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const deleteStrategy = useCallback((id: string) => {
    setState(prev => ({ ...prev, strategies: prev.strategies.filter(s => s.id !== id) }));
    dbDeleteStrategy(id).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const addTag = useCallback((tag: Omit<Tag, 'id'>) => {
    const newTag = { ...tag, id: uid() };
    setState(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
    dbCreateTag(newTag).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setState(prev => ({ ...prev, tags: prev.tags.map(t => t.id === id ? { ...t, ...updates } : t) }));
    dbUpdateTag(id, updates).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const deleteTag = useCallback((id: string) => {
    setState(prev => ({ ...prev, tags: prev.tags.filter(t => t.id !== id) }));
    dbDeleteTag(id).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const setDayNote = useCallback((date: string, note: string) => {
    setState(prev => {
      const idx = prev.dayNotes.findIndex(n => n.date === date);
      const dayNotes = [...prev.dayNotes];
      if (idx >= 0) dayNotes[idx] = { date, note };
      else dayNotes.push({ date, note });
      return { ...prev, dayNotes };
    });
    dbSetDayNote(date, note).catch(err => console.error('DB Sync Error:', err));
  }, []);

  const getFilteredTrades = useCallback(() => {
    if (!state.activeAccountId) return state.trades;
    return state.trades.filter(t => t.accountId === state.activeAccountId);
  }, [state.activeAccountId, state.trades]);

  const setTheme = useCallback((theme: string) => {
    setState(prev => ({ ...prev, theme }));
  }, []);

  const updateSettings = useCallback((updates: { 
    symbolSettings?: Record<string, { multiplier: number }>; 
    apiKeys?: Record<string, string>; 
    fontNumbers?: string; 
    fontLetters?: string; 
  }) => {
    setState(prev => ({
      ...prev,
      symbolSettings: updates.symbolSettings ? { ...prev.symbolSettings, ...updates.symbolSettings } : prev.symbolSettings,
      apiKeys: updates.apiKeys ? { ...prev.apiKeys, ...updates.apiKeys } : prev.apiKeys,
      fontNumbers: updates.fontNumbers !== undefined ? updates.fontNumbers : prev.fontNumbers,
      fontLetters: updates.fontLetters !== undefined ? updates.fontLetters : prev.fontLetters,
    }));
  }, []);

  const resetData = useCallback(async () => {
    try {
      await dbResetAll();
    } catch (err) {
      console.error('Failed to reset database:', err);
      throw err;
    }
    // Clear local prefs (keep theme so the user keeps their UI theme)
    const keptTheme = state.theme;
    localStorage.removeItem(PREFS_KEY_PREFIX + userId);
    setState({
      accounts: [], trades: [], strategies: [], tags: [], dayNotes: [],
      activeAccountId: null,
      theme: keptTheme,
      symbolSettings: { 'US30': { multiplier: 10 }, 'EURUSD': { multiplier: 100000 } },
      apiKeys: { twelveData: '93775736c5474430ab18f4d1dcfea75b' },
      fontNumbers: 'Share Tech Mono',
      fontLetters: 'Inter'
    });
  }, [userId, state.theme]);

  if (!loaded) {
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
          <p style={{ color: '#a1a1aa' }}>Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{
      state, loadError,
      addAccount, updateAccount, deleteAccount, setActiveAccount,
      addTrades, updateTrade, deleteTrade,
      addStrategy, updateStrategy, deleteStrategy,
      addTag, updateTag, deleteTag,
      setDayNote, getFilteredTrades, setTheme, updateSettings, resetData,
    }}>
      {loadError && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fecaca', padding: '10px 16px', borderRadius: 10, fontSize: 13,
          backdropFilter: 'blur(8px)', maxWidth: 600,
        }}>
          Connexion Supabase indisponible : {loadError}
        </div>
      )}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
