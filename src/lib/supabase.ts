import { createClient } from '@supabase/supabase-js';

// Isi 2 nilai ini setelah Anda membuat project Supabase (Settings → API).
// Simpan sebagai environment variable saat deploy (lihat README.md), jangan hardcode di produksi.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[FTL FM] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. ' +
    'Buat file .env berdasarkan .env.example lalu isi kredensial Supabase Anda.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ---- Tipe data inti (cermin dari supabase/schema.sql) ----
export type Role = 'admin' | 'area_manager' | 'fitness_manager' | 'fm_hybrid';

export interface Outlet {
  id: string;
  name: string;          // "FTL Pasir Koja"
  slug: string;          // "pasko"
  sheet_url: string | null;
}

export interface Profile {
  id: string;            // = auth.users.id
  full_name: string;
  email: string;
  role: Role;
  outlet_ids: string[];  // outlet yang boleh diakses user ini
}

export interface Trainer {
  id?: string;
  outlet_id: string;
  name: string;
}

export interface DailyCommit {
  id?: string;
  outlet_id: string;
  trainer_name: string;
  tanggal: string;          // YYYY-MM-DD
  commit_reguler: number;
  actual_reguler: number;
  commit_bundling: number;
  actual_bundling: number;
  input_by: string;
  synced_to_sheet?: boolean;
  created_at?: string;
}

export interface MemberBaru {
  id?: string;
  outlet_id: string;
  nama: string;
  sumber: 'NJM' | 'Existing' | 'Upgrade';
  paket: 'Only Membership' | 'PT Bundling' | 'Pilates' | 'WP';
  trainer_assigned: string;
  status: 'Belum' | 'Dihubungi' | 'Closing';
  closing_type: 'GO' | 'RA' | 'Bundling' | 'WP' | 'Reguler' | null;
  input_by: string;
  created_at?: string;
}

export interface TrainingEvent {
  id?: string;
  outlet_id: string | null; // null = event untuk semua outlet
  tanggal: string;
  judul: string;
  foto_bukti_url: string | null;
  input_by: string;
  created_at?: string;
}
