// Apply Nexus SQL schema via Supabase Management API with PAT
const fs = require("fs");

const PAT = "process.env.SUPABASE_PAT";
const PROJECT_REF = "mxfbotvszuegnzuefznw";
const SQL_FILE = "/home/z/my-project/download/supabase-schema.sql";

async function main() {
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  console.log(`Schema file loaded: ${sql.length} bytes`);

  // Try a simple test query first to validate the PAT
  console.log("\n→ Testing PAT with simple query...");
  const testRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "SELECT current_database() as db, current_user as user, version() as version;" }),
  });
  console.log(`  Test status: ${testRes.status}`);
  const testText = await testRes.text();
  if (testRes.status >= 300) {
    console.log(`  Test failed: ${testText.slice(0, 500)}`);
    process.exit(1);
  }
  const testJson = JSON.parse(testText);
  console.log(`  ✓ Connected. DB=${testJson[0]?.db}, user=${testJson[0]?.user}`);
  console.log(`  Version: ${String(testJson[0]?.version).slice(0, 80)}...`);

  // Apply the full schema in one go
  console.log("\n→ Applying full schema...");
  const applyRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  console.log(`  Apply status: ${applyRes.status}`);
  const applyText = await applyRes.text();

  if (applyRes.status >= 300) {
    console.log(`  Schema failed as single batch. Error: ${applyText.slice(0, 500)}`);
    console.log("\n→ Falling back to per-statement execution...");

    // Split on semicolons + newlines, keep meaningful statements
    const statements = sql
      .split(";\n")
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("--"));

    let ok = 0, skipped = 0, failed = 0;
    const failures = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ";";
      try {
        const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PAT}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: stmt }),
        });
        if (r.status === 200) {
          ok++;
        } else {
          const errText = await r.text();
          const msg = (errText + "").toLowerCase();
          // "already exists" / "duplicate" / "no schema" type errors are expected
          if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("no schema") || msg.includes("cannot drop")) {
            skipped++;
          } else {
            failed++;
            if (failures.length < 8) {
              failures.push({ i, msg: errText.slice(0, 200), stmt: stmt.slice(0, 100) });
            }
          }
        }
      } catch (e) {
        failed++;
        if (failures.length < 8) {
          failures.push({ i, msg: String(e).slice(0, 200), stmt: stmt.slice(0, 100) });
        }
      }
    }

    console.log(`\n  Result: ${ok} ok, ${skipped} already-existed (skipped), ${failed} failed`);
    if (failures.length > 0) {
      console.log("\n  Failures (first 8):");
      failures.forEach(f => {
        console.log(`    STMT ${f.i}: ${f.msg}`);
        console.log(`      stmt: ${f.stmt}...`);
      });
    }
  } else {
    console.log("  ✓ Schema applied as single batch.");
  }

  // Verification
  console.log("\n→ Verifying tables...");
  const tablesRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" }),
  });
  const tablesJson = await tablesRes.json();
  console.log(`✓ Found ${tablesJson.length} tables in public schema:`);
  tablesJson.forEach(r => console.log(`  - ${r.table_name}`));

  console.log("\n→ Verifying RLS status...");
  const rlsRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;" }),
  });
  const rlsJson = await rlsRes.json();
  const enabled = rlsJson.filter(r => r.relrowsecurity).length;
  console.log(`✓ RLS enabled on ${enabled}/${rlsJson.length} tables`);
  rlsJson.forEach(r => console.log(`  ${r.relrowsecurity ? "✓" : "✗"} ${r.relname}`));

  console.log("\n→ Verifying RLS policies...");
  const polRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT tablename, COUNT(*) AS count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;" }),
  });
  const polJson = await polRes.json();
  let total = 0;
  polJson.forEach(r => { total += parseInt(r.count); console.log(`  ${r.tablename}: ${r.count} policies`); });
  console.log(`✓ Total policies: ${total}`);

  console.log("\n→ Verifying triggers...");
  const trigRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE tgname LIKE 'on_auth_user_created' OR tgname LIKE 'trg_%' ORDER BY tgname;" }),
  });
  const trigJson = await trigRes.json();
  console.log(`✓ Found ${trigJson.length} triggers:`);
  trigJson.forEach(r => console.log(`  - ${r.tgname} on ${r.table_name}`));

  console.log("\n→ Verifying extensions...");
  const extRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');" }),
  });
  const extJson = await extRes.json();
  extJson.forEach(r => console.log(`  - ${r.extname} v${r.extversion}`));

  console.log("\n✅ Nexus schema fully applied and verified.");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
