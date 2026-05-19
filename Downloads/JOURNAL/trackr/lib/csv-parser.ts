// ============================================================
// Trackr Clone — CSV Parser (Multi-Broker)
// Supports: MT4, MT5, Tradovate, NinjaTrader, cTrader, Generic
// ============================================================

import { Trade } from './types';

type BrokerType = 'mt4' | 'mt5' | 'tradovate' | 'ninjatrader' | 'ctrader' | 'generic';

interface ColumnMapping {
  ticket: number;
  symbol: number;
  direction: number;
  openTime: number;
  closeTime: number;
  openPrice: number;
  closePrice: number;
  volume: number;
  profit: number;
  commission: number;
  swap: number;
}

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

function detectBroker(headers: string[]): { broker: BrokerType; mapping: ColumnMapping } {
  const headerStr = headers.join(',').toLowerCase();

  // MT5 detection
  if (headerStr.includes('ticket') && headerStr.includes('open time') && headerStr.includes('type')) {
    const h = headers.map(h => h.trim().toLowerCase());
    return {
      broker: 'mt5',
      mapping: {
        ticket: h.indexOf('ticket'),
        symbol: h.indexOf('symbol'),
        direction: h.indexOf('type'),
        openTime: h.indexOf('open time'),
        closeTime: h.indexOf('close time'),
        openPrice: h.indexOf('open price'),
        closePrice: h.indexOf('close price'),
        volume: h.indexOf('volume'),
        profit: h.indexOf('profit'),
        commission: h.indexOf('commission'),
        swap: h.indexOf('swap'),
      }
    };
  }

  // MT4 detection
  if (headerStr.includes('ticket') && headerStr.includes('open date')) {
    const h = headers.map(h => h.trim().toLowerCase());
    return {
      broker: 'mt4',
      mapping: {
        ticket: h.indexOf('ticket'),
        symbol: h.indexOf('symbol'),
        direction: h.indexOf('type'),
        openTime: h.indexOf('open date'),
        closeTime: h.indexOf('close date'),
        openPrice: h.indexOf('open price'),
        closePrice: h.indexOf('close price'),
        volume: h.indexOf('volume'),
        profit: h.indexOf('profit'),
        commission: h.indexOf('commission'),
        swap: h.indexOf('swap'),
      }
    };
  }

  // Tradovate
  if (headerStr.includes('ordid') || headerStr.includes('b/s')) {
    const h = headers.map(h => h.trim().toLowerCase());
    return {
      broker: 'tradovate',
      mapping: {
        ticket: Math.max(0, h.indexOf('ordid')),
        symbol: Math.max(0, h.indexOf('contract')),
        direction: Math.max(0, h.indexOf('b/s')),
        openTime: Math.max(0, h.indexOf('fill time')),
        closeTime: Math.max(0, h.indexOf('fill time')),
        openPrice: Math.max(0, h.indexOf('fill price')),
        closePrice: Math.max(0, h.indexOf('fill price')),
        volume: Math.max(0, h.indexOf('qty')),
        profit: Math.max(0, h.indexOf('p&l')),
        commission: Math.max(0, h.indexOf('commission')),
        swap: -1,
      }
    };
  }

  // Generic / fallback
  const h = headers.map(h => h.trim().toLowerCase());
  return {
    broker: 'generic',
    mapping: {
      ticket: findCol(h, ['ticket', 'id', 'order', 'trade']),
      symbol: findCol(h, ['symbol', 'instrument', 'pair', 'market']),
      direction: findCol(h, ['direction', 'type', 'side', 'b/s', 'action']),
      openTime: findCol(h, ['open time', 'open date', 'entry time', 'open', 'date']),
      closeTime: findCol(h, ['close time', 'close date', 'exit time', 'close']),
      openPrice: findCol(h, ['open price', 'entry price', 'entry', 'open']),
      closePrice: findCol(h, ['close price', 'exit price', 'exit', 'close']),
      volume: findCol(h, ['volume', 'lots', 'size', 'qty', 'quantity']),
      profit: findCol(h, ['profit', 'p&l', 'pnl', 'net p/l', 'net profit']),
      commission: findCol(h, ['commission', 'comm', 'fee']),
      swap: findCol(h, ['swap', 'rollover']),
    }
  };
}

function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDirection(val: string): 'long' | 'short' {
  const v = val.toLowerCase().trim();
  if (v === 'buy' || v === 'long' || v === 'b') return 'long';
  return 'short';
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(content: string, accountId: string): { trades: Trade[]; broker: string; errors: string[] } {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const errors: string[] = [];

  if (lines.length < 2) {
    return { trades: [], broker: 'unknown', errors: ['Le fichier est vide ou ne contient pas assez de lignes.'] };
  }

  const headers = parseCSVLine(lines[0]);
  const { broker, mapping } = detectBroker(headers);
  const trades: Trade[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;

      const direction = mapping.direction >= 0 ? cols[mapping.direction] : '';
      if (!direction) continue;

      // Skip non-trade rows (deposits, balance, etc.)
      const dirLower = direction.toLowerCase();
      if (dirLower === 'balance' || dirLower === 'deposit' || dirLower === 'withdrawal') continue;

      const profitNet = mapping.profit >= 0 ? parseFloat(cols[mapping.profit]) || 0 : 0;
      const commission = mapping.commission >= 0 ? parseFloat(cols[mapping.commission]) || 0 : 0;
      const swap = mapping.swap >= 0 ? parseFloat(cols[mapping.swap]) || 0 : 0;

      const symbol = mapping.symbol >= 0 ? cols[mapping.symbol] || '' : '';

      trades.push({
        id: uid(),
        accountId,
        ticketId: mapping.ticket >= 0 ? cols[mapping.ticket] || uid() : uid(),
        symbol,
        direction: parseDirection(dirLower),
        status: 'closed',
        openTime: mapping.openTime >= 0 ? new Date(cols[mapping.openTime]).toISOString() : new Date().toISOString(),
        closeTime: mapping.closeTime >= 0 ? new Date(cols[mapping.closeTime]).toISOString() : new Date().toISOString(),
        openPrice: mapping.openPrice >= 0 ? parseFloat(cols[mapping.openPrice]) || 0 : 0,
        closePrice: mapping.closePrice >= 0 ? parseFloat(cols[mapping.closePrice]) || 0 : 0,
        volume: mapping.volume >= 0 ? parseFloat(cols[mapping.volume]) || 0.01 : 0.01,
        multiplier: symbol === 'US30' || symbol === 'NAS100' ? 10 : symbol === 'XAUUSD' ? 100 : 100000,
        profitGross: profitNet - commission - swap,
        commission,
        swap,
        profitNet,
        strategyId: null,
        tagIds: [],
        notes: '',
        imageUrl: null,
        rMultiple: null,
        sl: null,
        tp: null,
      });
    } catch (err) {
      errors.push(`Ligne ${i + 1}: Erreur de parsing — ${(err as Error).message}`);
    }
  }

  return { trades, broker, errors };
}
