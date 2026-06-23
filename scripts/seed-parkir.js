const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://neeawjydtdcubwrklnua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZWF3anlkdGRjdWJ3cmtsbnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDcxODMsImV4cCI6MjA4NDAyMzE4M30._XeWSMSZvTH2Q6Tr7Or8kBaKtkXsV35TfljLfUnZfhA';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'karsafinid@gmail.com',
    password: '@Amir161998',
  });
  if (authError) { console.error('Login gagal:', authError.message); return; }
  const userId = authData.user.id;
  console.log('Login berhasil, user ID:', userId);

  // Get personal workspace
  // We will search for a workspace where the user is a member and the workspace name is "Catatan Pribadi" or type is "personal"
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .or("name.ilike.%pribadi%,type.eq.personal");

  if (wsError || !workspaces || workspaces.length === 0) {
    console.error('Gagal mendapatkan workspace pribadi:', wsError);
    return;
  }
  
  // Find the exact one
  let personalWorkspace = workspaces.find(w => w.name.toLowerCase().includes('pribadi')) || workspaces[0];
  const workspaceId = personalWorkspace.id;
  console.log(`Ditemukan workspace "${personalWorkspace.name}" dengan ID:`, workspaceId);

  // Update transactions that we seeded earlier
  const { data, error } = await supabase
    .from('transactions')
    .update({ workspace_id: workspaceId })
    .eq('user_id', userId)
    .eq('description', '[tags: Harian] Biaya Parkir Motor');

  if (error) {
    console.error('Gagal memindah transaksi:', error.message);
  } else {
    console.log(`✅ Selesai! Transaksi parkir berhasil dipindahkan ke workspace "${personalWorkspace.name}"`);
  }
}

main().catch(console.error);
