import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPendingCount, flushQueue } from '../lib/offlineQueue';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  area_manager: 'Area Manager',
  fitness_manager: 'Fitness Manager',
  fm_hybrid: 'Fitness Manager (Hybrid)',
};

const NAV_ITEMS = [
  { to: '/', label: 'Ringkasan', icon: '◱' },
  { to: '/daily-commit', label: 'Daily Commit', icon: '⏱' },
  { to: '/member-baru', label: 'Member Baru', icon: '＋' },
  { to: '/follow-up', label: 'Follow-Up', icon: '↷' },
  { to: '/training', label: 'Training', icon: '🎯' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, outlets, activeOutletId, setActiveOutletId, signOut } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const iv = setInterval(async () => setPending(await getPendingCount()), 3000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-60 border-r border-surface-border bg-surface-alt px-4 py-6 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2">
          <img src="/icons/icon-192.png" className="w-8 h-8 rounded-lg" alt="" />
          <span className="font-display tracking-wide text-sm">FTL FM</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-brand-500/15 text-brand-400' : 'text-ink-muted hover:bg-surface-hi hover:text-ink'
                }`
              }>
              <span>{it.icon}</span>{it.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { signOut(); navigate('/login'); }}
          className="text-ink-dim text-xs uppercase tracking-wide text-left px-3 py-2 hover:text-danger">
          Keluar
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-surface-border px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-ink-dim uppercase tracking-wide">{profile && ROLE_LABEL[profile.role]}</div>
            <div className="text-sm font-semibold truncate">{profile?.full_name}</div>
          </div>

          {outlets.length > 1 ? (
            <select
              className="input-field !w-auto text-sm py-2"
              value={activeOutletId ?? ''}
              onChange={(e) => setActiveOutletId(e.target.value)}
            >
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          ) : (
            <span className="text-sm text-ink-muted">{outlets[0]?.name}</span>
          )}

          <button
            onClick={() => flushQueue()}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
              online ? 'border-success/30 text-success bg-success/10' : 'border-warning/30 text-warning bg-warning/10'
            }`}
            title="Klik untuk sinkron manual"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-success' : 'bg-warning'}`} />
            {online ? 'Online' : 'Offline'}
            {pending > 0 && <span className="font-mono">· {pending} tertunda</span>}
          </button>
        </header>

        <main className="px-4 md:px-8 py-6 max-w-5xl mx-auto">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-alt border-t border-surface-border flex justify-around py-2 z-40">
        {NAV_ITEMS.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center text-[10px] gap-1 px-2 py-1 ${isActive ? 'text-brand-400' : 'text-ink-dim'}`
            }>
            <span className="text-base leading-none">{it.icon}</span>{it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
