// Create polls + poll_votes tables with RLS
const PAT = "process.env.SUPABASE_PAT";
const PROJECT_REF = "mxfbotvszuegnzuefznw";

async function q(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return await res.json();
}

const statements = [
  `DO $$ BEGIN CREATE TABLE public.polls (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, question text NOT NULL, options jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()); EXCEPTION WHEN DUPLICATE_TABLE THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TABLE public.poll_votes (poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, option_index integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (poll_id, user_id)); EXCEPTION WHEN DUPLICATE_TABLE THEN NULL; END $$;`,
  `ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;`,
  `DO $$ BEGIN CREATE POLICY "polls_select" ON public.polls FOR SELECT USING (true); EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE POLICY "polls_insert" ON public.polls FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE POLICY "poll_votes_select" ON public.poll_votes FOR SELECT USING (true); EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE POLICY "poll_votes_delete" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;`,
];

(async () => {
  for (const s of statements) {
    const r = await q(s);
    if (r.message && !r.message.includes("already")) console.log("ERR:", r.message.slice(0, 100));
    else process.stdout.write(".");
  }
  console.log("\nDone. Verifying tables...");
  const v = await q("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('polls', 'poll_votes');");
  console.log(JSON.stringify(v));
})();
