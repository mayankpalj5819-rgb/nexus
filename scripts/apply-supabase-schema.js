#!/usr/bin/env node
// Apply Nexus SQL schema to Supabase via the pg-meta /pg/query endpoint
// using the service role key as bearer auth.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://mxfbotvszuegnzuefznw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sqlPath = path.join(__dirname, '..', 'download', 'supabase-schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function tryEndpoint(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

(async () => {
  console.log('Trying /pg/query endpoint...');
  let r = await tryEndpoint(`${SUPABASE_URL}/pg/query`, { query: sql });
  console.log(`Status: ${r.status}`);
  console.log(`Body (first 800): ${r.body.slice(0, 800)}`);
  if (r.status === 200) {
    console.log('SUCCESS — schema applied');
    return;
  }

  console.log('\nTrying /rest/v1/rpc with exec_sql...');
  // Fallback: try the management-style SQL endpoint
  r = await tryEndpoint(`${SUPABASE_URL}/pg/query`, { query: 'SELECT 1 as test;' });
  console.log(`Test query status: ${r.status}, body: ${r.body.slice(0, 200)}`);
})();
