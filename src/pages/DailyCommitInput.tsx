import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, DailyCommit } from '../lib/supabase';
import { enqueue } from '../lib/offlineQueue';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DailyCommitInput() {
  const { activeOutletId, profile } = useAuth();
  const [trainerName, setTrainerName] = useState('');
  const [commitReguler, setCommitReguler] = useState('');
  const [actualReguler, setActualReguler] = useState('');
  const [commitBundling, setCommitBundling] = useState('');
  const [actualBundling, setActualBundling] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [todayRows, setTodayRows] = useState<DailyCommit[]>([]);

  async function loadToday() {
    if (!activeOutletId) return;
    // NetworkFirst service-worker cache akan menjawab dari cache kalau offline
    const { data } = await supabase
      .from('daily_commit')
      .select('*')
      .eq('outlet_id', activeOutletId)
      .eq('tanggal', todayStr())
      .order('created_at', { ascending: false });
    setTodayRows((data ?? []) as DailyCommit[]);
  }

  useEffect(() => { loadToday(); }, [activeOutletId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOutletId || !profile) return;
    setSaving(true);

    const payload: DailyCommit = {
      outlet_id: activeOutletId,
      trainer_name: trainerName,
      tanggal: todayStr(),
      commit_reguler: Number(commitReguler) || 0,
      actual_reguler: Number(actualReguler) || 0,
      commit_bundling: Number(commitBundling) || 0,
      actual_bundling: Number(actualBundling) || 0,
      input_by: profile.full_name,
    };

    if (navigator.onLine) {
      const { error } = await supabase.from('daily_commit').insert(payload);
      if (error) { await enqueue('daily_commit', payload); }
    } else {
      await enqueue('daily_commit', payload);
    }

    setSaving(false);
    setToast(navigator.onLine ? 'Tersimpan & sinkron ke server.' : 'Tersimpan di HP — akan sinkron otomatis saat online.');
    setTrainerName(''); setCommitReguler(''); setActualReguler(''); setCommitBundling(''); setActualBundling('');
    loadToday();
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl tracking-wide uppercase">Daily Commit</h1>
        <p className="text-ink-muted text-sm">Input commit pagi & actual sore — {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Nama Trainer</label>
          <input required value={trainerName} onChange={(e) => setTrainerName(e.target.value)}
            className="input-field" placeholder="Contoh: PT1 - Rizkia Agung" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wide text-brand-400">Poin Reguler</div>
            <div>
              <label className="text-[11px] text-ink-dim block mb-1">Commit</label>
              <input type="number" inputMode="numeric" value={commitReguler} onChange={(e) => setCommitReguler(e.target.value)} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="text-[11px] text-ink-dim block mb-1">Actual</label>
              <input type="number" inputMode="numeric" value={actualReguler} onChange={(e) => setActualReguler(e.target.value)} className="input-field" placeholder="0" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wide text-warning">Poin Bundling</div>
            <div>
              <label className="text-[11px] text-ink-dim block mb-1">Commit</label>
              <input type="number" inputMode="numeric" value={commitBundling} onChange={(e) => setCommitBundling(e.target.value)} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="text-[11px] text-ink-dim block mb-1">Actual</label>
              <input type="number" inputMode="numeric" value={actualBundling} onChange={(e) => setActualBundling(e.target.value)} className="input-field" placeholder="0" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full font-display tracking-wide uppercase">
          {saving ? 'Menyimpan...' : 'Simpan Commit'}
        </button>
        {toast && <p className="text-success text-sm text-center">{toast}</p>}
      </form>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">Input Hari Ini ({todayRows.length})</div>
        <div className="space-y-2">
          {todayRows.map((r, i) => (
            <div key={i} className="card p-3 flex items-center justify-between text-sm">
              <span className="font-medium">{r.trainer_name}</span>
              <span className="font-mono text-ink-muted">
                Reg {r.actual_reguler}/{r.commit_reguler} · Bund {r.actual_bundling}/{r.commit_bundling}
              </span>
            </div>
          ))}
          {todayRows.length === 0 && <p className="text-ink-dim text-sm">Belum ada input hari ini.</p>}
        </div>
      </div>
    </div>
  );
}
