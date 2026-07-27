# Nexus — Phase 1 MVP

> **Follow knowledge, not people.**
> A knowledge-first social platform organized around Topics, Subtopics, and Posts.

Nexus reimagines social media around ideas instead of influencers. People follow topics — Science → Physics → Mechanics → Newton's Laws — and posts belong to one or more topics. No creators to chase, no algorithmic noise — just organized knowledge.

---

## ✨ Highlights

- **Premium glassmorphism UI** with dark mode (default) and light mode
- **Hierarchical topics** with parent/child relationships, banners, top contributors
- **TipTap rich editor** with markdown, headings, lists, code blocks, links, images, tables, quotes, preview mode, autosave drafts
- **Nested comments** with replies, edit, delete, upvote/downvote, mention support, sort
- **Home feed** with Trending / Latest / Popular / Following tabs and infinite scroll
- **Search** across posts, topics, and users with instant results, filters, recent searches
- **Notifications** for likes, replies, mentions, follows, topic updates
- **Bookmarks** with custom folders, search, organization
- **User profiles** with posts, comments, bookmarks, following, followers, activity, reputation
- **Admin panel** with dashboard, user management, post moderation, topic management, reports, analytics, role management, audit log
- **Reputation system** (passive — no gamification in Phase 1)
- **Command palette** (⌘K) for instant navigation
- **PWA-ready** with manifest and theme colors

---

## 🧱 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Animation | Framer Motion |
| State | Zustand (client) + TanStack Query (server) |
| Forms | React Hook Form + Zod |
| Editor | TipTap (StarterKit + Link + Image + CodeBlock lowlight) |
| Markdown | react-markdown + remark-gfm |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Auth | Google OAuth via Supabase |
| Icons | Lucide |

---

## 🗂 Architecture

```
src/
├── app/                      # Next.js app router
│   ├── layout.tsx            # Root layout (theme + query + nexus-app)
│   ├── page.tsx              # Single route → NexusApp
│   └── globals.css           # Glassmorphism design system
├── components/
│   ├── layout/               # Sidebar, topbar, mobile-nav, command palette, view router
│   ├── features/
│   │   ├── auth/             # Sign-in screen with Google OAuth
│   │   ├── feed/             # Home feed (Trending/Latest/Popular/Following)
│   │   ├── topics/           # Topics explorer + topic detail
│   │   ├── posts/            # Post detail page
│   │   ├── comments/         # Nested comments (rendered inside post detail)
│   │   ├── search/           # Instant search
│   │   ├── profile/          # Profile + settings
│   │   ├── notifications/    # Notification center
│   │   ├── bookmarks/        # Bookmarks with folders
│   │   ├── admin/            # Admin panel
│   │   └── editor/           # TipTap editor + post composer
│   ├── shared/               # Reusable PostCard
│   ├── theme-provider.tsx
│   ├── query-provider.tsx
│   ├── nexus-app.tsx         # Auth gate
│   └── nexus-root-shell.tsx  # App shell with sidebar/topbar/rails
└── lib/
    ├── store.ts              # Zustand store + types + seed data
    ├── supabase.ts           # Supabase client (anon + admin)
    ├── helpers.ts            # timeAgo, formatNumber, sanitize, etc.
    └── use-signed-in-user.ts # Stable selector hook
```

---

## 🔐 Environment Variables

Create `.env` (or `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY   # server-only
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Local Development

```bash
bun install
bun run dev     # http://localhost:3000
bun run lint    # ESLint check
```

The app is a single-page experience driven by Zustand view-state, so you can navigate everywhere from `/` without route changes. Data is seeded in-memory and persisted to `localStorage` under the key `nexus-store-v1`. To reset, clear site data in your browser.

---

## 🗄 Database Setup (Supabase)

1. Open Supabase SQL Editor on your project.
2. Run `download/supabase-schema.sql` — it's idempotent.
3. In Supabase → Authentication → Providers, enable **Google** and paste your `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. Add `http://localhost:3000` and your production URL to Supabase → Authentication → URL Configuration → Redirect URLs.

The schema includes:

- `users`, `topics`, `posts`, `post_topics`, `comments`
- `post_votes`, `comment_votes`
- `bookmarks`, `bookmark_folders`
- `user_followers`, `topic_followers`
- `notifications`, `reports`, `images`, `audit_logs`, `drafts`
- Proper indexes on hot paths
- **Row Level Security** on every table
- Auto-create `public.users` row on signup (trigger on `auth.users`)

---

## 🌐 Production Deployment

- **Frontend** → Render (Next.js web service). Set all env vars in Render dashboard.
- **Backend** → Supabase (already managed). Connect via env vars.

Recommended `render.yaml`:

```yaml
services:
  - type: web
    name: nexus
    env: node
    plan: starter
    buildCommand: bun install && bun run build
    startCommand: bun run start
    envVars:
      - key: NEXT_PUBLIC_SUPABASE_URL
        sync: false
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: NEXT_PUBLIC_APP_URL
        value: https://your-domain.onrender.com
```

---

## 🤖 Phase 2 — AI Hooks (no refactor needed)

The architecture is intentionally AI-ready:

- `src/lib/store.ts` — All selectors (`getTrendingPosts`, `getFeed`, `searchAll`) are pure functions over state. AI can call them directly.
- `src/lib/supabase.ts` — `supabaseAdmin` client (server-only, service role) is already wired for trusted AI operations like embeddings, RAG, summarization.
- Post content is stored as **markdown** (not HTML), making it trivial to chunk for vector search.
- `tags`, `topicIds`, and `mentions` fields are pre-indexed for semantic search.
- Audit logs and reputation events are structured for future AI moderation pipelines.

Planned Phase 2 features:

- AI-generated topic summaries
- Semantic search (pgvector + embeddings)
- Smart post recommendations
- AI-assisted comment moderation
- Auto-tagging for new posts

---

## 📜 License

Proprietary — Phase 1 MVP. © 2026 Nexus.
