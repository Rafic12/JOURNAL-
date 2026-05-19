// ============================================================
// Trackr Clone — Demo Data Generator
// Generates realistic trading data for demonstration
// ============================================================

import { Account, Trade, Strategy, Tag } from './types';

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'US30', 'NAS100', 'XAUUSD', 'GBPJPY', 'AUDUSD'];

export const DEMO_STRATEGIES: Strategy[] = [
  { id: 'strat-1', name: 'SMC Silver Bullet', description: 'ICT Silver Bullet setup during killzones' },
  { id: 'strat-2', name: 'ICT Judas Swing', description: 'Judas swing reversal at session open' },
  { id: 'strat-3', name: 'London Breakout', description: 'Breakout of Asian range during London open' },
  { id: 'strat-4', name: 'Order Block Retest', description: 'Entry on order block retest with FVG confirmation' },
  { id: 'strat-5', name: 'NY AM Setup', description: 'New York AM session ICT setup' },
];

export const DEMO_TAGS: Tag[] = [
  { id: 'tag-1', name: 'A+ Setup', color: '#22c55e' },
  { id: 'tag-2', name: 'News Event', color: '#f59e0b' },
  { id: 'tag-3', name: 'FOMO', color: '#ef4444' },
  { id: 'tag-4', name: 'London Open', color: '#3b82f6' },
  { id: 'tag-5', name: 'NY Session', color: '#8b5cf6' },
  { id: 'tag-6', name: 'Tilt', color: '#ef4444' },
  { id: 'tag-7', name: 'SMC', color: '#06b6d4' },
  { id: 'tag-8', name: 'Sniper Entry', color: '#10b981' },
];

export const DEMO_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Live Principal', type: 'live', broker: 'icmarkets', balanceInitial: 10000, currency: 'USD', createdAt: new Date().toISOString() },
  { id: 'acc-2', name: 'FTMO Phase 1', type: 'prop_phase1', broker: 'ftmo', balanceInitial: 100000, currency: 'USD', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'acc-3', name: 'Démo Practice', type: 'demo', broker: 'other', balanceInitial: 50000, currency: 'USD', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];

export function generateDemoTrades(): Trade[] {
  const trades: Trade[] = [];
  const startDate = new Date('2025-06-01');
  const endDate = new Date('2026-05-18');
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // 0-4 trades per day
    const numTrades = Math.floor(Math.random() * 4);
    // ~20% chance of no trading
    if (Math.random() < 0.2) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    for (let i = 0; i < numTrades; i++) {
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const direction = Math.random() > 0.45 ? 'long' : 'short' as const;
      const strategy = DEMO_STRATEGIES[Math.floor(Math.random() * DEMO_STRATEGIES.length)];

      // Win rate ~65% (realistic for a solid journal user)
      const isWin = Math.random() < 0.65;
      const volume = parseFloat((0.01 + Math.random() * 0.49).toFixed(2));

      // P&L based on symbol and direction
      let basePnL: number;
      if (symbol === 'US30' || symbol === 'NAS100') {
        basePnL = (50 + Math.random() * 300) * volume * 10;
      } else if (symbol === 'XAUUSD') {
        basePnL = (20 + Math.random() * 200) * volume * 10;
      } else {
        basePnL = (10 + Math.random() * 100) * volume * 10;
      }

      const profitGross = isWin ? basePnL : -basePnL * (0.5 + Math.random() * 0.7);
      const commission = -(volume * 3.5);
      const swap = Math.random() < 0.3 ? -(Math.random() * 2) : 0;
      const profitNet = parseFloat((profitGross + commission + swap).toFixed(2));

      // Random hours during trading sessions
      const hours = [8, 9, 10, 11, 14, 15, 16, 17];
      const openHour = hours[Math.floor(Math.random() * hours.length)];
      const openMinute = Math.floor(Math.random() * 60);
      const duration = 5 + Math.floor(Math.random() * 240); // 5min to 4h

      const openTime = new Date(current);
      openTime.setHours(openHour, openMinute, 0, 0);
      const closeTime = new Date(openTime.getTime() + duration * 60000);

      const openPrice = symbol.includes('JPY')
        ? 140 + Math.random() * 20
        : symbol === 'XAUUSD'
          ? 1900 + Math.random() * 500
          : symbol === 'US30'
            ? 38000 + Math.random() * 4000
            : symbol === 'NAS100'
              ? 17000 + Math.random() * 3000
              : 1 + Math.random() * 0.5;

      const priceDiff = isWin
        ? (Math.random() * 0.005 * openPrice)
        : -(Math.random() * 0.004 * openPrice);
      const closePrice = openPrice + (direction === 'long' ? priceDiff : -priceDiff);

      // Tags (1-3 random)
      const numTags = 1 + Math.floor(Math.random() * 2);
      const tagIds: string[] = [];
      const shuffledTags = [...DEMO_TAGS].sort(() => Math.random() - 0.5);
      for (let j = 0; j < numTags; j++) {
        tagIds.push(shuffledTags[j].id);
      }

      const rMultiple = parseFloat((profitNet / (Math.abs(profitNet) * (isWin ? 0.5 : 1.5))).toFixed(2));

      trades.push({
        id: uid(),
        accountId: Math.random() < 0.7 ? 'acc-1' : Math.random() < 0.5 ? 'acc-2' : 'acc-3',
        ticketId: `${Math.floor(10000000 + Math.random() * 90000000)}`,
        symbol,
        direction,
        status: 'closed',
        openTime: openTime.toISOString(),
        closeTime: closeTime.toISOString(),
        openPrice: parseFloat(openPrice.toFixed(symbol.includes('JPY') ? 3 : symbol === 'XAUUSD' ? 2 : symbol.includes('US') || symbol.includes('NAS') ? 1 : 5)),
        closePrice: parseFloat(closePrice.toFixed(symbol.includes('JPY') ? 3 : symbol === 'XAUUSD' ? 2 : symbol.includes('US') || symbol.includes('NAS') ? 1 : 5)),
        volume,
        multiplier: symbol === 'US30' || symbol === 'NAS100' ? 10 : symbol === 'XAUUSD' ? 100 : 100000,
        profitGross: parseFloat(profitGross.toFixed(2)),
        commission: parseFloat(commission.toFixed(2)),
        swap: parseFloat(swap.toFixed(2)),
        profitNet,
        strategyId: strategy.id,
        tagIds,
        notes: '',
        imageUrl: null,
        rMultiple,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return trades;
}
