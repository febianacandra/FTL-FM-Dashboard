import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, MemberBaru } from '../lib/supabase';
import { enqueue } from '../lib/offlineQueue';

const STATUS_FLOW: MemberBaru['status'][] = ['Belum', 'Dihubungi', 'Closing'];
const CLOSING_TYPES: NonNullable<MemberBaru['closing_type']>[] = ['GO', 'RA', 'Bundling', 'WP', 'Reguler'];

export default function FollowUpStatus() {
  const { activeOutletId, profile } = useAuth();
  const [members, setMembers] = useState<MemberBaru[]>([]);
  const [pickingClosing, setPickingClosing] = useState<string | null>(null);

  async function load() {
    if (!activeOutletId) return;
    const { data } = await supabase
      .from('member_baru').select('*').eq('outlet_id', activeOutletId)
      .neq('status', 'Closing').order('created_at', { ascending: false });
    setMembers((data ?? []) as MemberBaru[]);
  }
  useEffect(() => { load(); }, [activeOutletId]);

  async function advanceStatus(m: MemberBaru, closingType?: MemberBaru['closing_type']) {
    const currentIdx = STATUS_FLOW.indexOf(m.status);
    const nextStatus = STATUS_FLOW[Math.min(currentIdx + 1, STATUS_FLOW.length - 1)];
    const update = { status: nextStatus, closing_type: closingType ?? m.closing_type, input_by: profile?.full_name };

    if (navigator.onLine) {
      await supabase.from('member_baru').update(update).eq('id', m.id);
    } else {
      await enqueue('member_baru', { ...m, ...update, _update_id: m.id });
    }
    setPickingClosing(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl tracking-wide uppercase">Follow-Up Status</h1>
        <p className="text-ink-muted text-sm">Geser status member: Belum → Dihubungi → Closing</p>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium">{m.nama}</div>
                <div className="text-ink-dim text-xs">{m.trainer_assigned} · {m.paket}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${
                m.status === 'Belum' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
              }`}>{m.status}</span>
            </div>

            {pickingClosing === m.id ? (
              <div className="flex flex-wrap gap-2">
                {CLOSING_TYPES.map((ct) => (
                  <button key={ct} onClick={() => advanceStatus(m, ct)}
                    className="text-xs px-3 py-1.5 rounded-full bg-brand-500 text-surface font-semibold">
                    {ct}
                  </button>
                ))}
                <button onClick={() => setPickingClosing(null)} className="text-xs px-3 py-1.5 rounded-full text-ink-dim">Batal</button>
              </div>
            ) : (
              <button
                onClick={() => m.status === 'Dihubungi' ? setPickingClosing(m.id!) : advanceStatus(m)}
                className="btn-primary w-full text-sm py-2"
              >
                {m.status === 'Belum' ? 'Tandai Sudah Dihubungi' : 'Tandai Closing →'}
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && <p className="text-ink-dim text-sm">Semua member sudah closing 🎉</p>}
      </div>
    </div>
  );
}
