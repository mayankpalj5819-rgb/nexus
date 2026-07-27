-- ============================================================================
-- Nexus — Phase 1 Schema (Supabase Postgres)
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('like', 'reply', 'mention', 'follow', 'topic_update', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_target_type as enum ('post', 'comment', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Users (linked 1:1 to auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  email text unique not null,
  avatar_url text,
  bio text default '',
  website text,
  location text,
  reputation integer default 0,
  role user_role not null default 'user',
  banned boolean not null default false,
  joined_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Topics (hierarchical — parent_id self-reference)
-- ----------------------------------------------------------------------------
create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text default '',
  banner text default '',
  color text default '#8b5cf6',
  icon text default '📄',
  parent_id uuid references public.topics(id) on delete set null,
  post_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_topics_parent on public.topics(parent_id);
create index if not exists idx_topics_slug on public.topics(slug);

-- ----------------------------------------------------------------------------
-- Posts
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  preview text default '',
  content text not null,
  images jsonb default '[]'::jsonb,
  tags text[] default '{}',
  views integer default 0,
  removed boolean default false,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_posts_author on public.posts(author_id);
create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_posts_tags on public.posts using gin(tags);

create table if not exists public.post_topics (
  post_id uuid references public.posts(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  primary key (post_id, topic_id)
);
create index if not exists idx_post_topics_topic on public.post_topics(topic_id);

-- ----------------------------------------------------------------------------
-- Comments (nested via parent_id)
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  mentions uuid[] default '{}',
  removed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_comments_post on public.comments(post_id);
create index if not exists idx_comments_parent on public.comments(parent_id);
create index if not exists idx_comments_author on public.comments(author_id);

-- ----------------------------------------------------------------------------
-- Votes (polymorphic on post / comment)
-- ----------------------------------------------------------------------------
create table if not exists public.post_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists idx_post_votes_post on public.post_votes(post_id);

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Bookmarks + Folders
-- ----------------------------------------------------------------------------
create table if not exists public.bookmark_folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_bookmark_folders_user on public.bookmark_folders(user_id);

create table if not exists public.bookmarks (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  folder_id uuid references public.bookmark_folders(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists idx_bookmarks_user on public.bookmarks(user_id);
create index if not exists idx_bookmarks_folder on public.bookmarks(folder_id);

-- ----------------------------------------------------------------------------
-- Followers (user → user, user → topic)
-- ----------------------------------------------------------------------------
create table if not exists public.user_followers (
  follower_id uuid not null references public.users(id) on delete cascade,
  followee_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists idx_user_followers_followee on public.user_followers(followee_id);

create table if not exists public.topic_followers (
  user_id uuid not null references public.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
create index if not exists idx_topic_followers_topic on public.topic_followers(topic_id);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notification_type not null,
  actor_id uuid references public.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- ----------------------------------------------------------------------------
-- Reports
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status report_status not null default 'pending',
  resolver_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_reports_status on public.reports(status, created_at desc);

-- ----------------------------------------------------------------------------
-- Images
-- ----------------------------------------------------------------------------
create table if not exists public.images (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  url text not null,
  alt text,
  storage_path text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Audit Logs
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- ----------------------------------------------------------------------------
-- Drafts
-- ----------------------------------------------------------------------------
create table if not exists public.drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text default '',
  content text default '',
  topic_ids uuid[] default '{}',
  updated_at timestamptz not null default now()
);
create index if not exists idx_drafts_user on public.drafts(user_id, updated_at desc);

-- ----------------------------------------------------------------------------
-- Triggers — keep post_count in sync, update updated_at
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ begin
  create trigger trg_users_updated before update on public.users
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_topics_updated before update on public.topics
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_posts_updated before update on public.posts
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.users enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.post_topics enable row level security;
alter table public.comments enable row level security;
alter table public.post_votes enable row level security;
alter table public.comment_votes enable row level security;
alter table public.bookmark_folders enable row level security;
alter table public.bookmarks enable row level security;
alter table public.user_followers enable row level security;
alter table public.topic_followers enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.images enable row level security;
alter table public.audit_logs enable row level security;
alter table public.drafts enable row level security;

-- Users: public read, self-update, admin-update
create policy "users_select" on public.users for select using (true);
create policy "users_update_self" on public.users for update using (auth.uid() = id);
create policy "users_insert_self" on public.users for insert with check (auth.uid() = id);

-- Topics: public read, admin write
create policy "topics_select" on public.topics for select using (true);
create policy "topics_admin_write" on public.topics for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderator')))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderator')));

-- Posts: public read (unless removed); author insert/update/delete; mod remove
create policy "posts_select" on public.posts for select using (removed = false or author_id = auth.uid());
create policy "posts_insert" on public.posts for insert with check (author_id = auth.uid());
create policy "posts_update" on public.posts for update using (author_id = auth.uid());
create policy "posts_delete" on public.posts for delete using (author_id = auth.uid());

-- Comments
create policy "comments_select" on public.comments for select using (removed = false or author_id = auth.uid());
create policy "comments_insert" on public.comments for insert with check (author_id = auth.uid());
create policy "comments_update" on public.comments for update using (author_id = auth.uid());
create policy "comments_delete" on public.comments for delete using (author_id = auth.uid());

-- Votes — one per user, self-managed
create policy "post_votes_select" on public.post_votes for select using (true);
create policy "post_votes_insert" on public.post_votes for insert with check (user_id = auth.uid());
create policy "post_votes_update" on public.post_votes for update using (user_id = auth.uid());
create policy "post_votes_delete" on public.post_votes for delete using (user_id = auth.uid());

create policy "comment_votes_select" on public.comment_votes for select using (true);
create policy "comment_votes_insert" on public.comment_votes for insert with check (user_id = auth.uid());
create policy "comment_votes_update" on public.comment_votes for update using (user_id = auth.uid());
create policy "comment_votes_delete" on public.comment_votes for delete using (user_id = auth.uid());

-- Bookmarks — private to user
create policy "bookmarks_self" on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "bookmark_folders_self" on public.bookmark_folders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Followers — public read, self insert/delete
create policy "user_followers_select" on public.user_followers for select using (true);
create policy "user_followers_insert" on public.user_followers for insert with check (follower_id = auth.uid());
create policy "user_followers_delete" on public.user_followers for delete using (follower_id = auth.uid());

create policy "topic_followers_select" on public.topic_followers for select using (true);
create policy "topic_followers_insert" on public.topic_followers for insert with check (user_id = auth.uid());
create policy "topic_followers_delete" on public.topic_followers for delete using (user_id = auth.uid());

-- Notifications — owner only
create policy "notifications_self" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reports — reporter can insert; admins can read/update
create policy "reports_insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports_select_reporter_or_admin" on public.reports for select
  using (reporter_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderator')));
create policy "reports_update_admin" on public.reports for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderator')));

-- Images — owner write, public read for post images
create policy "images_select" on public.images for select using (true);
create policy "images_insert" on public.images for insert with check (user_id = auth.uid());
create policy "images_delete" on public.images for delete using (user_id = auth.uid());

-- Audit logs — admin read only
create policy "audit_logs_admin" on public.audit_logs for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderator')));
create policy "audit_logs_insert" on public.audit_logs for insert with check (auth.uid() is not null);

-- Drafts — owner only
create policy "drafts_self" on public.drafts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Auto-create user row on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'preferred_username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
