const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://neeawjydtdcubwrklnua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZWF3anlkdGRjdWJ3cmtsbnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDcxODMsImV4cCI6MjA4NDAyMzE4M30._XeWSMSZvTH2Q6Tr7Or8kBaKtkXsV35TfljLfUnZfhA';

const EMAIL = 'testuser@gmail.com';
const PASSWORD = 'test123aja';
const NAME = 'Test User';

const expenseTemplates = [
  { desc: 'Makan siang di warteg', cat: 'Makanan', acc: 'cash', min: 15000, max: 35000 },
  { desc: 'Beli kopi susu', cat: 'Makanan', acc: 'gopay', min: 20000, max: 45000 },
  { desc: 'Makan malam', cat: 'Makanan', acc: 'cash', min: 40000, max: 100000 },
  { desc: 'Beli bahan masak', cat: 'Makanan', acc: 'bri', min: 80000, max: 200000 },
  { desc: 'Jajan pasar', cat: 'Makanan', acc: 'cash', min: 15000, max: 50000 },
  { desc: 'Nasi padang + minum', cat: 'Makanan', acc: 'cash', min: 25000, max: 50000 },
  { desc: 'Bakso + es teh', cat: 'Makanan', acc: 'gopay', min: 20000, max: 35000 },
  { desc: 'Isi bensin', cat: 'Transport', acc: 'cash', min: 50000, max: 150000 },
  { desc: 'Gojek/Grab', cat: 'Transport', acc: 'gopay', min: 15000, max: 50000 },
  { desc: 'Parkir', cat: 'Transport', acc: 'cash', min: 3000, max: 10000 },
  { desc: 'Tol jalan', cat: 'Transport', acc: 'bri', min: 10000, max: 35000 },
  { desc: 'Bensin motor', cat: 'Transport', acc: 'cash', min: 30000, max: 80000 },
  { desc: 'Beli baju online', cat: 'Belanja', acc: 'gopay', min: 100000, max: 400000 },
  { desc: 'Belanja bulanan', cat: 'Belanja', acc: 'bri', min: 150000, max: 350000 },
  { desc: 'Beli skincare', cat: 'Belanja', acc: 'gopay', min: 50000, max: 200000 },
  { desc: 'Beli aksesoris hp', cat: 'Belanja', acc: 'cash', min: 25000, max: 100000 },
  { desc: 'Listrik bulanan', cat: 'Tagihan', acc: 'bri', min: 200000, max: 450000 },
  { desc: 'Bayar PDAM', cat: 'Tagihan', acc: 'bri', min: 50000, max: 120000 },
  { desc: 'Isi pulsa & data', cat: 'Tagihan', acc: 'gopay', min: 30000, max: 100000 },
  { desc: 'Bayar WiFi', cat: 'Tagihan', acc: 'bri', min: 250000, max: 350000 },
  { desc: 'Nonton bioskop', cat: 'Hiburan', acc: 'gopay', min: 35000, max: 60000 },
  { desc: 'Langganan Netflix', cat: 'Hiburan', acc: 'bri', min: 35000, max: 55000 },
  { desc: 'Nongkrong di cafe', cat: 'Hiburan', acc: 'gopay', min: 30000, max: 80000 },
  { desc: 'Game online top-up', cat: 'Hiburan', acc: 'gopay', min: 20000, max: 150000 },
  { desc: 'Beli buku', cat: 'Pendidikan', acc: 'gopay', min: 50000, max: 150000 },
  { desc: 'Kursus online', cat: 'Pendidikan', acc: 'bri', min: 100000, max: 350000 },
  { desc: 'Beli obat di apotek', cat: 'Kesehatan', acc: 'cash', min: 20000, max: 100000 },
  { desc: 'Cek dokter', cat: 'Kesehatan', acc: 'bri', min: 100000, max: 250000 },
  { desc: 'Vitamin & suplemen', cat: 'Kesehatan', acc: 'gopay', min: 50000, max: 150000 },
  { desc: 'Sabun & shampo', cat: 'Rumah Tangga', acc: 'cash', min: 20000, max: 50000 },
  { desc: 'Alat kebersihan', cat: 'Rumah Tangga', acc: 'cash', min: 15000, max: 45000 },
  { desc: 'Service motor', cat: 'Lainnya', acc: 'cash', min: 50000, max: 300000 },
  { desc: 'Beli pulsa listrik', cat: 'Tagihan', acc: 'gopay', min: 50000, max: 200000 },
  { desc: 'Laundry', cat: 'Rumah Tangga', acc: 'cash', min: 15000, max: 40000 },
];

const incomeTemplates = [
  { desc: 'Gaji bulanan', cat: 'Gaji', acc: 'bri', min: 5000000, max: 7000000 },
  { desc: 'Bonus kinerja', cat: 'Gaji', acc: 'bri', min: 500000, max: 1500000 },
  { desc: 'THR', cat: 'Gaji', acc: 'bri', min: 3000000, max: 5000000 },
  { desc: 'Proyek freelance', cat: 'Freelance', acc: 'bri', min: 500000, max: 2000000 },
  { desc: 'Jasa desain', cat: 'Freelance', acc: 'gopay', min: 200000, max: 1000000 },
  { desc: 'Dividen investasi', cat: 'Investasi', acc: 'bri', min: 100000, max: 500000 },
  { desc: 'Bunga tabungan', cat: 'Investasi', acc: 'bri', min: 10000, max: 50000 },
  { desc: 'Hadiah ulang tahun', cat: 'Hadiah', acc: 'gopay', min: 100000, max: 500000 },
  { desc: 'Penjualan barang bekas', cat: 'Lainnya', acc: 'cash', min: 50000, max: 300000 },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Sign in (or sign up if doesn't exist)
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError) {
    console.log('Login gagal, mencoba daftar...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: EMAIL,
      password: PASSWORD,
      options: { data: { name: NAME } },
    });
    if (signUpError) { console.error('Gagal daftar:', signUpError.message); return; }
    authData = signUpData;
    console.log('Register berhasil!');
  } else {
    console.log('Login berhasil!');
  }

  const userId = authData.user.id;
  console.log('User ID:', userId);

  // 2. Get/create profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile || !profile.name) {
    // update or insert profile
    await supabase.from('profiles').upsert({
      id: userId,
      email: EMAIL,
      name: NAME,
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    console.log('Profile created');
  }

  // 3. Get or create categories
  let { data: cats } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},is_default.eq.true`);

  if (!cats || cats.length === 0) {
    console.log('Membuat kategori default...');
    const defaultCats = [
      { user_id: userId, name: 'Makanan', icon: '🍔', color: '#ef4444', type: 'expense', is_default: true },
      { user_id: userId, name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense', is_default: true },
      { user_id: userId, name: 'Belanja', icon: '🛒', color: '#8b5cf6', type: 'expense', is_default: true },
      { user_id: userId, name: 'Tagihan', icon: '📄', color: '#f97316', type: 'expense', is_default: true },
      { user_id: userId, name: 'Hiburan', icon: '🎬', color: '#ec4899', type: 'expense', is_default: true },
      { user_id: userId, name: 'Kesehatan', icon: '🏥', color: '#14b8a6', type: 'expense', is_default: true },
      { user_id: userId, name: 'Pendidikan', icon: '📚', color: '#6366f1', type: 'expense', is_default: true },
      { user_id: userId, name: 'Rumah Tangga', icon: '🏠', color: '#a855f7', type: 'expense', is_default: true },
      { user_id: userId, name: 'Lainnya', icon: '📦', color: '#64748b', type: 'expense', is_default: true },
      { user_id: userId, name: 'Gaji', icon: '💰', color: '#10b981', type: 'income', is_default: true },
      { user_id: userId, name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income', is_default: true },
      { user_id: userId, name: 'Investasi', icon: '📈', color: '#f59e0b', type: 'income', is_default: true },
      { user_id: userId, name: 'Hadiah', icon: '🎁', color: '#ec4899', type: 'income', is_default: true },
    ];
    const { data: newCats, error: catErr } = await supabase
      .from('categories')
      .insert(defaultCats)
      .select();
    if (catErr) { console.error('Gagal buat kategori:', catErr.message); return; }
    cats = newCats;
    console.log(`Created ${newCats.length} categories`);
  }

  const expenseCats = cats.filter(c => c.type === 'expense');
  const incomeCats = cats.filter(c => c.type === 'income');

  function getCatByName(name) {
    return cats.find(c => c.name === name);
  }

  // 4. Get or create financial accounts
  let { data: accounts } = await supabase
    .from('financial_accounts')
    .select('*')
    .eq('user_id', userId);

  let cashAcc = accounts?.find(a => a.name.toLowerCase() === 'cash');
  let briAcc = accounts?.find(a => a.name.toLowerCase() === 'bri');
  let gopayAcc = accounts?.find(a => a.name.toLowerCase() === 'gopay');

  if (!cashAcc) {
    const { data: d } = await supabase.from('financial_accounts').insert({
      user_id: userId, name: 'Cash', type: 'other', is_default: true, balance: 500000
    }).select().single();
    cashAcc = d;
  }
  if (!briAcc) {
    const { data: d } = await supabase.from('financial_accounts').insert({
      user_id: userId, name: 'BRI', type: 'bank', is_default: false, balance: 5000000
    }).select().single();
    briAcc = d;
  }
  if (!gopayAcc) {
    const { data: d } = await supabase.from('financial_accounts').insert({
      user_id: userId, name: 'GoPay', type: 'ewallet', is_default: false, balance: 200000
    }).select().single();
    gopayAcc = d;
  }

  function getAcc(name) {
    if (name === 'cash') return cashAcc.id;
    if (name === 'bri') return briAcc.id;
    if (name === 'gopay') return gopayAcc.id;
    return null;
  }

  // 5. Clear existing transactions for Jan-May 2026
  console.log('Membersihkan data transaksi Jan-Mei 2026...');
  await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .gte('date', '2026-01-01')
    .lte('date', '2026-05-31');

  // 6. Generate transactions
  let totalInserted = 0;

  for (let month = 1; month <= 5; month++) {
    const daysInMonth = getDaysInMonth(2026, month);
    const transactions = [];

    // Salary income (1st-5th)
    const salaryDay = rand(1, Math.min(5, daysInMonth));
    transactions.push({
      type: 'income',
      amount: rand(5500000, 6500000),
      description: 'Gaji bulanan',
      date: formatDate(2026, month, salaryDay),
      category_id: getCatByName('Gaji')?.id,
      account_id: briAcc.id,
    });

    // Extra income (1-3 per month)
    const extraCount = rand(1, 3);
    for (let i = 0; i < extraCount; i++) {
      const tmpl = pick(incomeTemplates.filter(t => t.desc !== 'Gaji bulanan'));
      const day = rand(Math.min(6, daysInMonth), daysInMonth);
      transactions.push({
        type: 'income',
        amount: rand(tmpl.min, tmpl.max),
        description: tmpl.desc,
        date: formatDate(2026, month, day),
        category_id: getCatByName(tmpl.cat)?.id,
        account_id: getAcc(tmpl.acc),
      });
    }

    // Daily expenses
    const expenseCount = rand(Math.min(daysInMonth - 3, 20), Math.min(daysInMonth, 28));
    const usedDays = new Set();
    usedDays.add(salaryDay);

    for (let i = 0; i < expenseCount; i++) {
      let day = rand(1, daysInMonth);
      while (usedDays.has(day)) day = rand(1, daysInMonth);
      usedDays.add(day);

      const countOnDay = rand(1, 3);
      for (let j = 0; j < countOnDay; j++) {
        const tmpl = pick(expenseTemplates);
        transactions.push({
          type: 'expense',
          amount: rand(tmpl.min, tmpl.max),
          description: tmpl.desc,
          date: formatDate(2026, month, day),
          category_id: getCatByName(tmpl.cat)?.id,
          account_id: getAcc(tmpl.acc),
        });
      }
    }

    // Batch insert
    const { error } = await supabase.from('transactions').insert(
      transactions.map(tx => ({ ...tx, user_id: userId, source: 'manual' }))
    );
    if (error) {
      console.error(`Bulan ${month} gagal:`, error.message);
    } else {
      totalInserted += transactions.length;
      console.log(`Bulan ${String(month).padStart(2, '0')}: ${transactions.length} transaksi berhasil`);
    }
  }

  console.log(`\n✅ Selesai! Total ${totalInserted} transaksi berhasil ditambahkan untuk ${EMAIL}.`);
}

main().catch(console.error);
