const fs = require('fs');
const code = fs.readFileSync('c:/karsafin/packages/shared/src/utils/constants.ts', 'utf-8');
const matchUrl = code.match(/SUPABASE_URL = process\.env\.NEXT_PUBLIC_SUPABASE_URL \|\| '([^']+)'/);
const matchKey = code.match(/SUPABASE_ANON_KEY = process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| '([^']+)'/);
const url = matchUrl ? matchUrl[1] : '';
const key = matchKey ? matchKey[1] : '';

async function check() {
  const res = await fetch(`${url}/rest/v1/transactions?select=*&order=created_at.desc&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log('Sample transaction:', data);
}

check().catch(console.error);
