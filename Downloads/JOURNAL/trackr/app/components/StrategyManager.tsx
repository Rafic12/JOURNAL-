'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Plus, Pencil, Trash2, X, Lightbulb } from 'lucide-react';

interface StrategyManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function StrategyManager({ open, onClose }: StrategyManagerProps) {
  const { state, addStrategy, updateStrategy, deleteStrategy } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  if (!open) return null;

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateStrategy(editing, form);
      setEditing(null);
    } else {
      addStrategy(form);
    }
    setForm({ name: '', description: '' });
  };

  const handleEdit = (s: typeof state.strategies[0]) => {
    setForm({ name: s.name, description: s.description });
    setEditing(s.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette stratégie ?')) {
      deleteStrategy(id);
      if (editing === id) { setEditing(null); setForm({ name: '', description: '' }); }
    }
  };

  const tradeCountByStrategy = (id: string) =>
    state.trades.filter(t => t.strategyId === id).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">💡 Gestion des Stratégies</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* Add / Edit Form */}
          <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {editing ? '✏️ Modifier la stratégie' : '➕ Ajouter une stratégie'}
            </p>
            <div className="form-group">
              <input className="input" placeholder="Nom de la stratégie" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <input className="input" placeholder="Description (optionnel)" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-accent btn-sm" onClick={handleSubmit} disabled={!form.name.trim()}>
                {editing ? 'Modifier' : 'Ajouter'}
              </button>
              {editing && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); }}>
                  Annuler
                </button>
              )}
            </div>
          </div>

          {/* Strategy List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.strategies.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 14 }}>
                Aucune stratégie configurée
              </p>
            )}
            {state.strategies.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8,
                border: editing === s.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div className="flex items-center gap-3">
                  <Lightbulb size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</p>
                    {s.description && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.description}</p>}
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tradeCountByStrategy(s.id)} trade{tradeCountByStrategy(s.id) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(s)} style={{ padding: 6 }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)} style={{ padding: 6 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
