// ============================================================
// Trackr Clone — KPI Calculation Engine
// Implements: Win Rate, Sharpe Ratio, Max Drawdown,
//             Profit Factor, R-Multiple, Streak, Equity Curve
// ============================================================

import { Trade, KPIMetrics, EquityPoint, DistributionItem } from './types';

export function calculateKPIs(trades: Trade[]): KPIMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0, winRate: 0, sharpeRatio: 0,
      maxDrawdown: 0, maxDrawdownPercent: 0, profitFactor: 0,
      avgRMultiple: 0, totalPnL: 0, maxWinStreak: 0,
      maxLossStreak: 0, avgWin: 0, avgLoss: 0,
      bestTrade: 0, worstTrade: 0, totalWins: 0, totalLosses: 0,
    };
  }

  const closedTrades = trades.filter(t => t.status === 'closed' && t.closeTime);
  const sorted = [...closedTrades].sort((a, b) => new Date(a.closeTime!).getTime() - new Date(b.closeTime!).getTime());
  const wins = sorted.filter(t => t.profitNet > 0);
  const losses = sorted.filter(t => t.profitNet < 0);

  const totalPnL = sorted.reduce((s, t) => s + t.profitNet, 0);
  const winRate = (wins.length / sorted.length) * 100;

  const totalGross = wins.reduce((s, t) => s + t.profitNet, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.profitNet, 0));
  const profitFactor = totalLoss > 0 ? totalGross / totalLoss : totalGross > 0 ? Infinity : 0;

  const avgWin = wins.length > 0 ? totalGross / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

  const bestTrade = sorted.length > 0 ? Math.max(...sorted.map(t => t.profitNet)) : 0;
  const worstTrade = sorted.length > 0 ? Math.min(...sorted.map(t => t.profitNet)) : 0;

  // Sharpe Ratio (annualized, assuming ~252 trading days)
  const returns = sorted.map(t => t.profitNet);
  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  // Max Drawdown
  let peak = 0;
  let equity = 0;
  let maxDD = 0;
  let maxDDPercent = 0;
  for (const trade of sorted) {
    equity += trade.profitNet;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPercent = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  // Streaks
  let currentWinStreak = 0, currentLossStreak = 0;
  let maxWinStreak = 0, maxLossStreak = 0;
  for (const trade of sorted) {
    if (trade.profitNet > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (trade.profitNet < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  }

  // Average R-Multiple
  const rTrades = sorted.filter(t => t.rMultiple !== null);
  const avgRMultiple = rTrades.length > 0
    ? rTrades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / rTrades.length
    : 0;

  return {
    totalTrades: sorted.length,
    winRate,
    sharpeRatio,
    maxDrawdown: maxDD,
    maxDrawdownPercent: maxDDPercent,
    profitFactor,
    avgRMultiple,
    totalPnL,
    maxWinStreak,
    maxLossStreak,
    avgWin,
    avgLoss,
    bestTrade,
    worstTrade,
    totalWins: wins.length,
    totalLosses: losses.length,
  };
}

export function calculateEquityCurve(trades: Trade[], initialBalance: number): EquityPoint[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.closeTime);
  const sorted = [...closedTrades].sort((a, b) => new Date(a.closeTime!).getTime() - new Date(b.closeTime!).getTime());
  const points: EquityPoint[] = [];
  let equity = initialBalance;
  let peak = initialBalance;

  // Starting point
  if (sorted.length > 0) {
    points.push({
      date: new Date(new Date(sorted[0].closeTime!).getTime() - 86400000).toISOString().split('T')[0],
      equity: initialBalance,
      drawdown: 0,
    });
  }

  // Group trades by date
  const byDate = new Map<string, number>();
  for (const trade of sorted) {
    const date = new Date(trade.closeTime!).toISOString().split('T')[0];
    byDate.set(date, (byDate.get(date) || 0) + trade.profitNet);
  }

  for (const [date, pnl] of byDate) {
    equity += pnl;
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    points.push({ date, equity, drawdown });
  }

  return points;
}

export function getDistributionByField(
  trades: Trade[],
  field: 'symbol' | 'direction' | 'dayOfWeek' | 'hour' | 'strategyId',
  strategies?: { id: string; name: string }[]
): DistributionItem[] {
  const groups = new Map<string, Trade[]>();

  const closedTrades = trades.filter(t => t.status === 'closed');

  for (const trade of closedTrades) {
    let key: string;
    if (field === 'dayOfWeek') {
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      key = days[new Date(trade.openTime).getDay()];
    } else if (field === 'hour') {
      key = `${new Date(trade.openTime).getHours()}h`;
    } else if (field === 'strategyId') {
      if (!trade.strategyId) {
        key = 'Sans stratégie';
      } else {
        const strat = strategies?.find(s => s.id === trade.strategyId);
        key = strat?.name || trade.strategyId;
      }
    } else {
      key = trade[field];
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(trade);
  }

  const items: DistributionItem[] = [];
  for (const [label, groupTrades] of groups) {
    const pnl = groupTrades.reduce((s, t) => s + t.profitNet, 0);
    const wins = groupTrades.filter(t => t.profitNet > 0).length;
    items.push({
      label,
      value: pnl,
      count: groupTrades.length,
      winRate: (wins / groupTrades.length) * 100,
    });
  }

  return items.sort((a, b) => b.value - a.value);
}

export function getDailyPnL(trades: Trade[]): Map<string, number> {
  const daily = new Map<string, number>();
  const closedTrades = trades.filter(t => t.status === 'closed' && t.closeTime);
  for (const trade of closedTrades) {
    const date = new Date(trade.closeTime!).toISOString().split('T')[0];
    daily.set(date, (daily.get(date) || 0) + trade.profitNet);
  }
  return daily;
}
