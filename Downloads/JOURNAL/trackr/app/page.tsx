'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { calculateKPIs, calculateEquityCurve, getDistributionByField } from '@/lib/calculations';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useLivePrices } from '@/lib/useLivePrices';
import { Activity } from 'lucide-react';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
}

function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

function formatNumber(val: number): string {
  return val.toFixed(2);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="value" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name !== 'Trades' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { getFilteredTrades, state } = useStore();
  const trades = getFilteredTrades();

  const kpis = useMemo(() => calculateKPIs(trades), [trades]);

  const activeAccount = state.accounts.find(a => a.id === state.activeAccountId);
  const initialBalance = activeAccount?.balanceInitial || 10000;

  const equityCurve = useMemo(() => calculateEquityCurve(trades, initialBalance), [trades, initialBalance]);
  const directionDist = useMemo(() => getDistributionByField(trades, 'direction'), [trades]);

  // Derived values for the donuts
  const longCount = directionDist.find(d => d.label === 'long')?.count || 0;
  const shortCount = directionDist.find(d => d.label === 'short')?.count || 0;
  const totalDirectionCount = longCount + shortCount;

  // Active trades logic
  const openTrades = useMemo(() => trades.filter(t => t.status === 'open'), [trades]);
  const activeSymbols = useMemo(() => [...new Set(openTrades.map(t => t.symbol))], [openTrades]);
  const livePrices = useLivePrices(activeSymbols, state.apiKeys);

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingLeft: 40, paddingRight: 40, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Active Trades (Real-Time) */}
      {openTrades.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            <Activity size={18} className="text-accent" /> Positions en cours ({openTrades.length})
          </h3>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {openTrades.map(trade => {
              const currentPrice = livePrices[trade.symbol] || trade.openPrice;
              const diff = trade.direction === 'long' ? (currentPrice - trade.openPrice) : (trade.openPrice - currentPrice);
              const multiplier = trade.multiplier || state.symbolSettings?.[trade.symbol]?.multiplier || 100000;
              const pnl = diff * trade.volume * multiplier;
              const isProfit = pnl >= 0;

              return (
                <div key={trade.id} className="card" style={{ minWidth: 240, padding: 16, borderLeft: `3px solid ${isProfit ? 'var(--win)' : 'var(--loss)'}` }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{trade.symbol}</span>
                    <span className={`badge badge-${trade.direction}`}>{trade.direction.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trade.volume} Lots</p>
                      <p className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        In: {trade.openPrice} <br/>
                        Now: <span style={{ color: currentPrice !== trade.openPrice ? 'var(--text-primary)' : 'var(--text-muted)' }}>{currentPrice.toFixed(5)}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>P&L (Live)</p>
                      <p className={`mono ${isProfit ? 'text-win' : 'text-loss'}`} style={{ fontSize: 18, fontWeight: 700 }}>
                        {formatCurrency(pnl)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
        {/* Win Rate */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>DAY WIN RATE</span>
            <span style={{ background: 'var(--win-bg-strong)', color: 'var(--win)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>+5.2 pts</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--win)', fontFamily: 'Inter, sans-serif' }}>
            {formatPercent(kpis.winRate)}
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>SHARPE RATIO</span>
            <span style={{ background: 'var(--win-bg-strong)', color: 'var(--win)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>annualisé</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--win)', fontFamily: 'Inter, sans-serif' }}>
            {formatNumber(kpis.sharpeRatio)}
          </div>
        </div>

        {/* Max Drawdown */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MAX DRAWDOWN</span>
            <span style={{ background: 'var(--win-bg-strong)', color: 'var(--win)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>du peak</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            {formatCurrency(-kpis.maxDrawdown)}
          </div>
        </div>

        {/* Streak Max */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>STREAK MAX</span>
            <span style={{ background: 'var(--win-bg-strong)', color: 'var(--win)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>consécutifs</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            {kpis.maxWinStreak}
          </div>
        </div>
      </div>

      {/* Equity Curve */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 24px 12px', marginBottom: 20 }}>
        <div className="flex justify-between items-start" style={{ marginBottom: 32 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Courbe d&apos;equity</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>P&amp;L cumulé · {kpis.totalTrades} trades</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--win)', fontFamily: 'Inter, sans-serif' }}>
              +{formatCurrency(kpis.totalPnL)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cumul total</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={equityCurve} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#18251d" vertical={false} />
            <XAxis hide dataKey="date" />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="var(--accent)"
              strokeWidth={3}
              fill="url(#equityGradient)"
              name="Equity"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Donuts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        
        {/* Win / Loss Donut */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Win / Loss</h3>
          <div className="flex items-center gap-12">
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Gains', value: kpis.totalWins },
                      { name: 'Pertes', value: kpis.totalLosses }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={0}
                  >
                    <Cell fill="#ff4757" /> {/* Red for losses, rendered first so it's on bottom if we wanted, but Recharts draws sequentially. Let's make Wins green, Losses red */}
                    <Cell fill="var(--accent)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{formatPercent(kpis.winRate)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>WIN RATE</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Gains</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{kpis.totalWins}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4757' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Pertes</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{kpis.totalLosses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Long / Short Donut */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Long / Short</h3>
          <div className="flex items-center gap-12">
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Short', value: shortCount },
                      { name: 'Long', value: longCount }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={0}
                  >
                    <Cell fill="#ff4757" /> 
                    <Cell fill="var(--accent)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{totalDirectionCount}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TRADES</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Long</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{longCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4757' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Short</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{shortCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

