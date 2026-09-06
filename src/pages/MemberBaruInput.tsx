import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, MemberBaru } from '../lib/supabase';
import { enqueue } from '../lib/offlineQueue';

const SUMBER_OPTIONS = ['NJM', 'Existing', 'Upgrade'] as const;
const PAKET_OPTIONS = ['Only Membership', 'PT Bundling', 'Pilates', 'WP'] as const;

export default function MemberBaruInput() {
  const { activeOutletId, profile } = useAuth();
  const [nama, setNama] = useState('');
  const [sumber, setSumber] = useState<typeof SUMBER_OPTIONS[number]>('NJM');
  const [paket, setPaket] = useState<typeof PAKET_OPTIONS[number]>('Only Membership');
  const [trainer, setTrainer] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [list, setList] = useState<MemberBaru[]>([]);

  async function loadList() {
    if (!activeOutletId) return;
    const { data } = await supabase
      .from('member_baru').select('*').eq('outlet_id', activeOutletId)
      .order('created_at', { ascending: false }).limit(20);
    setList((data ?? []) as MemberBaru[]);
  }
  useEffect(() => { loadList(); }, [activeOutletId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOutletId || !profile) return;
    setSaving(true);
    const payload: MemberBaru = {
      outlet_id: activeOutletId, nama, sumber, paket,
      trainer_assigned: trainer, status: 'Belum', closing_type: null,
      input_by: profile.full_name,
    };
    if (navigator.onLine) {
      const { error } = await supabase.from('member_baru').insert(payload);
      if (error) await enqueue('member_baru', payload);
    } else {
      await enqueue('member_baru', payload);
    }
    setSaving(false);
    setToast(navigator.onLine ? 'Member baru tersimpan.' : 'Tersimpan offline — akan sync otomatis.');
    setNama(''); setTrainer('');
    loadList();
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl tracking-wide uppercase">Member Baru</h1>
        <p className="text-ink-muted text-sm">Catat member join & assign ke trainer</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Nama Member</label>
          <input required value={nama} onChange={(e) => setNama(e.target.value)} className="input-field" placeholder="Nama lengkap" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Sumber</label>
            <select className="input-field" value={sumber} onChange={(e) => setSumber(e.target.value as typeof sumber)}>
              {SUMBER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Paket</label>
            <select className="input-field" value={paket} onChange={(e) => setPaket(e.target.value as typeof paket)}>
              {PAKET_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Assign ke Trainer</label>
          <input required value={trainer} onChange={(e) => setTrainer(e.target.value)} className="input-field" placeholder="Contoh: PT1 - Rizkia Agung" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full font-display tracking-wide uppercase">
          {saving ? 'Menyimpan...' : 'Simpan Member Baru'}
        </button>
        {toast && <p className="text-success text-sm text-center">{toast}</p>}
      </form>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">Member Terbaru</div>
        <div className="space-y-2">
          {list.map((m, i) => (
            <div key={i} className="card p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{m.nama}</div>
                <div className="text-ink-dim text-xs">{m.sumber} · {m.paket} · {m.trainer_assigned}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-surface-hi text-ink-muted">{m.status}</span>
            </div>
          ))}
          {list.length === 0 && <p className="text-ink-dim text-sm">Belum ada member.</p>}
        </div>
      </div>
    </div>
  );
}
