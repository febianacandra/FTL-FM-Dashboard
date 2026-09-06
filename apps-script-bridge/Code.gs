/**
 * FTL FM — APPS SCRIPT BRIDGE
 * ---------------------------
 * Deploy file ini sebagai Web App di SETIAP Google Sheet dari 8 outlet.
 * Ini adalah "jembatan" yang dipanggil oleh Supabase Edge Function untuk:
 *  - PULL: ambil data terbaru dari Sheet (misal PERFORMANCE 3 BULAN, MEMBER JOIN)
 *  - PUSH: menuliskan balik data baru dari app (Daily Commit, Member Baru) ke Sheet
 *
 * CARA DEPLOY (per outlet, ulangi 8x):
 *  1. Buka Google Sheet outlet → Extensions → Apps Script
 *  2. Hapus isi default, tempel kode ini
 *  3. Deploy → New deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone (dilindungi oleh SECRET_KEY di bawah, bukan publik-terbuka)
 *  4. Salin URL Web App yang muncul → simpan ke kolom `apps_script_url`
 *     di tabel `outlets` (Supabase) untuk outlet yang bersangkutan
 */

const SECRET_KEY = 'GANTI_DENGAN_KUNCI_RAHASIA_ANDA'; // harus sama dengan yang dipakai Edge Function

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.key !== SECRET_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (body.action === 'push') {
    return handlePush(ss, body);
  }
  if (body.action === 'pull') {
    return handlePull(ss, body);
  }
  return jsonResponse({ error: 'Unknown action' }, 400);
}

function handlePush(ss, body) {
  // Tulis baris baru ke tab "APP SYNC LOG" — tab arsip semua data masuk dari app,
  // supaya tim yang biasa kerja di Sheet tetap bisa lihat histori tanpa perlu buka app.
  let sheet = ss.getSheetByName('APP SYNC LOG');
  if (!sheet) {
    sheet = ss.insertSheet('APP SYNC LOG');
    sheet.appendRow(['Waktu', 'Tabel', 'Data (JSON)']);
  }
  sheet.appendRow([new Date(), body.table, JSON.stringify(body.record)]);

  // Tambahan opsional: kalau ingin field spesifik ditulis ke tab yang sudah ada
  // (misal DAILY COMMIT), tambahkan mapping di sini sesuai layout kolom Sheet asli.
  // Contoh kerangka:
  // if (body.table === 'daily_commit') {
  //   const target = ss.getSheetByName('DAILY COMMIT');
  //   target.appendRow([body.record.tanggal, body.record.trainer_name, body.record.actual_reguler, ...]);
  // }

  return jsonResponse({ success: true });
}

function handlePull(ss, body) {
  const sheetName = body.sheet; // misal "MEMBER JOIN BULAN INI"
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ error: 'Sheet tidak ditemukan: ' + sheetName }, 404);

  const values = sheet.getDataRange().getValues();
  return jsonResponse({ success: true, rows: values });
}

function jsonResponse(obj, status) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
