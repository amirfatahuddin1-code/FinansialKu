// Supabase Edge Function: seed-transactions
// Invoke once to create sample transactions from Jan 2026 to today
// curl -X POST https://<project>.supabase.co/functions/v1/seed-transactions \
//   -H "Authorization: Bearer <anon-key>" \
//   -H "Content-Type: application/json" \
//   -d '{"email": "karsafinid@gmail.com"}'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const expenseDescriptions: Record<string, string[]> = {
  Makanan: ['Nasi goreng + es teh', 'Bakso + minum', 'Makan siang di warteg', 'Ayam geprek + es jeruk', 'Sate padang', 'Seblak + minum', 'Nasi uduk + telur', 'Mie ayam + pangsit', 'Pecel lele + es teh', 'Sop iga sapi'],
  Transport: ['Gojek ke kantor', 'Grab ke stasiun', 'Bensin motor', 'Bensin mobil', 'Parkir', 'Tol', 'Angkot', 'Bis kota', 'Taxi', 'KRL commuter'],
  Tagihan: ['Listrik bulanan', 'Air PDAM', 'Internet WiFi', 'Pulsa XL', 'BPJS Kesehatan', 'Paket data', 'Telpon rumah', 'Streaming Netflix', 'Spotify Premium', 'iCloud storage'],
  Belanja: ['Indomaret', 'Alfamart', 'Superindo', 'Transmart', 'Pasar tradisional', 'Sayur mayur', 'Sabun & deterjen', 'Minyak goreng', 'Beras 5kg', 'Gula & kopi'],
  Hiburan: ['Nonton bioskop', 'Netflix monthly', 'Game online', 'Karaoke', 'Konser musik', 'Billiard', 'Swimming', 'Badminton sewa lapang', 'Nongkrong di cafe', 'Live music'],
  Kesehatan: ['Obat batuk', 'Dokter umum', 'Vitamin C', 'Cek lab', 'Obat flu', 'Jamu', 'Tensi check', 'Minyak kayu putih', 'Salep luka', 'Multivitamin'],
  Pendidikan: ['Buku', 'Kursus online', 'Les bahasa', 'Seminar', 'Workshop', 'Modul belajar', 'Alat tulis', 'Biaya ujian', 'Bootcamp', 'E-book'],
}

const incomeDescriptions = [
  'Gaji bulanan',
  'Bonus project',
  'Freelance design',
  'Cashback kartu kredit',
  'Hasil jual barang',
  'Bonus tahunan',
  'Thr',
  'Komisi penjualan',
  'Tunjangan transport',
  'Uang lembur',
]

const categoryIcons: Record<string, string> = {
  Makanan: '🍜',
  Transport: '🚗',
  Tagihan: '📄',
  Belanja: '🛒',
  Hiburan: '🎮',
  Kesehatan: '💊',
  Pendidikan: '📚',
  Gaji: '💰',
  Bonus: '🎁',
}

function generateExpensesForMonth(year: number, month: number, categories: any[]): any[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const txns: any[] = []
  const numTx = rng(25, 40)

  for (let i = 0; i < numTx; i++) {
    const day = rng(1, daysInMonth)
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const cat = pick(categories)
    const desc = pick(expenseDescriptions[cat.name] || ['Pembelian'])
    const amount = cat.name === 'Makanan' ? rng(10000, 80000)
      : cat.name === 'Transport' ? rng(7000, 150000)
      : cat.name === 'Tagihan' ? rng(50000, 500000)
      : cat.name === 'Belanja' ? rng(15000, 200000)
      : cat.name === 'Hiburan' ? rng(25000, 300000)
      : cat.name === 'Kesehatan' ? rng(15000, 150000)
      : cat.name === 'Pendidikan' ? rng(50000, 500000)
      : rng(10000, 100000)

    txns.push({
      type: 'expense',
      amount,
      description: desc,
      date,
      category_id: cat.id,
      account_id: null,
      source: 'manual',
    })
  }
  return txns
}

function generateIncomeForMonth(year: number, month: number, incomeCat: any): any[] {
  const txns: any[] = []
  // 1-2 income per month
  const num = rng(1, 2)
  for (let i = 0; i < num; i++) {
    const day = rng(1, 5)
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    txns.push({
      type: 'income',
      amount: rng(3000000, 8000000),
      description: pick(incomeDescriptions),
      date,
      category_id: incomeCat.id,
      account_id: null,
      source: 'manual',
    })
  }
  return txns
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email } = await req.json()
    if (!email) throw new Error('Missing email')

    // Lookup user by email
    const { data: users, error: userErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
    if (userErr) throw userErr
    if (!users || users.length === 0) throw new Error(`User ${email} not found`)
    const userId = users[0].id

    // Get categories
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
    if (catErr) throw catErr
    if (!cats || cats.length === 0) throw new Error('No categories found')

    const expenseCats = cats.filter(c => c.type === 'expense')
    const incomeCats = cats.filter(c => c.type === 'income')
    if (expenseCats.length === 0) throw new Error('No expense categories found')
    if (incomeCats.length === 0) throw new Error('No income categories found')

    const firstIncomeCat = incomeCats[0]

    // Generate transactions from Jan 2026 to current month
    const now = new Date()
    const startYear = 2026
    const startMonth = 1
    const allTxns: any[] = []

    for (let y = startYear; y <= now.getFullYear(); y++) {
      const endM = y === now.getFullYear() ? now.getMonth() + 1 : 12
      const startM = y === startYear ? startMonth : 1
      for (let m = startM; m <= endM; m++) {
        const expenses = generateExpensesForMonth(y, m, expenseCats)
        const incomes = generateIncomeForMonth(y, m, firstIncomeCat)
        allTxns.push(...expenses, ...incomes)
      }
    }

    // Batch insert
    const batchSize = 50
    let inserted = 0
    for (let i = 0; i < allTxns.length; i += batchSize) {
      const batch = allTxns.slice(i, i + batchSize).map(t => ({
        ...t,
        user_id: userId,
      }))
      const { error: insErr } = await supabase
        .from('transactions')
        .insert(batch)
      if (insErr) throw insErr
      inserted += batch.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${inserted} transactions from Jan 2026 to ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
        count: inserted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
