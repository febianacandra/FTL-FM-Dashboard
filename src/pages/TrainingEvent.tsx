import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TrainingEvent as TrainingEventType } from '../lib/supabase';
import { enqueue } from '../lib/offlineQueue';

export default function TrainingEvent() {
  const { activeOutletId, profile } = useAuth();
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [foto, setFoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [events, setEvents] = useState<TrainingEventType[]>([]);

  async function load() {
    const { data } = await supabase
      .from('training_event').select('*')
      .or(activeOutletId ? `outlet_id.eq.${activeOutletId},outlet_id.is.null` : 'outlet_id.is.null')
      .order('tanggal', { ascending: false }).limit(15);
    setEvents((data ?? []) as TrainingEventType[]);
  }
  useEffect(() => { load(); }, [activeOutletId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    let fotoUrl: string | null = null;

    // Foto hanya bisa diupload saat online (file besar tidak realistis disimpan di IndexedDB
    // untuk queue jangka panjang) — kalau offline, event tersimpan dulu tanpa foto,
    // foto bisa ditambahkan menyusul saat sinyal kembali.
    if (foto && navigator.onLine) {
      const path = `${activeOutletId}/${Date.now()}_${foto.name}`;
      const { error: upErr } = await supabase.storage.from('training-proof').upload(path, foto);
      if (!upErr) {
        const { data } = supabase.storage.from('training-proof').getPublicUrl(path);
        fotoUrl = data.publicUrl;
      }
    }

    const payload: TrainingEventType = {
      outlet_id: activeOutletId, tanggal, judul, foto_bukti_url: fotoUrl, input_by: profile.full_name,
    };

    if (navigator.onLine) {
      const { error } = await supabase.from('training_event').insert(payload);
      if (error) await enqueue('training_event', payload);
    } else {
      await enqueue('training_event', payload);
    }

    setSaving(false);
    setToast(foto && !navigator.onLine ? 'Tersimpan tanpa foto (upload foto saat online).' : 'Event tersimpan.');
    setJudul(''); setFoto(null);
    load();
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl tracking-wide uppercase">Training / Event</h1>
        <p className="text-ink-muted text-sm">Catat kegiatan training & bukti foto</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Judul Kegiatan</label>
          <input required value={judul} onChange={(e) => setJudul(e.target.value)} className="input-field" placeholder="Contoh: Refreshment Training Upselling" />
        </div>
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Tanggal</label>
          <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Foto Bukti</label>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            className="input-field file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brand-500 file:text-surface file:text-xs file:font-semibold" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full font-display tracking-wide uppercase">
          {saving ? 'Menyimpan...' : 'Simpan Event'}
        </button>
        {toast && <p className="text-success text-sm text-center">{toast}</p>}
      </form>

      <div className="grid grid-cols-2 gap-3">
        {events.map((ev, i) => (
          <div key={i} className="card p-3">
            {ev.foto_bukti_url && <img src={ev.foto_bukti_url} className="rounded-lg mb-2 w-full h-28 object-cover" alt="" />}
            <div className="text-sm font-medium">{ev.judul}</div>
            <div className="text-ink-dim text-xs">{ev.tanggal}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
