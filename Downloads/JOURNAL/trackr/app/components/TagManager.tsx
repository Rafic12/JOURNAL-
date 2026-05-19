'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Plus, Pencil, Trash2, X, Tag as TagIcon } from 'lucide-react';

const PRESET_COLORS = [
  '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48',
];

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function TagManager({ open, onClose }: TagManagerProps) {
  const { state, addTag, updateTag, deleteTag } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3b82f6' });

  if (!open) return null;

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateTag(editing, form);
      setEditing(null);
    } else {
      addTag(form);
    }
    setForm({ name: '', color: '#3b82f6' });
  };

  const handleEdit = (t: typeof state.tags[0]) => {
    setForm({ name: t.name, color: t.color });
    setEditing(t.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce tag ?')) {
      deleteTag(id);
      if (editing === id) { setEditing(null); setForm({ name: '', color: '#3b82f6' }); }
    }
  };

  const tradeCountByTag = (id: string) =>
    state.trades.filter(t => t.tagIds.includes(id)).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title">🏷️ Gestion des Tags</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* Form */}
          <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {editing ? '✏️ Modifier le tag' : '➕ Ajouter un tag'}
            </p>
            <div className="form-group">
              <input className="input" placeholder="Nom du tag" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="label">Couleur</label>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} style={{
                    width: 28, height: 28, borderRadius: 6, background: c, border: form.color === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer', transition: 'transform 0.15s', transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                  }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <span>Aperçu:</span>
              <span className="tag-badge" style={{ background: `${form.color}20`, color: form.color }}>
                {form.name || 'Tag'}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-accent btn-sm" onClick={handleSubmit} disabled={!form.name.trim()}>
                {editing ? 'Modifier' : 'Ajouter'}
              </button>
              {editing && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', color: '#3b82f6' }); }}>
                  Annuler
                </button>
              )}
            </div>
          </div>

          {/* Tag List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.tags.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 14 }}>
                Aucun tag configuré
              </p>
            )}
            {state.tags.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8,
                border: editing === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: t.color, flexShrink: 0 }} />
                  <div>
                    <span className="tag-badge" style={{ background: `${t.color}20`, color: t.color }}>{t.name}</span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tradeCountByTag(t.id)} trade{tradeCountByTag(t.id) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)} style={{ padding: 6 }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} style={{ padding: 6 }}>
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
