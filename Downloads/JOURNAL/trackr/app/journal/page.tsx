'use client';

import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Trade } from '@/lib/types';
import { Search, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, Camera, X, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';
import { dbSearchSymbols } from '@/lib/actions';

function formatCurrency(val: number): string {
  return `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
}

type SortKey = 'closeTime' | 'symbol' | 'direction' | 'profitNet' | 'volume' | 'rMultiple';

export default function JournalPage() {
  const { getFilteredTrades, state, deleteTrade, updateTrade, addTrades } = useStore();
  const trades = getFilteredTrades();

  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'pending'>('closed');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('closeTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStrategy, setFilterStrategy] = useState<string>('');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTradeId, setUploadingTradeId] = useState<string | null>(null);

  // Asset Lookup Autocomplete states
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);

  const cleanSymbol = (sym: string): string => {
    const s = sym.toUpperCase().replace('/', '');
    if (s === 'EURUSD=X') return 'EURUSD';
    if (s === 'GBPUSD=X') return 'GBPUSD';
    if (s === 'USDJPY=X') return 'USDJPY';
    if (s === 'AUDUSD=X') return 'AUDUSD';
    if (s === 'USDCAD=X') return 'USDCAD';
    if (s === 'USDCHF=X') return 'USDCHF';
    if (s === 'GC=F') return 'XAUUSD';
    if (s === '^DJI') return 'US30';
    if (s === '^IXIC') return 'NAS100';
    if (s === '^GSPC') return 'SPX500';
    if (s === 'BTC-USD') return 'BTCUSD';
    if (s === 'ETH-USD') return 'ETHUSD';
    if (s === 'SOL-USD') return 'SOLUSD';
    return s;
  };

  const handleLookupChange = async (val: string, type: 'new' | 'edit') => {
    setLookupQuery(val);
    if (type === 'new') {
      setNewTrade((prev: any) => ({ ...prev, symbol: val.toUpperCase() }));
    } else {
      setEditingTradeData((prev: any) => ({ ...prev, symbol: val.toUpperCase() }));
    }

    if (val.trim().length < 1) {
      setLookupResults([]);
      setShowLookupDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowLookupDropdown(true);
    try {
      const results = await dbSearchSymbols(val);
      setLookupResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  // Add Trade Modal State
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({
    symbol: 'EURUSD',
    direction: 'long' as 'long' | 'short',
    status: 'closed' as 'open' | 'closed' | 'pending',
    openTime: new Date().toISOString().slice(0, 16),
    closeTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    openPrice: 0,
    closePrice: 0,
    volume: 1,
    multiplier: 100000,
    profitNet: 0,
    rMultiple: 0,
    strategyId: '' as string | null,
    tagIds: [] as string[],
    sl: 0,
    tp: 0,
  });

  // Edit Trade Modal State
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editingTradeData, setEditingTradeData] = useState<any>(null);

  const startEditing = (trade: Trade) => {
    setEditingTrade(trade);
    setEditingTradeData({
      symbol: trade.symbol,
      direction: trade.direction,
      status: trade.status,
      openTime: new Date(trade.openTime).toISOString().slice(0, 16),
      closeTime: trade.closeTime ? new Date(trade.closeTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      openPrice: trade.openPrice,
      closePrice: trade.closePrice || 0,
      volume: trade.volume,
      multiplier: trade.multiplier,
      profitNet: trade.profitNet,
      rMultiple: trade.rMultiple || 0,
      strategyId: trade.strategyId || '',
      tagIds: trade.tagIds || [],
      sl: trade.sl || 0,
      tp: trade.tp || 0,
    });
  };

  const symbols = useMemo(() => [...new Set(trades.map(t => t.symbol))].sort(), [trades]);

  const filtered = useMemo(() => {
    let result = [...trades];

    // Filter by active tab (open / closed / pending)
    result = result.filter(t => t.status === activeTab);

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        t.symbol.toLowerCase().includes(s) ||
        t.ticketId.includes(s) ||
        t.notes.toLowerCase().includes(s)
      );
    }

    if (filterStrategy) result = result.filter(t => t.strategyId === filterStrategy);
    if (filterSymbol) result = result.filter(t => t.symbol === filterSymbol);
    if (filterDirection) result = result.filter(t => t.direction === filterDirection);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'closeTime') {
        const t1 = a.closeTime ? new Date(a.closeTime).getTime() : Date.now();
        const t2 = b.closeTime ? new Date(b.closeTime).getTime() : Date.now();
        cmp = t1 - t2;
      }
      else if (sortKey === 'profitNet') cmp = a.profitNet - b.profitNet;
      else if (sortKey === 'volume') cmp = a.volume - b.volume;
      else if (sortKey === 'rMultiple') cmp = (a.rMultiple || 0) - (b.rMultiple || 0);
      else cmp = (a[sortKey] as string).localeCompare(b[sortKey] as string);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [trades, activeTab, search, sortKey, sortDir, filterStrategy, filterSymbol, filterDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return null;
    return sortDir === 'desc'
      ? <ChevronDown size={14} style={{ opacity: 0.7 }} />
      : <ChevronUp size={14} style={{ opacity: 0.7 }} />;
  };

  const getTagsForTrade = (trade: Trade) =>
    state.tags.filter(t => trade.tagIds.includes(t.id));

  const getStrategyName = (id: string | null) =>
    state.strategies.find(s => s.id === id)?.name || '—';

  const handleSaveNote = (tradeId: string) => {
    updateTrade(tradeId, { notes: noteText });
    setEditingNote(null);
    setNoteText('');
  };

  // Screenshot handling
  const handleScreenshotUpload = (tradeId: string) => {
    setUploadingTradeId(tradeId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTradeId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (PNG, JPG, etc.)');
      return;
    }

    // Max 2MB to avoid localStorage bloat
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateTrade(uploadingTradeId, { imageUrl: dataUrl });
      setUploadingTradeId(null);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handleRemoveScreenshot = (tradeId: string) => {
    updateTrade(tradeId, { imageUrl: null });
  };

  const openCount = trades.filter(t => t.status === 'open').length;
  const closedCount = trades.filter(t => t.status === 'closed').length;
  const pendingCount = trades.filter(t => t.status === 'pending').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Journal</h1>
            <p className="page-subtitle">
              {filtered.length} trades
              {filtered.length !== trades.length && ` (${trades.length} au total)`}
            </p>
          </div>
          <button 
            className="btn btn-accent" 
            onClick={() => {
              setNewTrade({
                symbol: 'EURUSD',
                direction: 'long',
                status: activeTab,
                openTime: new Date().toISOString().slice(0, 16),
                closeTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
                openPrice: 0,
                closePrice: 0,
                volume: 1,
                multiplier: 100000,
                profitNet: 0,
                rMultiple: 0,
                strategyId: '',
                tagIds: [],
                sl: 0,
                tp: 0,
              });
              setShowAddTrade(true);
            }}
          >
            <Plus size={16} /> Nouveau Trade
          </button>
        </div>
      </div>

      {/* Modern Status Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px',
        marginBottom: '20px'
      }}>
        <button
          className={`btn ${activeTab === 'open' ? 'btn-accent' : 'btn-secondary'}`}
          onClick={() => setActiveTab('open')}
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          En cours
          <span style={{
            fontSize: '10px',
            background: activeTab === 'open' ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
            color: activeTab === 'open' ? '#fff' : 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700
          }}>{openCount}</span>
        </button>
        <button
          className={`btn ${activeTab === 'closed' ? 'btn-accent' : 'btn-secondary'}`}
          onClick={() => setActiveTab('closed')}
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Terminés
          <span style={{
            fontSize: '10px',
            background: activeTab === 'closed' ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
            color: activeTab === 'closed' ? '#fff' : 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700
          }}>{closedCount}</span>
        </button>
        <button
          className={`btn ${activeTab === 'pending' ? 'btn-accent' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pending')}
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          En attente
          <span style={{
            fontSize: '10px',
            background: activeTab === 'pending' ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
            color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700
          }}>{pendingCount}</span>
        </button>
      </div>

      {/* Hidden file input for screenshots */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Search & Filters */}
      <div style={{ marginBottom: 16 }}>
        <div className="flex gap-2">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Rechercher un symbole, ticket, note..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={showFilters ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          >
            <SlidersHorizontal size={16} />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="filters-bar" style={{ marginTop: 8 }}>
            <select
              className="filter-select"
              value={filterStrategy}
              onChange={e => setFilterStrategy(e.target.value)}
            >
              <option value="">Toutes les stratégies</option>
              {state.strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterSymbol}
              onChange={e => setFilterSymbol(e.target.value)}
            >
              <option value="">Tous les symboles</option>
              {symbols.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterDirection}
              onChange={e => setFilterDirection(e.target.value)}
            >
              <option value="">Long &amp; Short</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>

            {(filterStrategy || filterSymbol || filterDirection) && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setFilterStrategy(''); setFilterSymbol(''); setFilterDirection(''); }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={48} />
          </div>
          <h3 className="empty-state-title">Aucun trade trouvé</h3>
          <p className="empty-state-desc">Importez des trades ou ajustez vos filtres.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('closeTime')}>
                  <span className="flex items-center gap-2">Date <SortIcon field="closeTime" /></span>
                </th>
                <th onClick={() => handleSort('symbol')}>
                  <span className="flex items-center gap-2">Symbole <SortIcon field="symbol" /></span>
                </th>
                <th onClick={() => handleSort('direction')}>
                  <span className="flex items-center gap-2">Direction <SortIcon field="direction" /></span>
                </th>
                <th onClick={() => handleSort('volume')}>
                  <span className="flex items-center gap-2">Volume <SortIcon field="volume" /></span>
                </th>
                <th>Prix Entrée</th>
                <th>Prix Sortie</th>
                <th>SL</th>
                <th>TP</th>
                <th onClick={() => handleSort('rMultiple')}>
                  <span className="flex items-center gap-2">R:R <SortIcon field="rMultiple" /></span>
                </th>
                <th onClick={() => handleSort('profitNet')}>
                  <span className="flex items-center gap-2">P&L <SortIcon field="profitNet" /></span>
                </th>
                <th>Stratégie</th>
                <th>Tags</th>
                <th>Capture</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(trade => (
                <tr 
                  key={trade.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('input') || target.closest('img') || target.closest('select')) {
                      return;
                    }
                    startEditing(trade);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    {trade.status === 'open' ? (
                      <div>
                        <span className="badge badge-neutral" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>EN COURS</span><br/>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatTime(trade.openTime)}
                        </span>
                      </div>
                    ) : trade.status === 'pending' ? (
                      <div>
                        <span className="badge badge-neutral" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--accent)' }}>EN ATTENTE</span><br/>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatTime(trade.openTime)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="mono" style={{ fontSize: 13 }}>{trade.closeTime ? formatDate(trade.closeTime) : '-'}</span>
                        <br />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatTime(trade.openTime)} → {trade.closeTime ? formatTime(trade.closeTime) : ''}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 600 }}>{trade.symbol}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${trade.direction}`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="mono">{trade.volume}</td>
                  <td className="mono">{trade.openPrice}</td>
                  <td className="mono">{trade.closePrice !== null ? trade.closePrice : '-'}</td>
                  <td className="mono">{trade.sl !== null && trade.sl !== undefined ? trade.sl : '—'}</td>
                  <td className="mono">{trade.tp !== null && trade.tp !== undefined ? trade.tp : '—'}</td>
                  <td>
                    {trade.rMultiple !== null && trade.rMultiple !== undefined ? (
                      <span className={`badge ${trade.rMultiple >= 0 ? 'badge-win' : 'badge-loss'}`} style={{ fontWeight: 700 }}>
                        {trade.rMultiple >= 0 ? `+${trade.rMultiple.toFixed(2)}R` : `${trade.rMultiple.toFixed(2)}R`}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {trade.status === 'open' || trade.status === 'pending' ? (
                      <span className="mono text-muted" style={{ fontWeight: 700 }}>
                        -
                      </span>
                    ) : (
                      <span className={`mono ${trade.profitNet >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontWeight: 700 }}>
                        {formatCurrency(trade.profitNet)}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{getStrategyName(trade.strategyId)}</td>
                  <td>
                    <div className="tag-grid">
                      {getTagsForTrade(trade).map(tag => (
                        <span
                          key={tag.id}
                          className="tag-badge"
                          style={{
                            background: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Screenshot Column */}
                  <td>
                    {trade.imageUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={trade.imageUrl}
                          alt="Capture"
                          className="screenshot-thumb"
                          onClick={() => setLightboxImage(trade.imageUrl)}
                        />
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveScreenshot(trade.id)}
                          style={{ padding: 4 }}
                          title="Supprimer la capture"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="screenshot-upload-btn"
                        onClick={() => handleScreenshotUpload(trade.id)}
                        title="Ajouter une capture d'écran"
                      >
                        <Camera size={16} />
                      </button>
                    )}
                  </td>
                  <td>
                    {editingNote === trade.id ? (
                      <div className="flex gap-2">
                        <input
                          className="input"
                          style={{ minWidth: 140, padding: '4px 8px', fontSize: 12 }}
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveNote(trade.id)}
                          autoFocus
                        />
                        <button className="btn btn-sm btn-accent" onClick={() => handleSaveNote(trade.id)}>OK</button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: trade.notes ? 'var(--text-secondary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                        onClick={() => { setEditingNote(trade.id); setNoteText(trade.notes); }}
                        title={trade.notes || 'Cliquez pour ajouter une note'}
                      >
                        {trade.notes || '+ Note'}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm('Supprimer ce trade ?')) deleteTrade(trade.id);
                      }}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p style={{ textAlign: 'center', padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Affichage des 100 premiers trades sur {filtered.length}
            </p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Capture agrandie"
            className="lightbox-image"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div className="modal-overlay" onClick={() => setShowAddTrade(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2"><Plus size={18} /> Ajouter un trade manuel</h2>
              <button className="modal-close" onClick={() => setShowAddTrade(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Sélectionnez le compte actif dans la barre latérale pour lier ce trade. Compte : <strong>{state.accounts.find(a => a.id === state.activeAccountId)?.name || 'Aucun'}</strong>
                </p>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Statut du Trade</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="status" checked={newTrade.status === 'closed'} onChange={() => setNewTrade({ ...newTrade, status: 'closed' })} />
                    Terminé
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="status" checked={newTrade.status === 'open'} onChange={() => setNewTrade({ ...newTrade, status: 'open' })} />
                    En cours
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="status" checked={newTrade.status === 'pending'} onChange={() => setNewTrade({ ...newTrade, status: 'pending' })} />
                    En attente
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="label">Symbole (Recherche Yahoo Finance)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    className="input" 
                    value={newTrade.symbol} 
                    onChange={e => handleLookupChange(e.target.value, 'new')} 
                    placeholder="Ex: EURUSD, BTC-USD, AAPL, ^DJI..." 
                    style={{ flex: 1, paddingRight: isSearching ? '32px' : '12px' }}
                    onFocus={() => { if (newTrade.symbol) setShowLookupDropdown(true); }}
                  />
                  {isSearching && (
                    <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 12, color: 'var(--text-muted)' }} />
                  )}
                </div>

                {showLookupDropdown && lookupResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)'
                  }}>
                    {lookupResults.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          const cleaned = cleanSymbol(item.symbol);
                          const mult = state.symbolSettings?.[cleaned]?.multiplier || (cleaned === 'US30' || cleaned === 'NAS100' ? 10 : cleaned === 'XAUUSD' ? 100 : 100000);
                          setNewTrade((prev: any) => ({ ...prev, symbol: cleaned, multiplier: mult }));
                          setShowLookupDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{cleanSymbol(item.symbol)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span className="badge badge-accent" style={{ fontSize: 10, padding: '2px 6px' }}>{item.type}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.exchange}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="label">Direction</label>
                <select className="select" value={newTrade.direction} onChange={e => setNewTrade({ ...newTrade, direction: e.target.value as 'long'|'short' })}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Date d'ouverture</label>
                <input type="datetime-local" className="input" value={newTrade.openTime} onChange={e => setNewTrade({ ...newTrade, openTime: e.target.value })} />
              </div>
              {newTrade.status === 'closed' && (
                <div className="form-group">
                  <label className="label">Date de fermeture</label>
                  <input type="datetime-local" className="input" value={newTrade.closeTime} onChange={e => setNewTrade({ ...newTrade, closeTime: e.target.value })} />
                </div>
              )}

              <div className="form-group">
                <label className="label">Prix d'entrée</label>
                <input type="number" step="any" className="input" value={newTrade.openPrice} onChange={e => setNewTrade({ ...newTrade, openPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              
              {newTrade.status === 'closed' ? (
                <div className="form-group">
                  <label className="label">Prix de sortie</label>
                  <input type="number" step="any" className="input" value={newTrade.closePrice} onChange={e => setNewTrade({ ...newTrade, closePrice: parseFloat(e.target.value) || 0 })} />
                </div>
              ) : (
                <div className="form-group">
                  <label className="label">Multiplicateur (Valeur du point)</label>
                  <input type="number" step="any" className="input" value={newTrade.multiplier} onChange={e => setNewTrade({ ...newTrade, multiplier: parseFloat(e.target.value) || 1 })} />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Ex: 100000 pour EURUSD, 10 pour US30.</p>
                </div>
              )}

              <div className="form-group">
                <label className="label">Volume (Lots)</label>
                <input type="number" step="0.01" className="input" value={newTrade.volume} onChange={e => setNewTrade({ ...newTrade, volume: parseFloat(e.target.value) || 0 })} />
              </div>
              {newTrade.status === 'closed' ? (
                <div className="form-group">
                  <label className="label">Profit Net ($)</label>
                  <input type="number" step="any" className="input" value={newTrade.profitNet} onChange={e => setNewTrade({ ...newTrade, profitNet: parseFloat(e.target.value) || 0 })} />
                </div>
              ) : (
                <div className="form-group" style={{ height: 0 }}></div>
              )}

              <div className="form-group">
                <label className="label">Stratégie</label>
                <select 
                  className="select" 
                  value={newTrade.strategyId || ''} 
                  onChange={e => setNewTrade({ ...newTrade, strategyId: e.target.value || null })}
                >
                  <option value="">Aucune stratégie</option>
                  {state.strategies.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">R:R (Multiple R)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input" 
                  value={newTrade.rMultiple} 
                  onChange={e => setNewTrade({ ...newTrade, rMultiple: parseFloat(e.target.value) || 0 })} 
                  placeholder="Ex: 2.5"
                />
              </div>

              <div className="form-group">
                <label className="label">Stop Loss (SL)</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input" 
                  value={newTrade.sl || ''} 
                  onChange={e => setNewTrade({ ...newTrade, sl: parseFloat(e.target.value) || 0 })} 
                  placeholder="Ex: 1.0850"
                />
              </div>

              <div className="form-group">
                <label className="label">Take Profit (TP)</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input" 
                  value={newTrade.tp || ''} 
                  onChange={e => setNewTrade({ ...newTrade, tp: parseFloat(e.target.value) || 0 })} 
                  placeholder="Ex: 1.0950"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Tags</label>
                <div className="tag-grid">
                  {state.tags.map(tag => {
                    const isSelected = newTrade.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          const nextTags = isSelected
                            ? newTrade.tagIds.filter(id => id !== tag.id)
                            : [...newTrade.tagIds, tag.id];
                          setNewTrade({ ...newTrade, tagIds: nextTags });
                        }}
                        style={{
                          background: isSelected ? tag.color : 'transparent',
                          color: isSelected ? '#fff' : tag.color,
                          border: `1px solid ${tag.color}`,
                          borderRadius: '6px', 
                          padding: '4px 10px', 
                          fontSize: '12px',
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          transition: 'all 0.2s'
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddTrade(false)}>Annuler</button>
              <button 
                className="btn btn-accent" 
                onClick={() => {
                  if (!state.activeAccountId) return alert("Veuillez sélectionner un compte actif");
                  addTrades([{
                    id: Math.random().toString(36).substr(2, 9),
                    accountId: state.activeAccountId,
                    ticketId: `MANUAL-${Math.floor(Math.random()*10000)}`,
                    symbol: newTrade.symbol,
                    direction: newTrade.direction,
                    status: newTrade.status,
                    openTime: new Date(newTrade.openTime).toISOString(),
                    closeTime: newTrade.status === 'closed' ? new Date(newTrade.closeTime).toISOString() : null,
                    openPrice: newTrade.openPrice,
                    closePrice: newTrade.status === 'closed' ? newTrade.closePrice : null,
                    volume: newTrade.volume,
                    multiplier: newTrade.multiplier,
                    profitGross: newTrade.status === 'closed' ? newTrade.profitNet : 0,
                    commission: 0,
                    swap: 0,
                    profitNet: newTrade.status === 'closed' ? newTrade.profitNet : 0,
                    strategyId: newTrade.strategyId || null,
                    tagIds: newTrade.tagIds,
                    notes: '',
                    imageUrl: null,
                    rMultiple: newTrade.rMultiple !== 0 ? newTrade.rMultiple : null,
                    sl: newTrade.sl !== 0 ? newTrade.sl : null,
                    tp: newTrade.tp !== 0 ? newTrade.tp : null
                  }]);
                  setShowAddTrade(false);
                }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {editingTrade && editingTradeData && (
        <div className="modal-overlay" onClick={() => { setEditingTrade(null); setEditingTradeData(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">Modifier le Trade</h2>
              <button className="modal-close" onClick={() => { setEditingTrade(null); setEditingTradeData(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Statut du Trade</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="editStatus" checked={editingTradeData.status === 'closed'} onChange={() => setEditingTradeData({ ...editingTradeData, status: 'closed' })} />
                    Terminé
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="editStatus" checked={editingTradeData.status === 'open'} onChange={() => setEditingTradeData({ ...editingTradeData, status: 'open' })} />
                    En cours
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="editStatus" checked={editingTradeData.status === 'pending'} onChange={() => setEditingTradeData({ ...editingTradeData, status: 'pending' })} />
                    En attente
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="label">Symbole (Recherche Yahoo Finance)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    className="input" 
                    value={editingTradeData.symbol} 
                    onChange={e => handleLookupChange(e.target.value, 'edit')} 
                    placeholder="Ex: EURUSD, BTC-USD, AAPL, ^DJI..." 
                    style={{ flex: 1, paddingRight: isSearching ? '32px' : '12px' }}
                    onFocus={() => { if (editingTradeData.symbol) setShowLookupDropdown(true); }}
                  />
                  {isSearching && (
                    <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 12, color: 'var(--text-muted)' }} />
                  )}
                </div>

                {showLookupDropdown && lookupResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)'
                  }}>
                    {lookupResults.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          const cleaned = cleanSymbol(item.symbol);
                          const mult = state.symbolSettings?.[cleaned]?.multiplier || (cleaned === 'US30' || cleaned === 'NAS100' ? 10 : cleaned === 'XAUUSD' ? 100 : 100000);
                          setEditingTradeData((prev: any) => ({ ...prev, symbol: cleaned, multiplier: mult }));
                          setShowLookupDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{cleanSymbol(item.symbol)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span className="badge badge-accent" style={{ fontSize: 10, padding: '2px 6px' }}>{item.type}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.exchange}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="label">Direction</label>
                <select className="select" value={editingTradeData.direction} onChange={e => setEditingTradeData({ ...editingTradeData, direction: e.target.value as 'long'|'short' })}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Date d'ouverture</label>
                <input type="datetime-local" className="input" value={editingTradeData.openTime} onChange={e => setEditingTradeData({ ...editingTradeData, openTime: e.target.value })} />
              </div>
              {editingTradeData.status === 'closed' && (
                <div className="form-group">
                  <label className="label">Date de fermeture</label>
                  <input type="datetime-local" className="input" value={editingTradeData.closeTime} onChange={e => setEditingTradeData({ ...editingTradeData, closeTime: e.target.value })} />
                </div>
              )}

              <div className="form-group">
                <label className="label">Prix d'entrée</label>
                <input type="number" step="any" className="input" value={editingTradeData.openPrice} onChange={e => setEditingTradeData({ ...editingTradeData, openPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              
              {editingTradeData.status === 'closed' ? (
                <div className="form-group">
                  <label className="label">Prix de sortie</label>
                  <input type="number" step="any" className="input" value={editingTradeData.closePrice} onChange={e => setEditingTradeData({ ...editingTradeData, closePrice: parseFloat(e.target.value) || 0 })} />
                </div>
              ) : (
                <div className="form-group">
                  <label className="label">Multiplicateur (Valeur du point)</label>
                  <input type="number" step="any" className="input" value={editingTradeData.multiplier} onChange={e => setEditingTradeData({ ...editingTradeData, multiplier: parseFloat(e.target.value) || 1 })} />
                </div>
              )}

              <div className="form-group">
                <label className="label">Volume (Lots)</label>
                <input type="number" step="0.01" className="input" value={editingTradeData.volume} onChange={e => setEditingTradeData({ ...editingTradeData, volume: parseFloat(e.target.value) || 0 })} />
              </div>
              {editingTradeData.status === 'closed' ? (
                <div className="form-group">
                  <label className="label">Profit Net ($)</label>
                  <input type="number" step="any" className="input" value={editingTradeData.profitNet} onChange={e => setEditingTradeData({ ...editingTradeData, profitNet: parseFloat(e.target.value) || 0 })} />
                </div>
              ) : (
                <div className="form-group" style={{ height: 0 }}></div>
              )}

              <div className="form-group">
                <label className="label">Stratégie</label>
                <select 
                  className="select" 
                  value={editingTradeData.strategyId} 
                  onChange={e => setEditingTradeData({ ...editingTradeData, strategyId: e.target.value })}
                >
                  <option value="">Aucune stratégie</option>
                  {state.strategies.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">R:R (Multiple R)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input" 
                  value={editingTradeData.rMultiple} 
                  onChange={e => setEditingTradeData({ ...editingTradeData, rMultiple: parseFloat(e.target.value) || 0 })} 
                  placeholder="Ex: 2.5"
                />
              </div>

              <div className="form-group">
                <label className="label">Stop Loss (SL)</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input" 
                  value={editingTradeData.sl || ''} 
                  onChange={e => setEditingTradeData({ ...editingTradeData, sl: parseFloat(e.target.value) || 0 })} 
                  placeholder="Ex: 1.0850"
                />
              </div>

              <div className="form-group">
                <label className="label">Take Profit (TP)</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input" 
                  value={editingTradeData.tp || ''} 
                  onChange={e => setEditingTradeData({ ...editingTradeData, tp: parseFloat(e.target.value) || 0 })} 
                  placeholder="Ex: 1.0950"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Tags</label>
                <div className="tag-grid">
                  {state.tags.map(tag => {
                    const isSelected = editingTradeData.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          const nextTags = isSelected
                            ? editingTradeData.tagIds.filter((id: string) => id !== tag.id)
                            : [...editingTradeData.tagIds, tag.id];
                          setEditingTradeData({ ...editingTradeData, tagIds: nextTags });
                        }}
                        style={{
                          background: isSelected ? tag.color : 'transparent',
                          color: isSelected ? '#fff' : tag.color,
                          border: `1px solid ${tag.color}`,
                          borderRadius: '6px', 
                          padding: '4px 10px', 
                          fontSize: '12px',
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          transition: 'all 0.2s'
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setEditingTrade(null); setEditingTradeData(null); }}>Annuler</button>
              <button 
                className="btn btn-accent" 
                onClick={() => {
                  updateTrade(editingTrade.id, {
                    symbol: editingTradeData.symbol,
                    direction: editingTradeData.direction,
                    status: editingTradeData.status,
                    openTime: new Date(editingTradeData.openTime).toISOString(),
                    closeTime: editingTradeData.status === 'closed' ? new Date(editingTradeData.closeTime).toISOString() : null,
                    openPrice: editingTradeData.openPrice,
                    closePrice: editingTradeData.status === 'closed' ? editingTradeData.closePrice : null,
                    volume: editingTradeData.volume,
                    multiplier: editingTradeData.multiplier,
                    profitGross: editingTradeData.status === 'closed' ? editingTradeData.profitNet : 0,
                    profitNet: editingTradeData.status === 'closed' ? editingTradeData.profitNet : 0,
                    rMultiple: editingTradeData.rMultiple !== 0 ? editingTradeData.rMultiple : null,
                    strategyId: editingTradeData.strategyId || null,
                    tagIds: editingTradeData.tagIds,
                    sl: editingTradeData.sl !== 0 ? editingTradeData.sl : null,
                    tp: editingTradeData.tp !== 0 ? editingTradeData.tp : null,
                  });
                  setEditingTrade(null);
                  setEditingTradeData(null);
                }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
