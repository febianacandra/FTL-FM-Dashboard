-- ============================================================
-- FTL FITNESS MANAGER — SUPABASE SCHEMA
-- Jalankan file ini di: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1) OUTLETS ---------------------------------------------------
create table outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- "FTL Pasir Koja"
  slug text unique not null,        -- "pasko"
  sheet_url text,                   -- link Google Sheet sumber data outlet ini
  apps_script_url text,             -- URL Web App Apps Script (jembatan sync)
  created_at timestamptz default now()
);

insert into outlets (name, slug) values
  ('FTL Pasir Koja', 'pasko'),
  ('FTL Soekarno Hatta', 'soetta'),
  ('FTL Dago', 'dago'),
  ('FTL KBP', 'kbp'),
  ('FTL Merdeka', 'merdeka'),
  ('FTL A. Yani', 'ayani'),
  ('FTL Sukajadi', 'sukajadi'),
  ('FTL Stride Banceuy', 'stride-banceuy');

-- 2) PROFILES (role & outlet mapping) --------------------------
-- id di sini SAMA DENGAN auth.users.id (Supabase Auth)
create type user_role as enum ('admin', 'area_manager', 'fitness_manager', 'fm_hybrid');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null,
  outlet_ids uuid[] not null default '{}',  -- outlet yang boleh diakses (admin: diabaikan, semua outlet)
  created_at timestamptz default now()
);

-- 3) DAILY COMMIT -----------------------------------------------
create table daily_commit (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id) not null,
  trainer_name text not null,
  tanggal date not null,
  commit_reguler int not null default 0,
  actual_reguler int not null default 0,
  commit_bundling int not null default 0,
  actual_bundling int not null default 0,
  input_by text,
  synced_to_sheet boolean default false,
  created_at timestamptz default now()
);
create index idx_daily_commit_outlet_date on daily_commit(outlet_id, tanggal);

-- 4) MEMBER BARU --------------------------------------------------
create type sumber_member as enum ('NJM', 'Existing', 'Upgrade');
create type paket_member as enum ('Only Membership', 'PT Bundling', 'Pilates', 'WP');
create type status_followup as enum ('Belum', 'Dihubungi', 'Closing');
create type closing_type as enum ('GO', 'RA', 'Bundling', 'WP', 'Reguler');

create table member_baru (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id) not null,
  nama text not null,
  sumber sumber_member not null,
  paket paket_member not null,
  trainer_assigned text not null,
  status status_followup not null default 'Belum',
  closing_type closing_type,
  input_by text,
  synced_to_sheet boolean default false,
  created_at timestamptz default now()
);
create index idx_member_baru_outlet on member_baru(outlet_id, status);

-- 5) TRAINING EVENT (+ foto bukti) --------------------------------
create table training_event (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id), -- null = event untuk semua outlet
  tanggal date not null,
  judul text not null,
  foto_bukti_url text,
  input_by text,
  created_at timestamptz default now()
);

-- 6) STORAGE bucket untuk foto bukti training ----------------------
insert into storage.buckets (id, name, public) values ('training-proof', 'training-proof', true);

-- ============================================================
-- ROW LEVEL SECURITY — inti dari pembatasan akses per role/outlet
-- ============================================================
alter table profiles enable row level security;
alter table outlets enable row level security;
alter table daily_commit enable row level security;
alter table member_baru enable row level security;
alter table training_event enable row level security;

-- Semua user login boleh baca profile & daftar outlet
create policy "profiles: user baca profile sendiri" on profiles for select using (auth.uid() = id);
create policy "outlets: semua user login boleh baca" on outlets for select using (auth.role() = 'authenticated');

-- Helper: fungsi cek apakah user boleh akses outlet tertentu
create or replace function can_access_outlet(target_outlet uuid)
returns boolean language sql stable as $$
  select case
    when (select role from profiles where id = auth.uid()) = 'admin' then true
    else target_outlet = any((select outlet_ids from profiles where id = auth.uid()))
  end;
$$;

-- Daily Commit: baca & tulis hanya untuk outlet yang diizinkan
create policy "daily_commit: akses sesuai outlet" on daily_commit
  for all using (can_access_outlet(outlet_id)) with check (can_access_outlet(outlet_id));

-- Member Baru: sama
create policy "member_baru: akses sesuai outlet" on member_baru
  for all using (can_access_outlet(outlet_id)) with check (can_access_outlet(outlet_id));

-- Training Event: outlet spesifik ATAU event global (outlet_id null, semua boleh baca)
create policy "training_event: akses sesuai outlet atau global" on training_event
  for all using (outlet_id is null or can_access_outlet(outlet_id))
  with check (outlet_id is null or can_access_outlet(outlet_id));

-- ============================================================
-- CATATAN SETUP USER (dilakukan manual oleh Admin lewat Dashboard Supabase
-- atau lewat SQL Editor, karena Supabase Auth tidak bisa insert user via SQL biasa):
--
-- 1. Buka Authentication → Users → Add User, buatkan akun untuk:
--    - febianacandra@gmail.com   (Admin)
--    - Erwinlaksono0512@yahoo.co.id (Area Manager)
--    - + 1 akun per Fitness Manager outlet (8 FM, salah satunya Hybrid)
--
-- 2. Setelah akun dibuat, catat masing-masing "User UID"-nya, lalu jalankan:
--
-- insert into profiles (id, full_name, email, role, outlet_ids) values
--   ('<uid-admin>', 'Febiana Candra', 'febianacandra@gmail.com', 'admin', '{}'),
--   ('<uid-am>', 'Erwin Laksono', 'Erwinlaksono0512@yahoo.co.id', 'area_manager',
--     (select array_agg(id) from outlets)),
--   ('<uid-fm-hybrid>', 'FM Hybrid Pasko-Soetta', 'email-nya', 'fm_hybrid',
--     (select array_agg(id) from outlets where slug in ('pasko','soetta'))),
--   ('<uid-fm-dago>', 'FM Dago', 'email-nya', 'fitness_manager',
--     (select array_agg(id) from outlets where slug = 'dago'));
--   -- ...ulangi untuk FM outlet lainnya (kbp, merdeka, ayani, sukajadi, stride-banceuy)
-- ============================================================
