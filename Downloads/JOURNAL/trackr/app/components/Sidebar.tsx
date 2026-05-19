'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  BarChart3,
  Wallet,
  Upload,
  Menu,
  X,
  Lightbulb,
  Tag,
  LogOut,
  GitCompare,
  Settings,
  HelpCircle,
  Plus
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  onImport: () => void;
  onStrategies: () => void;
  onTags: () => void;
  user?: { name: string; email: string; avatar: string };
  onLogout?: () => void;
}

export default function Sidebar({ onImport, onStrategies, onTags, user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setActiveAccount } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderLink = (href: string, label: string, Icon: any, disabled = false) => {
    const isActive = pathname === href && !disabled;
    if (disabled) {
      return (
        <div key={href || label} className="nav-link disabled" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <Icon className="nav-icon" size={20} />
          {label}
        </div>
      );
    }
    return (
      <Link
        key={href}
        href={href}
        className={`nav-link ${isActive ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="nav-icon" size={20} />
        {label}
      </Link>
    );
  };

  const renderButton = (onClick: () => void, label: string, Icon: any) => (
    <button key={label} className="nav-link" onClick={onClick}>
      <Icon className="nav-icon" size={20} />
      {label}
    </button>
  );

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-primary)' }}>
            Journal<span style={{ color: 'var(--accent)' }}>+</span>
          </span>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', borderColor: 'var(--border)', color: 'var(--accent)', padding: '12px', height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
            onClick={() => { router.push('/comptes'); setMobileOpen(false); }}
          >
            <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: '14px' }}>
              <Plus size={16} /> Créer ton premier compte
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, paddingLeft: '24px' }}>
              Live, prop firm, demo, backtest...
            </div>
          </button>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
          
          <div className="sidebar-section">
            <div className="sidebar-section-title">NAVIGATION</div>
            {renderLink('/', 'Dashboard', LayoutDashboard)}
            {renderLink('/journal', 'Mes trades', BookOpen)}
            {renderLink('/analytics', 'Analytics', BarChart3)}
            {renderLink('/calendrier', 'Calendrier', CalendarDays)}
            {renderButton(onImport, 'Importer', Upload)}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">STRATÉGIE</div>
            {renderButton(onStrategies, 'Stratégies', Lightbulb)}
            {renderButton(onTags, 'Tags', Tag)}
            {renderLink('/backtest', 'Backtest vs live', GitCompare)}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">COMPTE</div>
            {renderLink('/comptes', 'Comptes', Wallet)}
            {renderLink('/settings', 'Paramètres', Settings)}
          </div>
        </nav>

        <div className="sidebar-footer" style={{ borderTop: 'none', padding: '16px 20px', background: 'var(--bg-primary)' }}>
          <div className="nav-link" style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
            <HelpCircle className="nav-icon" size={20} />
            Aide / Premiers pas
          </div>
          
          {user && (
            <div className="sidebar-user" style={{ borderTop: 'none', margin: 0, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div className="sidebar-user-avatar" style={{ background: 'var(--border)', color: 'var(--accent)' }}>
                {user.avatar}
              </div>
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{user.name}</p>
                <p className="sidebar-user-email" style={{ color: 'var(--accent)', fontWeight: 500 }}>Premium</p>
              </div>
              {onLogout && (
                <button className="sidebar-logout" onClick={onLogout} title="Déconnexion">
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

