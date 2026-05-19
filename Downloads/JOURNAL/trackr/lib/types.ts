// ============================================================
// Trackr Clone — TypeScript Type Definitions
// Schema aligned with the PRD's PostgreSQL model
// ============================================================

export type AccountType = 'live' | 'demo' | 'prop_phase1' | 'prop_phase2' | 'prop_funded';
export type TradeDirection = 'long' | 'short';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  broker: string;
  balanceInitial: number;
  currency: string;
  createdAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Trade {
  id: string;
  accountId: string;
  ticketId: string;
  symbol: string;
  direction: TradeDirection;
  status: 'open' | 'closed' | 'pending';
  openTime: string;
  closeTime: string | null;
  openPrice: number;
  closePrice: number | null;
  volume: number;
  multiplier: number; // Contract size (e.g. 100000 for EURUSD, 1 for Crypto)
  profitGross: number;
  commission: number;
  swap: number;
  profitNet: number;
  strategyId: string | null;
  tagIds: string[];
  notes: string;
  imageUrl: string | null;
  rMultiple: number | null;
  sl: number | null;
  tp: number | null;
}

export interface DayNote {
  date: string; // YYYY-MM-DD
  note: string;
}

export interface AppState {
  accounts: Account[];
  trades: Trade[];
  strategies: Strategy[];
  tags: Tag[];
  dayNotes: DayNote[];
  activeAccountId: string | null;
  theme: string;
  symbolSettings: Record<string, { multiplier: number }>;
  apiKeys: { twelvedata?: string; twelveData?: string; finnhub?: string; polygon?: string };
}

// KPI Metrics computed from trades
export interface KPIMetrics {
  totalTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  avgRMultiple: number;
  totalPnL: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalWins: number;
  totalLosses: number;
}

// For equity curve chart
export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

// For distribution charts
export interface DistributionItem {
  label: string;
  value: number;
  count: number;
  winRate: number;
}
