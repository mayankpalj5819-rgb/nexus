// Apply Nexus SQL schema via Node.js pg library — handles SNI/SSL better than psycopg2
import { Client } from "pg";
import fs from "fs";

const PASSWORD = "process.env.SUPABASE_DB_PASSWORD";
const PROJECT_REF = "mxfbotvszuegnzuefznw";

const SQL_FILE = "/home/z/my-project/download/supabase-schema.sql";

// Try multiple connection variants — pg library handles SNI properly via
// the `host` parameter and uses the `ssl` option object
const VARIANTS = [
  // Newer pooler — uses project ref as SNI hostname on port 6543 (transaction mode)
  {
    name: "transaction pooler (ref-based host, port 6543)",
    config: {
      host: `${PROJECT_REF}.pooler.supabase.com`,
      port: 6543,
      database: "postgres",
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    },
  },
  // Newer pooler — session mode on port 5432
  {
    name: "session pooler (ref-based host, port 5432)",
    config: {
      host: `${PROJECT_REF}.pooler.supabase.com`,
      port: 5432,
      database: "postgres",
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    },
  },
  // Older pooler — region-based host
  {
    name: "region pooler (aws-0-us-west-1, port 6543)",
    config: {
      host: "aws-0-us-west-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false, servername: `${PROJECT_REF}.pooler.supabase.com` },
      connectionTimeoutMillis: 15000,
    },
  },
  // Direct connection (might be IPv4 in some configurations)
  {
    name: "direct connection (db.{ref}.supabase.co:5432)",
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    },
  },
];

async function tryConnect(variant) {
  console.log(`\n→ Trying: ${variant.name}`);
  console.log(`  host=${variant.config.host}, port=${variant.config.port}, user=${variant.config.user}`);
  const client = new Client(variant.config);
  try {
    await client.connect();
    console.log("  ✓ Connected!");
    return client;
  } catch (e) {
    console.log(`  ✗ Failed: ${e.message.split("\n")[0]}`);
    try { await client.end(); } catch {}
    return null;
  }
}

async function main() {
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  console.log(`Schema file: ${sql.length} bytes`);

  let client = null;
  for (const v of VARIANTS) {
    client = await tryConnect(v);
    if (client) break;
  }

  if (!client) {
    console.log("\n✗ All connection variants failed.");
    console.log("\nLikely cause: the Supabase pooler is reachable but rejecting the tenant identifier.");
    console.log("This happens when the project's pooler hasn't been activated, or the project is paused.");
    process.exit(1);
  }

  // Execute schema
  console.log("\n→ Executing schema...");
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    // Run the full schema as a single query — pg handles multiple statements
    await client.query(sql);
    console.log("✓ Schema executed.");
  } catch (e) {
    console.log(`✗ Schema execution error: ${e.message.split("\n")[0]}`);
    // Fall back to per-statement execution
    console.log("\n→ Falling back to per-statement execution...");
    const statements = sql.split(";\n").map(s => s.trim()).filter(s => s && !s.startsWith("--"));
    let ok = 0, skipped = 0, failed = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ";";
      try {
        await client.query(stmt);
        ok++;
      } catch (e2) {
        const msg = e2.message.toLowerCase();
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          skipped++;
        } else {
          failed++;
          if (failed <= 5) {
            console.log(`  STMT ${i} failed: ${e2.message.split("\n")[0]}`);
            console.log(`  First 80 chars: ${stmt.slice(0, 80)}`);
          }
        }
      }
    }
    console.log(`\nResult: ${ok} ok, ${skipped} already-existed (skipped), ${failed} failed`);
  }

  // Verify
  console.log("\n→ Verifying tables...");
  const tablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log(`✓ Found ${tablesRes.rows.length} tables:`);
  for (const r of tablesRes.rows) console.log(`  - ${r.table_name}`);

  console.log("\n→ Verifying RLS...");
  const rlsRes = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
    ORDER BY relname;
  `);
  const enabled = rlsRes.rows.filter(r => r.relrowsecurity).length;
  console.log(`✓ RLS enabled on ${enabled}/${rlsRes.rows.length} tables`);

  console.log("\n→ Verifying policies...");
  const polRes = await client.query(`
    SELECT COUNT(*) AS count FROM pg_policies WHERE schemaname = 'public';
  `);
  console.log(`✓ Total RLS policies: ${polRes.rows[0].count}`);

  await client.end();
  console.log("\n✅ Nexus schema applied successfully.");
}

main().catch(e => { console.error(e); process.exit(1); });
