import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Trainer, DailyCommit } from '../lib/supabase';

function daysInMonth(year: number, month: number) { // month: 1-12
  return new Date(year, month, 0).getDate();
}
function pad(n: number) { return String(n).padStart(2, '0'); }

type Category = 'reguler' | 'bundling';

export default function CommitSetup() {
  const { activeOutletId, profile } = useAuth();
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [category, setCategory] = useState<Category>('reguler');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<number, string>>>({}); // trainerName -> day -> value
  const [existing, setExisting] = useState<DailyCommit[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [year, month] = monthValue.split('-').map(Number);
  const totalDays = daysInMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  async function loadAll() {
    if (!activeOutletId) return;
    const { data: tData } = await supabase.from('trainers').select('*').eq('outlet_id', activeOutletId).order('name');
    setTrainers((tData ?? []) as Trainer[]);

    const from = `${monthValue}-01`;
    const to = `${monthValue}-${pad(totalDays)}`;
    const { data: cData } = await supabase
      .from('daily_commit').select('*').eq('outlet_id', activeOutletId)
      .gte('tanggal', from).lte('tanggal', to);
    const rows = (cData ?? []) as DailyCommit[];
    setExisting(rows);

    // isi grid dari data yang sudah ada
    const g: Record<string, Record<number, string>> = {};
    rows.forEach((r) => {
      const day = Number(r.tanggal.slice(8, 10));
      const val = category === 'reguler' ? r.commit_reguler : r.commit_bundling;
      if (!g[r.trainer_name]) g[r.trainer_name] = {};
      g[r.trainer_name][day] = val ? String(val) : '';
    });
    setGrid(g);
  }

  useEffect(() => { loadAll(); }, [activeOutletId, monthValue, category]);

  function setCell(trainerName: string, day: number, value: string) {
    setGrid((prev) => ({ ...prev, [trainerName]: { ...(prev[trainerName] ?? {}), [day]: value } }));
  }

  function fillAllDays(trainerName: string) {
    const val = prompt(`Isi nilai yang sama untuk semua hari — ${trainerName}:`);
    if (val === null) return;
    setGrid((prev) => {
      const row: Record<number, string> = {};
      days.forEach((d) => { row[d] = val; });
      return { ...prev, [trainerName]: row };
    });
  }

  async function handleSaveAll() {
    if (!activeOutletId || !profile) return;
    setSaving(true);

    const payloads: DailyCommit[] = [];
    for (const trainer of trainers) {
      const row = grid[trainer.name] ?? {};
      for (const day of days) {
        const raw = row[day];
        if (raw === undefined || raw === '') continue;
        const tanggal = `${monthValue}-${pad(day)}`;
        const prevRow = existing.find((r) => r.trainer_name === trainer.name && r.tanggal === tanggal);
        payloads.push({
          outlet_id: activeOutletId,
          trainer_name: trainer.name,
          tanggal,
          commit_reguler: category === 'reguler' ? Number(raw) || 0 : (prevRow?.commit_reguler ?? 0),
          actual_reguler: prevRow?.actual_reguler ?? 0,
          commit_bundling: category === 'bundling' ? Number(raw) || 0 : (prevRow?.commit_bundling ?? 0),
          actual_bundling: prevRow?.actual_bundling ?? 0,
          input_by: profile.full_name,
        });
      }
    }

    if (payloads.length === 0) { setSaving(false); return; }

    // Setup bulanan dilakukan sekali di awal bulan saat online (di kantor/wifi outlet),
    // jadi tidak lewat offline queue — langsung upsert batch ke Supabase.
    const { error } = await supabase.from('daily_commit').upsert(payloads, { onConflict: 'outlet_id,trainer_name,tanggal' });

    setSaving(false);
    setToast(error ? `Gagal: ${error.message}` : `Tersimpan — ${payloads.length} sel commit ter-set.`);
    if (!error) loadAll();
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl tracking-wide uppercase">Setup Commit Bulan</h1>
        <p className="text-ink-muted text-sm">Set target commit untuk 1 bulan penuh sekaligus, per trainer</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className="input-field !w-auto" />
        <div className="flex gap-2">
          <button onClick={() => setCategory('reguler')}
            className={`chip-btn text-xs px-3 py-2 rounded-full font-bold uppercase tracking-wide ${category === 'reguler' ? 'bg-brand-500 text-surface' : 'bg-surface-alt text-ink-muted'}`}>
            Poin Reguler
          </button>
          <button onClick={() => setCategory('bundling')}
            className={`text-xs px-3 py-2 rounded-full font-bold uppercase tracking-wide ${category === 'bundling' ? 'bg-warning text-surface' : 'bg-surface-alt text-ink-muted'}`}>
            Poin Bundling
          </button>
        </div>
      </div>

      {trainers.length === 0 ? (
        <p className="text-ink-dim text-sm">Belum ada trainer untuk outlet ini — tambah dulu lewat halaman Daily Commit (tombol "+").</p>
      ) : (
        <div className="card p-3">
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface text-left px-2 py-2 text-ink-muted uppercase">Trainer</th>
                  {days.map((d) => <th key={d} className="px-1 py-2 text-ink-dim font-mono">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {trainers.map((t) => (
                  <tr key={t.id}>
                    <td className="sticky left-0 bg-surface px-2 py-1 font-medium whitespace-nowrap">
                      <button onClick={() => fillAllDays(t.name)} className="text-ink hover:text-brand-400 text-left" title="Klik untuk isi semua hari dengan nilai sama">
                        {t.name}
                      </button>
                    </td>
                    {days.map((d) => (
                      <td key={d} className="p-0.5">
                        <input
                          type="number" inputMode="numeric"
                          value={grid[t.name]?.[d] ?? ''}
                          onChange={(e) => setCell(t.name, d, e.target.value)}
                          className="w-12 text-center bg-surface-alt border border-surface-border rounded text-ink text-xs py-1 focus:outline-none focus:border-brand-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button onClick={handleSaveAll} disabled={saving || trainers.length === 0} className="btn-primary w-full font-display tracking-wide uppercase">
        {saving ? 'Menyimpan...' : `Simpan Semua Commit ${category === 'reguler' ? 'Reguler' : 'Bundling'}`}
      </button>
      {toast && <p className="text-success text-sm text-center">{toast}</p>}

      <p className="text-ink-dim text-xs">
        Tips: klik nama trainer untuk isi nilai yang sama ke semua tanggal sekaligus, lalu edit manual tanggal yang beda.
        Actual tetap diisi terpisah setiap hari lewat halaman Daily Commit.
      </p>
    </div>
  );
}
