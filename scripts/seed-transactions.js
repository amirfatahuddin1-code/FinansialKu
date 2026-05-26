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

  // Get categories
  const { data: cats, error: catError } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},is_default.eq.true`);
  if (catError) { console.error('Gagal ambil kategori:', catError.message); return; }
  console.log(`Ditemukan ${cats.length} kategori`);

  const expenseCats = cats.filter(c => c.type === 'expense');
  const incomeCats = cats.filter(c => c.type === 'income');

  // Get or create financial accounts
  const { data: accounts } = await supabase.from('financial_accounts').select('*').eq('user_id', userId);
  let cashAccount = accounts?.find(a => a.name.toLowerCase() === 'cash');
  let briAccount = accounts?.find(a => a.name.toLowerCase() === 'bri');
  let gopayAccount = accounts?.find(a => a.name.toLowerCase() === 'gopay');

  if (!cashAccount) {
    const { data } = await supabase.from('financial_accounts').insert({ user_id: userId, name: 'Cash', type: 'other', is_default: true }).select().single();
    cashAccount = data;
  }
  if (!briAccount) {
    const { data } = await supabase.from('financial_accounts').insert({ user_id: userId, name: 'BRI', type: 'bank', is_default: false }).select().single();
    briAccount = data;
  }
  if (!gopayAccount) {
    const { data } = await supabase.from('financial_accounts').insert({ user_id: userId, name: 'GoPay', type: 'ewallet', is_default: false }).select().single();
    gopayAccount = data;
  }

  const expenseDesc = [
    { desc: 'Makan siang di warteg', cat: 'Makanan', acc: 'cash', min: 15000, max: 35000 },
    { desc: 'Beli kopi di kafe', cat: 'Makanan', acc: 'gopay', min: 25000, max: 50000 },
    { desc: 'Makan malam restoran', cat: 'Makanan', acc: 'bri', min: 50000, max: 150000 },
    { desc: 'Pizza delivery', cat: 'Makanan', acc: 'gopay', min: 60000, max: 120000 },
    { desc: 'Beli bahan makanan di supermarket', cat: 'Makanan', acc: 'bri', min: 100000, max: 300000 },
    { desc: 'Jajan pasar tradisional', cat: 'Makanan', acc: 'cash', min: 20000, max: 80000 },
    { desc: 'Isi bensin kendaraan', cat: 'Transport', acc: 'cash', min: 50000, max: 200000 },
    { desc: 'Naik taksi online', cat: 'Transport', acc: 'gopay', min: 15000, max: 60000 },
    { desc: 'Parkir kendaraan', cat: 'Transport', acc: 'cash', min: 3000, max: 10000 },
    { desc: 'Tol jalan', cat: 'Transport', acc: 'bri', min: 10000, max: 40000 },
    { desc: 'Beli baju di online shop', cat: 'Belanja', acc: 'gopay', min: 100000, max: 500000 },
    { desc: 'Belanja bulanan di minimarket', cat: 'Belanja', acc: 'bri', min: 150000, max: 400000 },
    { desc: 'Beli sepatu', cat: 'Belanja', acc: 'bri', min: 200000, max: 800000 },
    { desc: 'Beli aksesoris', cat: 'Belanja', acc: 'cash', min: 25000, max: 100000 },
    { desc: 'Listrik bulanan', cat: 'Tagihan', acc: 'bri', min: 200000, max: 500000 },
    { desc: 'Bayar PDAM', cat: 'Tagihan', acc: 'bri', min: 50000, max: 150000 },
    { desc: 'Isi pulsa', cat: 'Tagihan', acc: 'gopay', min: 20000, max: 100000 },
    { desc: 'Bayar internet bulanan', cat: 'Tagihan', acc: 'bri', min: 250000, max: 400000 },
    { desc: 'Nonton bioskop', cat: 'Hiburan', acc: 'gopay', min: 35000, max: 70000 },
    { desc: 'Langganan streaming', cat: 'Hiburan', acc: 'bri', min: 35000, max: 55000 },
    { desc: 'Beli buku', cat: 'Pendidikan', acc: 'gopay', min: 50000, max: 200000 },
    { desc: 'Kursus online', cat: 'Pendidikan', acc: 'bri', min: 150000, max: 500000 },
    { desc: 'Beli obat di apotek', cat: 'Kesehatan', acc: 'cash', min: 20000, max: 150000 },
    { desc: 'Cek kesehatan klinik', cat: 'Kesehatan', acc: 'bri', min: 100000, max: 300000 },
    { desc: 'Sabun dan shampo', cat: 'Rumah Tangga', acc: 'cash', min: 20000, max: 60000 },
    { desc: 'Alat kebersihan rumah', cat: 'Rumah Tangga', acc: 'cash', min: 15000, max: 50000 },
    { desc: 'Service kendaraan', cat: 'Lainnya', acc: 'cash', min: 100000, max: 500000 },
  ];

  const incomeDesc = [
    { desc: 'Gaji bulanan', cat: 'Gaji', acc: 'bri', min: 7000000, max: 9000000 },
    { desc: 'Bonus kinerja', cat: 'Gaji', acc: 'bri', min: 500000, max: 2000000 },
    { desc: 'THR', cat: 'Gaji', acc: 'bri', min: 3000000, max: 5000000 },
    { desc: 'Proyek freelance', cat: 'Freelance', acc: 'bri', min: 500000, max: 3000000 },
    { desc: 'Jasa desain', cat: 'Freelance', acc: 'gopay', min: 200000, max: 1000000 },
    { desc: 'Tulisan lepas', cat: 'Freelance', acc: 'bri', min: 100000, max: 500000 },
    { desc: 'Dividen investasi', cat: 'Investasi', acc: 'bri', min: 100000, max: 500000 },
    { desc: 'Bunga tabungan', cat: 'Investasi', acc: 'bri', min: 10000, max: 50000 },
    { desc: 'Hadiah ulang tahun', cat: 'Hadiah', acc: 'gopay', min: 100000, max: 500000 },
    { desc: 'Bonus dari keluarga', cat: 'Hadiah', acc: 'cash', min: 100000, max: 300000 },
    { desc: 'Penjualan barang bekas', cat: 'Lainnya', acc: 'cash', min: 50000, max: 500000 },
  ];

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getCatByName(cats, name) {
    return cats.find(c => c.name === name);
  }

  function getAcc(name) {
    if (name === 'cash') return cashAccount?.id;
    if (name === 'bri') return briAccount?.id;
    if (name === 'gopay') return gopayAccount?.id;
    return null;
  }

  let totalInserted = 0;

  const today = new Date('2026-05-23');
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  for (let month = 1; month <= currentMonth; month++) {
    const isCurrentMonth = month === currentMonth;
    const daysInMonth = isCurrentMonth ? currentDay : getDaysInMonth(2026, month);
    const transactions = [];

    // Garansi: gaji masuk tiap bulan (between 1st-5th)
    const salaryDay = rand(1, Math.min(5, daysInMonth));
    transactions.push({
      type: 'income',
      amount: rand(7500000, 8500000),
      description: 'Gaji bulanan',
      date: formatDate(2026, month, salaryDay),
      category_id: getCatByName(incomeCats, 'Gaji')?.id,
      account_id: briAccount?.id,
    });

    // Tambahan income variatif
    const extraIncomeCount = rand(1, 3);
    for (let i = 0; i < extraIncomeCount; i++) {
      const tmpl = pick(incomeDesc.filter(d => d.desc !== 'Gaji bulanan'));
      const day = rand(Math.min(6, daysInMonth), daysInMonth);
      transactions.push({
        type: 'income',
        amount: rand(tmpl.min, tmpl.max),
        description: tmpl.desc,
        date: formatDate(2026, month, day),
        category_id: getCatByName(incomeCats, tmpl.cat)?.id,
        account_id: getAcc(tmpl.acc),
      });
    }

    // Expense harian bervariasi
    const expenseCount = rand(daysInMonth - 5, daysInMonth);
    const usedDays = new Set();
    usedDays.add(salaryDay);

    for (let i = 0; i < expenseCount; i++) {
      let day = rand(1, daysInMonth);
      while (usedDays.has(day)) day = rand(1, daysInMonth);
      usedDays.add(day);

      const tmpl = pick(expenseDesc);
      const countOnDay = rand(1, 3);
      for (let j = 0; j < countOnDay; j++) {
        const subTmpl = pick(expenseDesc);
        transactions.push({
          type: 'expense',
          amount: rand(subTmpl.min, subTmpl.max),
          description: `${subTmpl.desc} (${month}/${day})`,
          date: formatDate(2026, month, day),
          category_id: getCatByName(expenseCats, subTmpl.cat)?.id,
          account_id: getAcc(subTmpl.acc),
        });
      }
    }

    // Batch insert per bulan
    const { error } = await supabase.from('transactions').insert(
      transactions.map(tx => ({ ...tx, user_id: userId }))
    );
    if (error) {
      console.error(`Bulan ${month} gagal:`, error.message);
    } else {
      totalInserted += transactions.length;
      console.log(`Bulan ${month}: ${transactions.length} transaksi berhasil`);
    }
  }

  console.log(`\n✅ Selesai! Total ${totalInserted} transaksi berhasil ditambahkan.`);
}

main().catch(console.error);
