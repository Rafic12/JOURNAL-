'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getDailyPnL } from '@/lib/calculations';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown } from 'lucide-react';

function formatCurrency(val: number, decimals = 0): string {
  return `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(decimals)}`;
}

export default function CalendrierPage() {
  const { getFilteredTrades, state, setDayNote } = useStore();
  const trades = getFilteredTrades();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<{
    date: string; pnl: number;
    trades: Array<{ symbol: string; direction: string; profitNet: number; volume: number; strategyId: string | null }>;
  } | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const dailyPnL = useMemo(() => getDailyPnL(trades), [trades]);

  const monthData = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const days: Array<{ day: number; date: string; pnl: number; tradeCount: number; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < startOffset; i++) days.push({ day: 0, date: '', pnl: 0, tradeCount: 0, isCurrentMonth: false });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const pnl = dailyPnL.get(dateStr) || 0;
      const tradeCount = trades.filter(t => t.status === 'closed' && t.closeTime && new Date(t.closeTime).toISOString().split('T')[0] === dateStr).length;
      days.push({ day: d, date: dateStr, pnl, tradeCount, isCurrentMonth: true });
    }
    return days;
  }, [currentMonth, dailyPnL, trades]);

  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const dayHeaders = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const monthTotal = monthData.reduce((s, d) => s + d.pnl, 0);
  const winDays = monthData.filter(d => d.isCurrentMonth && d.pnl > 0).length;
  const lossDays = monthData.filter(d => d.isCurrentMonth && d.pnl < 0).length;
  const tradingDays = monthData.filter(d => d.isCurrentMonth && d.tradeCount > 0).length;
  const maxAbsPnl = useMemo(() => {
    const v = monthData.filter(d => d.pnl !== 0).map(d => Math.abs(d.pnl));
    return v.length > 0 ? Math.max(...v) : 1;
  }, [monthData]);

  const getStrategyName = (id: string | null) => state.strategies.find(s => s.id === id)?.name || '—';
  const getDayNoteText = (date: string) => state.dayNotes.find(n => n.date === date)?.note || '';

  const handleDayClick = (day: typeof monthData[0]) => {
    if (!day.isCurrentMonth || day.tradeCount === 0) return;
    const dayTrades = trades.filter(t => t.status === 'closed' && t.closeTime && new Date(t.closeTime).toISOString().split('T')[0] === day.date);
    setSelectedDay({
      date: day.date, pnl: day.pnl,
      trades: dayTrades.map(t => ({ symbol: t.symbol, direction: t.direction, profitNet: t.profitNet, volume: t.volume, strategyId: t.strategyId })),
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Calendrier</h1>
        <p className="page-subtitle">Visualisez vos performances jour par jour</p>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <p className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>P&L du mois</p>
          <p className={`mono ${monthTotal >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 22, fontWeight: 700 }}>
            {formatCurrency(monthTotal)}
          </p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>Jours de trading</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{tradingDays}</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>Jours gagnants</p>
          <p className="mono text-win" style={{ fontSize: 22, fontWeight: 700 }}>{winDays}</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>Jours perdants</p>
          <p className="mono text-loss" style={{ fontSize: 22, fontWeight: 700 }}>{lossDays}</p>
        </div>
      </div>

      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={() => setCurrentMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })}>
          <ChevronLeft size={16} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{monthNames[currentMonth.month]} {currentMonth.year}</h2>
        <button className="calendar-nav-btn" onClick={() => setCurrentMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-grid">
        {dayHeaders.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {monthData.map((day, i) => {
          if (!day.isCurrentMonth) return <div key={`e-${i}`} className="calendar-day empty" />;
          const isToday = day.date === new Date().toISOString().split('T')[0];
          const intensity = day.pnl !== 0 ? Math.min(Math.abs(day.pnl) / maxAbsPnl, 1) : 0;
          return (
            <div key={day.date} className={`calendar-day ${day.pnl > 0 ? 'win' : day.pnl < 0 ? 'loss' : ''}`}
              onClick={() => handleDayClick(day)}
              style={{
                ...(day.pnl > 0 ? { background: `rgba(0,230,118,${0.05 + intensity * 0.2})`, borderColor: `rgba(0,230,118,${0.1 + intensity * 0.3})` }
                  : day.pnl < 0 ? { background: `rgba(255,71,87,${0.05 + intensity * 0.2})`, borderColor: `rgba(255,71,87,${0.1 + intensity * 0.3})` } : {}),
                ...(isToday ? { boxShadow: '0 0 0 2px var(--accent)' } : {}),
              }}>
              <span className="calendar-day-number" style={isToday ? { color: 'var(--accent)', fontWeight: 700 } : {}}>{day.day}</span>
              {day.tradeCount > 0 && (
                <>
                  <span className={`calendar-day-pnl ${day.pnl >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(day.pnl)}</span>
                  <span className="calendar-day-trades">{day.tradeCount} trade{day.tradeCount > 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{selectedDay.trades.length} trade{selectedDay.trades.length > 1 ? 's' : ''}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDay(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="flex gap-4" style={{ marginBottom: 20 }}>
                <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
                  <p className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>P&L du jour</p>
                  <p className={`mono ${selectedDay.pnl >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 24, fontWeight: 700 }}>
                    {formatCurrency(selectedDay.pnl, 2)}
                  </p>
                </div>
                <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
                  <p className="card-title" style={{ fontSize: 11, marginBottom: 4 }}>Win Rate</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
                    {((selectedDay.trades.filter(t => t.profitNet > 0).length / selectedDay.trades.length) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Symbole</th><th>Direction</th><th>Volume</th><th>Stratégie</th><th>P&L</th></tr></thead>
                  <tbody>
                    {selectedDay.trades.map((t, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ fontWeight: 600 }}>{t.symbol}</td>
                        <td><span className={`badge badge-${t.direction}`}>{t.direction === 'long' ? <><TrendingUp size={12} /> LONG</> : <><TrendingDown size={12} /> SHORT</>}</span></td>
                        <td className="mono">{t.volume}</td>
                        <td style={{ fontSize: 12 }}>{getStrategyName(t.strategyId)}</td>
                        <td className={`mono ${t.profitNet >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontWeight: 700 }}>
                          {formatCurrency(t.profitNet, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16 }}>
                <label className="label">Notes de session</label>
                {editingNote === selectedDay.date ? (
                  <div className="flex gap-2">
                    <textarea className="input" style={{ minHeight: 80, resize: 'vertical' }} value={noteText}
                      onChange={e => setNoteText(e.target.value)} placeholder="Observations, état émotionnel..." autoFocus />
                    <div className="flex flex-col gap-2">
                      <button className="btn btn-accent btn-sm" onClick={() => { setDayNote(selectedDay.date, noteText); setEditingNote(null); }}>OK</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingNote(null)}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: getDayNoteText(selectedDay.date) ? 'var(--text-secondary)' : 'var(--text-muted)', cursor: 'pointer', minHeight: 60 }}
                    onClick={() => { setEditingNote(selectedDay.date); setNoteText(getDayNoteText(selectedDay.date)); }}>
                    {getDayNoteText(selectedDay.date) || 'Cliquez pour ajouter une note de session...'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
