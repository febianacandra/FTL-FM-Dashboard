// SUPABASE EDGE FUNCTION: sheets-sync
// -------------------------------------
// Deploy: supabase functions deploy sheets-sync
// Dipanggil dari app (lihat src/lib/offlineQueue.ts) tiap kali ada data baru
// yang perlu di-push balik ke Google Sheet outlet terkait.
//
// Set secret terlebih dahulu:
//   supabase secrets set SHEETS_BRIDGE_SECRET=GANTI_DENGAN_KUNCI_RAHASIA_ANDA

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BRIDGE_SECRET = Deno.env.get('SHEETS_BRIDGE_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const { action, table, record } = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Cari apps_script_url outlet yang bersangkutan
    const { data: outlet, error } = await supabase
      .from('outlets')
      .select('apps_script_url')
      .eq('id', record.outlet_id)
      .single();

    if (error || !outlet?.apps_script_url) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Outlet belum punya apps_script_url' }), { status: 200 });
    }

    const res = await fetch(outlet.apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: BRIDGE_SECRET, action, table, record }),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
