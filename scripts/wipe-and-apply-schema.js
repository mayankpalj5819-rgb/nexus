// Wipe public schema clean and apply Nexus schema in one shot.
const fs = require("fs");

const PAT = "process.env.SUPABASE_PAT";
const PROJECT_REF = "mxfbotvszuegnzuefznw";
const SQL_FILE = "/home/z/my-project/download/supabase-schema.sql";

async function q(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function main() {
  // Step 1: list everything currently in public schema so we know what we're wiping
  console.log("→ Current state of public schema:");
  const tablesRes = await q(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log(`  Tables (${tablesRes.json.length}):`);
  tablesRes.json.forEach(r => console.log(`    - ${r.table_name}`));

  const typesRes = await q(`
    SELECT t.typname FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname;
  `);
  console.log(`  Enum types (${typesRes.json.length}):`);
  typesRes.json.forEach(r => console.log(`    - ${r.typname}`));

  // Step 2: drop all tables + types + functions in public schema (CASCADE)
  // Use a single DO block that loops over all objects and drops them.
  console.log("\n→ Wiping public schema (CASCADE)...");
  const wipe = `
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      -- Drop policies first
      FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
      END LOOP;

      -- Drop triggers
      FOR r IN (SELECT tgname, tgrelid::regclass AS rel FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace) AND NOT tgisinternal) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', r.tgname, r.rel);
      END LOOP;

      -- Drop functions
      FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I CASCADE', r.routine_name);
      END LOOP;

      -- Drop tables (CASCADE handles views, sequences, constraints)
      FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.table_name);
      END LOOP;

      -- Drop enum types
      FOR r IN (SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
      END LOOP;
    END;
    $$;
  `;
  const wipeRes = await q(wipe);
  console.log(`  Wipe status: ${wipeRes.status}`);
  if (wipeRes.status >= 300) {
    console.log(`  Wipe error: ${JSON.stringify(wipeRes.json).slice(0, 400)}`);
  } else {
    console.log("  ✓ Public schema wiped clean.");
  }

  // Step 3: verify clean state
  const verifyRes = await q(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
      (SELECT COUNT(*) FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') AS enums,
      (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') AS functions;
  `);
  console.log(`  After wipe: ${verifyRes.json[0].tables} tables, ${verifyRes.json[0].enums} enums, ${verifyRes.json[0].functions} functions`);

  // Step 4: apply Nexus schema as a single batch
  console.log("\n→ Applying Nexus schema...");
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  const applyRes = await q(sql);
  console.log(`  Apply status: ${applyRes.status}`);
  if (applyRes.status >= 300) {
    console.log(`  Apply error: ${JSON.stringify(applyRes.json).slice(0, 500)}`);
    process.exit(1);
  }
  console.log("  ✓ Nexus schema applied.");

  // Step 5: verify all tables + RLS + policies
  console.log("\n→ Verifying tables...");
  const tables = await q("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log(`✓ ${tables.json.length} tables:`);
  tables.json.forEach(r => console.log(`  - ${r.table_name}`));

  console.log("\n→ Verifying RLS...");
  const rls = await q("SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;");
  const enabledCount = rls.json.filter(r => r.relrowsecurity).length;
  console.log(`✓ RLS enabled on ${enabledCount}/${rls.json.length} tables`);
  rls.json.forEach(r => console.log(`  ${r.relrowsecurity ? "✓" : "✗"} ${r.relname}`));

  console.log("\n→ Verifying policies...");
  const pol = await q("SELECT tablename, COUNT(*) AS count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;");
  let total = 0;
  pol.json.forEach(r => { total += parseInt(r.count); console.log(`  ${r.tablename}: ${r.count} policies`); });
  console.log(`✓ Total: ${total} policies`);

  console.log("\n→ Verifying triggers...");
  const trig = await q("SELECT tgname, tgrelid::regclass AS tbl FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace) ORDER BY tgname;");
  console.log(`✓ ${trig.json.length} triggers:`);
  trig.json.forEach(r => console.log(`  - ${r.tgname} on ${r.tbl}`));

  console.log("\n→ Verifying functions...");
  const funcs = await q("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;");
  console.log(`✓ ${funcs.json.length} functions:`);
  funcs.json.forEach(r => console.log(`  - ${r.routine_name}`));

  console.log("\n✅ Nexus schema fully deployed to Supabase.");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
