'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, Account, Trade, Strategy, Tag, DayNote } from './types';
import { generateDemoTrades, DEMO_ACCOUNTS, DEMO_STRATEGIES, DEMO_TAGS } from './demo-data';
import {
  dbGetAccounts, dbCreateAccount, dbUpdateAccount, dbDeleteAccount,
  dbGetTrades, dbCreateTrades, dbUpdateTrade, dbDeleteTrade,
  dbGetStrategies, dbCreateStrategy, dbUpdateStrategy, dbDeleteStrategy,
  dbGetTags, dbCreateTag, dbUpdateTag, dbDeleteTag,
  dbGetDayNotes, dbSetDayNote, dbResetAll
} from './actions';

const STORAGE_KEY = 'trackr-data';

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

function loadState(): AppState {
  if (typeof window === 'undefined') {
    return { accounts: [], trades: [], strategies: [], tags: [], dayNotes: [], activeAccountId: null, theme: 'green', symbolSettings: {}, apiKeys: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }

  // Initialize with demo data
  const trades = generateDemoTrades();
  const state: AppState = {
    accounts: DEMO_ACCOUNTS,
    trades,
    strategies: DEMO_STRATEGIES,
    tags: DEMO_TAGS,
    dayNotes: [],
    activeAccountId: 'acc-1',
    theme: 'green',
    symbolSettings: { 'US30': { multiplier: 10 }, 'EURUSD': { multiplier: 100000 } },
    apiKeys: {},
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

interface StoreContextType {
  state: AppState;
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
  updateSettings: (updates: { symbolSettings?: Record<string, { multiplier: number }>; apiKeys?: Record<string, string> }) => void;
  // Reset
  resetData: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    accounts: [], trades: [], strategies: [], tags: [], dayNotes: [], activeAccountId: null, theme: 'green', symbolSettings: {}, apiKeys: {}
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function syncFromDb() {
      const loadedState = loadState();
      if (!loadedState.theme) loadedState.theme = 'green';
      if (!loadedState.symbolSettings) loadedState.symbolSettings = {};
      if (!loadedState.apiKeys) loadedState.apiKeys = {};

      try {
        const [dbAccs, dbTrds, dbStrats, dbTgs, dbNotes] = await Promise.all([
          dbGetAccounts(),
          dbGetTrades(),
          dbGetStrategies(),
          dbGetTags(),
          dbGetDayNotes(),
        ]);
        
        const mappedAccs = dbAccs.map((a: any) => ({
          ...a,
          createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt)
        })) as Account[];
        
        let accounts = mappedAccs;
        let trades = dbTrds as Trade[];
        let strategies = dbStrats as Strategy[];
        let tags = dbTgs as Tag[];
        let dayNotes = dbNotes as DayNote[];

        if (dbAccs.length === 0 && loadedState.accounts.length > 0) {
          console.log("Migrating local storage data to Supabase...");
          await Promise.all([
            ...loadedState.accounts.map(a => dbCreateAccount(a)),
            ...loadedState.strategies.map(s => dbCreateStrategy(s)),
            ...loadedState.tags.map(t => dbCreateTag(t)),
            ...loadedState.dayNotes.map(n => dbSetDayNote(n.date, n.note)),
          ]);
          if (loadedState.trades.length > 0) {
            await dbCreateTrades(loadedState.trades);
          }
          console.log("Migration complete!");
          accounts = loadedState.accounts;
          trades = loadedState.trades;
          strategies = loadedState.strategies;
          tags = loadedState.tags;
          dayNotes = loadedState.dayNotes;
        }

        const mergedState = {
          ...loadedState,
          accounts: accounts.length > 0 ? accounts : loadedState.accounts,
          trades: trades.length > 0 ? trades : loadedState.trades,
          strategies: strategies.length > 0 ? strategies : loadedState.strategies,
          tags: tags.length > 0 ? tags : loadedState.tags,
          dayNotes: dayNotes.length > 0 ? dayNotes : loadedState.dayNotes,
        };

        setState(mergedState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
      } catch (e) {
        console.log("Supabase not connected, falling back to local storage:", e);
        setState(loadedState);
      }
      setLoaded(true);
    }
    syncFromDb();
  }, []);

  useEffect(() => {
    if (state.theme && state.theme !== 'green') {
      document.documentElement.setAttribute('data-theme', state.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.theme]);

  const persist = useCallback((newState: AppState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const addAccount = useCallback((account: Omit<Account, 'id' | 'createdAt'>) => {
    const newAcc = { ...account, id: uid(), createdAt: new Date().toISOString() };
    setState(prev => {
      const newState = {
        ...prev,
        accounts: [...prev.accounts, newAcc],
      };
      persist(newState);
      return newState;
    });
    dbCreateAccount(newAcc).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setState(prev => {
      const newState = {
        ...prev,
        accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a),
      };
      persist(newState);
      return newState;
    });
    dbUpdateAccount(id, updates).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const deleteAccount = useCallback((id: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        accounts: prev.accounts.filter(a => a.id !== id),
        trades: prev.trades.filter(t => t.accountId !== id),
        activeAccountId: prev.activeAccountId === id ? null : prev.activeAccountId,
      };
      persist(newState);
      return newState;
    });
    dbDeleteAccount(id).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const setActiveAccount = useCallback((id: string | null) => {
    setState(prev => {
      const newState = { ...prev, activeAccountId: id };
      persist(newState);
      return newState;
    });
  }, [persist]);

  const addTrades = useCallback((trades: Trade[]) => {
    setState(prev => {
      const newState = { ...prev, trades: [...prev.trades, ...trades] };
      persist(newState);
      return newState;
    });
    dbCreateTrades(trades).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setState(prev => {
      const newState = {
        ...prev,
        trades: prev.trades.map(t => t.id === id ? { ...t, ...updates } : t),
      };
      persist(newState);
      return newState;
    });
    dbUpdateTrade(id, updates).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const deleteTrade = useCallback((id: string) => {
    setState(prev => {
      const newState = { ...prev, trades: prev.trades.filter(t => t.id !== id) };
      persist(newState);
      return newState;
    });
    dbDeleteTrade(id).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const addStrategy = useCallback((strategy: Omit<Strategy, 'id'>) => {
    const newStrat = { ...strategy, id: uid() };
    setState(prev => {
      const newState = {
        ...prev,
        strategies: [...prev.strategies, newStrat],
      };
      persist(newState);
      return newState;
    });
    dbCreateStrategy(newStrat).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const updateStrategy = useCallback((id: string, updates: Partial<Strategy>) => {
    setState(prev => {
      const newState = {
        ...prev,
        strategies: prev.strategies.map(s => s.id === id ? { ...s, ...updates } : s),
      };
      persist(newState);
      return newState;
    });
    dbUpdateStrategy(id, updates).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const deleteStrategy = useCallback((id: string) => {
    setState(prev => {
      const newState = { ...prev, strategies: prev.strategies.filter(s => s.id !== id) };
      persist(newState);
      return newState;
    });
    dbDeleteStrategy(id).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const addTag = useCallback((tag: Omit<Tag, 'id'>) => {
    const newTag = { ...tag, id: uid() };
    setState(prev => {
      const newState = {
        ...prev,
        tags: [...prev.tags, newTag],
      };
      persist(newState);
      return newState;
    });
    dbCreateTag(newTag).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setState(prev => {
      const newState = {
        ...prev,
        tags: prev.tags.map(t => t.id === id ? { ...t, ...updates } : t),
      };
      persist(newState);
      return newState;
    });
    dbUpdateTag(id, updates).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const deleteTag = useCallback((id: string) => {
    setState(prev => {
      const newState = { ...prev, tags: prev.tags.filter(t => t.id !== id) };
      persist(newState);
      return newState;
    });
    dbDeleteTag(id).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const setDayNote = useCallback((date: string, note: string) => {
    setState(prev => {
      const existing = prev.dayNotes.findIndex(n => n.date === date);
      const dayNotes = [...prev.dayNotes];
      if (existing >= 0) {
        dayNotes[existing] = { date, note };
      } else {
        dayNotes.push({ date, note });
      }
      const newState = { ...prev, dayNotes };
      persist(newState);
      return newState;
    });
    dbSetDayNote(date, note).catch(err => console.error("DB Sync Error:", err));
  }, [persist]);

  const getFilteredTrades = useCallback(() => {
    if (!state.activeAccountId) return state.trades;
    return state.trades.filter(t => t.accountId === state.activeAccountId);
  }, [state.activeAccountId, state.trades]);

  const setTheme = useCallback((theme: string) => {
    setState(prev => {
      const newState = { ...prev, theme };
      persist(newState);
      return newState;
    });
  }, [persist]);

  const updateSettings = useCallback((updates: { symbolSettings?: Record<string, { multiplier: number }>; apiKeys?: Record<string, string> }) => {
    setState(prev => {
      const newState = { 
        ...prev, 
        symbolSettings: updates.symbolSettings ? { ...prev.symbolSettings, ...updates.symbolSettings } : prev.symbolSettings,
        apiKeys: updates.apiKeys ? { ...prev.apiKeys, ...updates.apiKeys } : prev.apiKeys
      };
      persist(newState);
      return newState;
    });
  }, [persist]);

  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const freshState = loadState();
    setState(freshState);
    dbResetAll().catch(err => console.error("Failed to reset database:", err));
  }, []);

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
          <p style={{ color: '#a1a1aa' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{
      state,
      addAccount, updateAccount, deleteAccount, setActiveAccount,
      addTrades, updateTrade, deleteTrade,
      addStrategy, updateStrategy, deleteStrategy,
      addTag, updateTag, deleteTag,
      setDayNote, getFilteredTrades, setTheme, updateSettings, resetData,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
