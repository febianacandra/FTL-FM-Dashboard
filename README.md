# FTL Fitness Manager App

PWA (installable di Android, iOS, Windows, Mac lewat browser) untuk input & monitoring
operasional harian 8 outlet FTL Gym. Offline-first, role-based, sinkron dua arah ke Google Sheets.

## Yang sudah dibangun di v1 ini

- ✅ Login (Email + Password) via Supabase Auth
- ✅ Role & akses per outlet: Admin (semua outlet), Area Manager (semua/beberapa outlet),
  Fitness Manager (1 outlet), FM Hybrid (2 outlet) — diatur di tabel `profiles`, bukan hardcode
- ✅ Dashboard Ringkasan otomatis (KPI hari ini + bulan ini)
- ✅ 4 modul input: Daily Commit (Reguler & Bundling), Member Baru, Follow-Up Status, Training/Event + foto
- ✅ Offline queue: input tersimpan di HP walau tanpa sinyal, auto-sync saat online lagi
- ✅ Tema visual pakai brand FTL (biru `#27A8DF`) + ikon dari logo Anda
- ✅ Kerangka sinkron dua arah ke Google Sheets (Edge Function + Apps Script bridge)

## Yang BELUM ada / perlu Anda putuskan berikutnya

- Mapping kolom detail antara tabel Supabase ↔ kolom asli tiap Sheet outlet (saya baru buat
  kerangkanya di `apps-script-bridge/Code.gs` — perlu disesuaikan per layout Sheet masing-masing outlet,
  karena 6 outlet baru belum saya lihat sheet aslinya)
- Halaman khusus Admin untuk kelola user/role (untuk sekarang, kelola lewat Supabase Dashboard langsung)
- Push notification (kalau nanti dibutuhkan)
- Submit ke Play Store/App Store (opsional, PWA sudah bisa "Add to Home Screen" tanpa ini)

---

## LANGKAH DEPLOY

### 1. Setup Supabase (± 10 menit)

1. Daftar gratis di [supabase.com](https://supabase.com) → New Project
2. Buka **SQL Editor** → tempel isi `supabase/schema.sql` → Run
   (ini otomatis membuat 8 outlet, semua tabel, dan aturan keamanan role-based)
3. Buka **Authentication → Users → Add User**, buat akun untuk:
   - Admin: `febianacandra@gmail.com`
   - Area Manager: `Erwinlaksono0512@yahoo.co.id`
   - 7 akun Fitness Manager (1 orang jadi Hybrid Pasko+Soetta, jadi total 7 akun untuk 8 outlet)
4. Setelah tiap akun dibuat, salin **User UID**-nya, lalu jalankan INSERT ke tabel `profiles`
   sesuai contoh di bagian bawah `schema.sql`
5. Buka **Project Settings → API** → salin `Project URL` dan `anon public key`

### 2. Setup project di komputer Anda

```bash
# ekstrak file ini, lalu:
cd ftl-fm-app
npm install
cp .env.example .env
# buka .env, isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY dari langkah 1
npm run dev
# buka http://localhost:5173 untuk coba di laptop
```

### 3. Deploy ke internet (gratis, via Vercel)

```bash
npm install -g vercel
vercel
# ikuti instruksi, lalu di Vercel Dashboard → Settings → Environment Variables,
# tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY yang sama seperti di .env
vercel --prod
```

Setelah live, Anda dapat URL seperti `https://ftl-fm-app.vercel.app` — ini yang dibuka
tim di HP/laptop, lalu di-"Add to Home Screen" supaya jadi ikon app.

### 4. Setup sinkron dua arah ke Google Sheets (per outlet, ulangi 8x)

1. Buka Google Sheet outlet → **Extensions → Apps Script**
2. Tempel isi `apps-script-bridge/Code.gs`, ganti `SECRET_KEY` dengan kunci rahasia Anda sendiri
3. **Deploy → New deployment → Web App** (Execute as: Me, Access: Anyone) → salin URL-nya
4. Di Supabase, update kolom `apps_script_url` outlet tersebut:
   ```sql
   update outlets set apps_script_url = 'URL_DARI_LANGKAH_3', sheet_url = 'LINK_SHEET_OUTLET'
   where slug = 'pasko'; -- ganti sesuai outlet
   ```
5. Deploy Edge Function: `supabase functions deploy sheets-sync`, lalu set secret:
   ```bash
   supabase secrets set SHEETS_BRIDGE_SECRET=KUNCI_RAHASIA_YANG_SAMA_DI_LANGKAH_2
   ```

### 5. Install sebagai "app" di HP/Laptop

- **Android (Chrome)**: buka URL → menu titik tiga → "Add to Home screen" / "Install app"
- **iOS (Safari)**: buka URL → tombol Share → "Add to Home Screen"
- **Windows/Mac (Chrome/Edge)**: buka URL → ikon install di address bar → "Install"

---

## Struktur Folder

```
src/
  lib/supabase.ts        ← koneksi & tipe data
  lib/offlineQueue.ts     ← sistem antrian offline
  contexts/AuthContext.tsx ← login, role, outlet aktif
  components/Layout.tsx    ← navigasi + indikator online/offline
  pages/
    Login.tsx
    Dashboard.tsx          ← Ringkasan (KPI otomatis)
    DailyCommitInput.tsx   ← Modul 1
    MemberBaruInput.tsx    ← Modul 2
    FollowUpStatus.tsx     ← Modul 3
    TrainingEvent.tsx      ← Modul 4 (+ upload foto)
supabase/
  schema.sql               ← jalankan sekali di Supabase SQL Editor
  functions/sheets-sync/   ← Edge Function penghubung ke Apps Script
apps-script-bridge/
  Code.gs                  ← deploy ke SETIAP Sheet outlet (8x)
```

## Kalau butuh saya lanjutkan

- Sambungkan mapping kolom detail per outlet begitu 6 Sheet outlet baru sudah bisa saya lihat
- Halaman kelola user untuk Admin (tanpa perlu buka Supabase Dashboard)
- Bangun Ringkasan versi Admin/Area Manager (agregat semua outlet dalam satu layar)
