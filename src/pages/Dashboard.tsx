import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { activeOutletId, outlets, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ commitReg: 0, actualReg: 0, commitBund: 0, actualBund: 0, memberBaru: 0, closing: 0 });

  useEffect(() => {
    (async () => {
      if (!activeOutletId) return;
      setLoading(true);
      const [{ data: commits }, { data: members }] = await Promise.all([
        supabase.from('daily_commit').select('*').eq('outlet_id', activeOutletId).eq('tanggal', todayStr()),
        supabase.from('member_baru').select('*').eq('outlet_id', activeOutletId)
          .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
      ]);
      const c = commits ?? []; const m = members ?? [];
      setKpi({
        commitReg: c.reduce((s, r) => s + (r.commit_reguler || 0), 0),
        actualReg: c.reduce((s, r) => s + (r.actual_reguler || 0), 0),
        commitBund: c.reduce((s, r) => s + (r.commit_bundling || 0), 0),
        actualBund: c.reduce((s, r) => s + (r.actual_bundling || 0), 0),
        memberBaru: m.length,
        closing: m.filter((x) => x.status === 'Closing').length,
      });
      setLoading(false);
    })();
  }, [activeOutletId]);

  const outletName = outlets.find((o) => o.id === activeOutletId)?.name ?? '—';
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-brand-400 text-xs font-bold uppercase tracking-wide">{outletName}</span>
        <h1 className="font-display text-xl tracking-wide uppercase">Ringkasan Hari Ini</h1>
        <p className="text-ink-muted text-sm">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {loading ? (
        <p className="text-ink-dim text-sm">Memuat data...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Poin Reguler" value={`${kpi.actualReg}/${kpi.commitReg}`} sub={`${pct(kpi.actualReg, kpi.commitReg)}% tercapai`} accent="brand" />
            <KpiCard label="Poin Bundling" value={`${kpi.actualBund}/${kpi.commitBund}`} sub={`${pct(kpi.actualBund, kpi.commitBund)}% tercapai`} accent="warning" />
            <KpiCard label="Member Baru (Bulan Ini)" value={String(kpi.memberBaru)} sub="Semua sumber" accent="success" />
            <KpiCard label="Sudah Closing" value={String(kpi.closing)} sub={`dari ${kpi.memberBaru} member`} accent="brand" />
          </div>

          <div className="card p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-3">Akses Anda</div>
            <p className="text-sm text-ink-muted">
              Login sebagai <span className="text-ink font-medium">{profile?.full_name}</span> — bisa lihat {outlets.length} outlet:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {outlets.map((o) => <span key={o.id} className="text-xs bg-surface-hi px-2.5 py-1 rounded-full">{o.name}</span>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'brand' | 'warning' | 'success' }) {
  const border = { brand: 'border-l-brand-500', warning: 'border-l-warning', success: 'border-l-success' }[accent];
  return (
    <div className={`card p-4 border-l-4 ${border}`}>
      <div className="text-[11px] text-ink-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="font-display text-2xl">{value}</div>
      <div className="text-[11px] text-ink-dim font-mono mt-1">{sub}</div>
    </div>
  );
}
