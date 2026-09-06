import { get, set, del, keys } from 'idb-keyval';
import { supabase } from './supabase';

/**
 * OFFLINE QUEUE
 * -------------
 * Setiap kali FM submit form (Daily Commit, Member Baru, dll) saat sinyal jelek,
 * data disimpan dulu ke IndexedDB browser (bukan hilang / gagal diam-diam).
 * Begitu koneksi kembali (event 'online' atau saat app dibuka lagi), semua
 * antrian tertunda otomatis dikirim ke Supabase, lalu Supabase memicu sinkron
 * dua arah ke Google Sheet outlet terkait via Edge Function.
 */

export type QueueTable = 'daily_commit' | 'member_baru' | 'training_event';

interface QueueItem {
  id: string;           // id lokal unik (timestamp + random)
  table: QueueTable;
  payload: object;
  created_at: string;
  attempts: number;
}

const QUEUE_PREFIX = 'ftlfm_queue_';

export async function enqueue(table: QueueTable, payload: object) {
  const id = `${QUEUE_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueueItem = { id, table, payload, created_at: new Date().toISOString(), attempts: 0 };
  await set(id, item);
  // Coba langsung sync kalau kebetulan sedang online
  if (navigator.onLine) flushQueue();
  return id;
}

export async function getPendingCount(): Promise<number> {
  const all = await keys();
  return all.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
}

export async function flushQueue(): Promise<{ success: number; failed: number }> {
  if (!navigator.onLine) return { success: 0, failed: 0 };
  const all = await keys();
  const queueKeys = all.filter((k) => String(k).startsWith(QUEUE_PREFIX));
  let success = 0, failed = 0;

  for (const key of queueKeys) {
    const item = (await get(key)) as QueueItem | undefined;
    if (!item) continue;
    try {
      const { error } = await supabase.from(item.table).insert(item.payload);
      if (error) throw error;
      await del(key);
      success++;
      // Panggil Edge Function untuk push balik ke Google Sheet (fire-and-forget,
      // tidak memblokir UI — kalau gagal, cron sync berkala di sisi server yang menyusul)
      supabase.functions.invoke('sheets-sync', {
        body: { action: 'push', table: item.table, record: item.payload },
      }).catch(() => { /* dibiarkan — akan tersinkron di cycle berikutnya */ });
    } catch (err) {
      item.attempts += 1;
      await set(key, item);
      failed++;
      if (item.attempts > 20) {
        // Gagal terus-menerus (>20x) — kemungkinan data tidak valid, jangan diam-diam hilang:
        console.error('[FTL FM] Item antrian gagal berulang kali, cek manual:', item);
      }
    }
  }
  return { success, failed };
}

// Auto-flush saat koneksi kembali
window.addEventListener('online', () => { flushQueue(); });

// Auto-flush tiap kali app dibuka / kembali ke foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') flushQueue();
});
