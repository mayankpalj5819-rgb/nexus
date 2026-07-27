// Seed the Nexus database with initial users, topics, and posts.
// Users are linked to auth.users via UUIDs — we generate stable UUIDs
// for the 12 seeded users so they can be referenced consistently.

const PAT = "process.env.SUPABASE_PAT";
const PROJECT_REF = "mxfbotvszuegnzuefznw";

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
  // First check current state
  const beforeRes = await q("SELECT COUNT(*) AS count FROM public.users;");
  console.log(`Current users in DB: ${beforeRes.json[0].count}`);

  if (parseInt(beforeRes.json[0].count) > 0) {
    console.log("✓ Database already seeded. Skipping.");
    return;
  }

  console.log("\n→ Seeding topics...");
  const topics = [
    { id: "t1", name: "Science", slug: "science", desc: "The systematic study of the natural world through observation and experiment.", banner: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#8b5cf6", icon: "🔬", parent: null },
    { id: "t2", name: "Physics", slug: "physics", desc: "From quantum fields to cosmology — the fundamental laws of nature.", banner: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#3b82f6", icon: "⚛️", parent: "t1" },
    { id: "t3", name: "Mechanics", slug: "mechanics", desc: "Classical, quantum, and fluid mechanics — motion in all its forms.", banner: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#06b6d4", icon: "🛰️", parent: "t2" },
    { id: "t7", name: "Mathematics", slug: "mathematics", desc: "The language of patterns — pure and applied.", banner: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#10b981", icon: "📐", parent: null },
    { id: "t8", name: "Astronomy", slug: "astronomy", desc: "Stars, galaxies, and the structure of the cosmos.", banner: "linear-gradient(135deg, #1e1b4b, #6366f1)", color: "#6366f1", icon: "🌌", parent: "t1" },
    { id: "t4", name: "Technology", slug: "technology", desc: "The tools we build to shape the world.", banner: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#f59e0b", icon: "💻", parent: null },
    { id: "t5", name: "Software Engineering", slug: "software-engineering", desc: "Practices, patterns, and craft of building software.", banner: "linear-gradient(135deg, #ef4444, #ec4899)", color: "#ec4899", icon: "🧱", parent: "t4" },
    { id: "t6", name: "Distributed Systems", slug: "distributed-systems", desc: "Consensus, replication, and the architecture of the modern web.", banner: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#ec4899", icon: "🕸️", parent: "t5" },
    { id: "t9", name: "Philosophy", slug: "philosophy", desc: "The love of wisdom — questions that endure.", banner: "linear-gradient(135deg, #8b5cf6, #ec4899)", color: "#8b5cf6", icon: "🤔", parent: null },
    { id: "t10", name: "Ethics", slug: "ethics", desc: "What we owe to one another.", banner: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#a855f7", icon: "⚖️", parent: "t9" },
    { id: "t11", name: "Existentialism", slug: "existentialism", desc: "Freedom, choice, and the search for meaning.", banner: "linear-gradient(135deg, #6366f1, #3b82f6)", color: "#6366f1", icon: "🕯️", parent: "t9" },
    { id: "t12", name: "Neuroscience", slug: "neuroscience", desc: "The brain — how it works and what it tells us about ourselves.", banner: "linear-gradient(135deg, #f97316, #ef4444)", color: "#f97316", icon: "🧠", parent: null },
    { id: "t13", name: "Climate", slug: "climate", desc: "Earth's climate system — past, present, and future.", banner: "linear-gradient(135deg, #06b6d4, #10b981)", color: "#06b6d4", icon: "🌍", parent: null },
    { id: "t14", name: "Earth Sciences", slug: "earth-sciences", desc: "Geology, oceans, atmosphere — the planet itself.", banner: "linear-gradient(135deg, #0891b2, #06b6d4)", color: "#0891b2", icon: "🏔️", parent: "t13" },
  ];

  // Map topic IDs to fixed UUIDs for stable references
  const topicUuid = (id) => {
    const num = parseInt(id.replace("t", ""));
    return `00000000-0000-0000-0000-${String(num).padStart(12, "0")}`;
  };

  for (const t of topics) {
    const topicId = topicUuid(t.id);
    const parentId = t.parent ? topicUuid(t.parent) : null;
    const r = await q(`
      INSERT INTO public.topics (id, name, slug, description, banner, color, icon, parent_id, post_count, created_at)
      VALUES ('${topicId}', '${t.name.replace(/'/g, "''")}', '${t.slug}', '${t.desc.replace(/'/g, "''")}', '${t.banner}', '${t.color}', '${t.icon}', ${parentId ? `'${parentId}'` : 'NULL'}, 0, now())
      ON CONFLICT (slug) DO NOTHING;
    `);
    if (r.status >= 300) console.log(`  ✗ ${t.name}: ${JSON.stringify(r.json).slice(0, 150)}`);
    else console.log(`  ✓ ${t.name}`);
  }

  console.log("\n→ Verifying topics...");
  const topicCount = await q("SELECT COUNT(*) AS count FROM public.topics;");
  console.log(`  ${topicCount.json[0].count} topics in database`);

  console.log("\n✅ Seeding complete.");
  console.log("\n📋 Note: Users are NOT seeded because they must be created via Google OAuth signup.");
  console.log("   When the first user signs in via Google, the handle_new_user trigger will");
  console.log("   automatically create their row in public.users with proper auth.users linkage.");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
