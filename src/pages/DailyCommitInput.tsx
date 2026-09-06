import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, DailyCommit, Trainer } from '../lib/supabase';
import { enqueue } from '../lib/offlineQueue';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DailyCommitInput() {
  const { activeOutletId, profile } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerName, setTrainerName] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [commitReguler, setCommitReguler] = useState('');
  const [actualReguler, setActualReguler] = useState('');
  const [commitBundling, setCommitBundling] = useState('');
  const [actualBundling, setActualBundling] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rowsForDate, setRowsForDate] = useState<DailyCommit[]>([]);

  async function loadTrainers() {
    if (!activeOutletId) return;
    const { data } = await supabase.from('trainers').select('*').eq('outlet_id', activeOutletId).order('name');
    setTrainers((data ?? []) as Trainer[]);
  }

  async function loadForDate() {
    if (!activeOutletId) return;
    const { data } = await supabase
      .from('daily_commit')
      .select('*')
      .eq('outlet_id', activeOutletId)
      .eq('tanggal', tanggal)
      .order('created_at', { ascending: false });
    setRowsForDate((data ?? []) as DailyCommit[]);
  }

  useEffect(() => { loadTrainers(); }, [activeOutletId]);
  useEffect(() => { loadForDate(); }, [activeOutletId, tanggal]);

  // Kalau trainer & tanggal yang dipilih sudah punya baris (misal commit-nya
  // sudah di-set duluan lewat "Setup Commit Bulan"), tarik nilainya ke form
  // supaya FM tinggal isi actual-nya saja tanpa menimpa commit yang sudah ada.
  useEffect(() => {
    const existing = rowsForDate.find((r) => r.trainer_name === trainerName);
    if (existing) {
      setCommitReguler(String(existing.commit_reguler ?? ''));
      setActualReguler(String(existing.actual_reguler ?? ''));
      setCommitBundling(String(existing.commit_bundling ?? ''));
      setActualBundling(String(existing.actual_bundling ?? ''));
    } else {
      setCommitReguler(''); setActualReguler(''); setCommitBundling(''); setActualBundling('');
    }
  }, [trainerName, rowsForDate]);

  async function addTrainerQuick() {
    const name = prompt('Nama trainer baru:');
    if (!name || !activeOutletId) return;
    const { error } = await supabase.from('trainers').insert({ outlet_id: activeOutletId, name: name.trim() });
    if (!error) { loadTrainers(); setTrainerName(name.trim()); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOutletId || !profile || !trainerName) return;
    setSaving(true);

    const payload: DailyCommit = {
      outlet_id: activeOutletId,
      trainer_name: trainerName,
      tanggal,
      commit_reguler: Number(commitReguler) || 0,
      actual_reguler: Number(actualReguler) || 0,
      commit_bundling: Number(commitBundling) || 0,
      actual_bundling: Number(actualBundling) || 0,
      input_by: profile.full_name,
    };

    if (navigator.onLine) {
      // upsert: kalau baris (outlet, trainer, tanggal) sudah ada — misal commit-nya
      // sudah di-set lebih dulu — di-update, bukan bikin baris baru.
      const { error } = await supabase
        .from('daily_commit')
        .upsert(payload, { onConflict: 'outlet_id,trainer_name,tanggal' });
      if (error) await enqueue('daily_commit', payload);
    } else {
      await enqueue('daily_commit', payload);
    }

    setSaving(false);
    setToast(navigator.onLine ? 'Tersimpan & sinkron ke server.' : 'Tersimpan di HP — akan sinkron otomatis saat online.');
    loadForDate();
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl tracking-wide uppercase">Daily Commit</h1>
        <p className="text-ink-muted text-sm">Input commit & actual — bisa untuk tanggal berapa saja, tidak harus hari ini</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Tanggal</label>
            <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Trainer</label>
            <div className="flex gap-2">
              <select required value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="input-field">
                <option value="">Pilih trainer</option>
                {trainers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <button type="button" onClick={addTrainerQuick} className="px-3 rounded-lg bg-surface-hi text-ink-muted text-lg leading-none" title="Tambah trainer baru">+</button>
            </div>
          </div>
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
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        {toast && <p className="text-success text-sm text-center">{toast}</p>}
      </form>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">
          Input Tanggal {new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} ({rowsForDate.length})
        </div>
        <div className="space-y-2">
          {rowsForDate.map((r, i) => (
            <div key={i} className="card p-3 flex items-center justify-between text-sm">
              <span className="font-medium">{r.trainer_name}</span>
              <span className="font-mono text-ink-muted">
                Reg {r.actual_reguler}/{r.commit_reguler} · Bund {r.actual_bundling}/{r.commit_bundling}
              </span>
            </div>
          ))}
          {rowsForDate.length === 0 && <p className="text-ink-dim text-sm">Belum ada input untuk tanggal ini.</p>}
        </div>
      </div>
    </div>
  );
}
