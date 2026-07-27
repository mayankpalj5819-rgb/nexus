import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export type ID = string;
export type View =
  | { name: "home"; feed?: FeedTab; topicId?: ID }
  | { name: "topic"; topicId: ID }
  | { name: "post"; postId: ID }
  | { name: "search"; query?: string; filter?: SearchFilter }
  | { name: "profile"; userId?: ID; tab?: ProfileTab }
  | { name: "notifications" }
  | { name: "bookmarks"; folderId?: ID }
  | { name: "admin"; tab?: AdminTab }
  | { name: "editor"; postId?: ID; topicId?: ID }
  | { name: "topics" }
  | { name: "settings" };

export type FeedTab = "trending" | "latest" | "popular" | "following";
export type SearchFilter = "all" | "posts" | "topics" | "users";
export type ProfileTab =
  | "posts"
  | "comments"
  | "bookmarks"
  | "following"
  | "followers"
  | "activity";
export type AdminTab =
  | "dashboard"
  | "users"
  | "posts"
  | "topics"
  | "reports"
  | "analytics"
  | "roles";

export type UserRole = "user" | "moderator" | "admin";

export interface User {
  id: ID;
  username: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  website?: string;
  joinedDate: string;
  reputation: number;
  role: UserRole;
  followers: ID[];
  followingTopics: ID[];
  followingUsers: ID[];
  banned?: boolean;
  location?: string;
}

export interface Topic {
  id: ID;
  name: string;
  slug: string;
  description: string;
  banner: string;
  color: string;
  icon: string;
  parentId: ID | null;
  followers: ID[];
  postCount: number;
  createdAt: string;
}

export interface PostImage {
  url: string;
  alt?: string;
}

export interface Post {
  id: ID;
  authorId: ID;
  topicIds: ID[];
  title: string;
  preview: string;
  content: string; // markdown
  images: PostImage[];
  createdAt: string;
  updatedAt?: string;
  upvotes: ID[];
  downvotes: ID[];
  bookmarks: ID[];
  commentIds: ID[];
  views: number;
  tags: string[];
  removed?: boolean;
  removedReason?: string;
}

export interface Comment {
  id: ID;
  postId: ID;
  authorId: ID;
  parentId: ID | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  upvotes: ID[];
  downvotes: ID[];
  mentions: ID[];
  removed?: boolean;
}

export type NotificationType =
  | "like"
  | "reply"
  | "mention"
  | "follow"
  | "topic_update"
  | "system";

export interface AppNotification {
  id: ID;
  userId: ID;
  type: NotificationType;
  actorId?: ID;
  postId?: ID;
  commentId?: ID;
  topicId?: ID;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface BookmarkFolder {
  id: ID;
  userId: ID;
  name: string;
  postIds: ID[];
  createdAt: string;
}

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: "post" | "comment" | "user";
  targetId: ID;
  reason: string;
  details?: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
  resolverId?: ID;
}

export interface AuditLog {
  id: ID;
  actorId: ID;
  action: string;
  targetType: string;
  targetId: ID;
  metadata?: string;
  createdAt: string;
}

export interface Session {
  userId: ID;
  startedAt: string;
}

export interface Draft {
  id: ID;
  title: string;
  content: string;
  topicIds: ID[];
  updatedAt: string;
}

// ============================================================================
// Mock data — seeded once, then mutated in-memory + persisted
// ============================================================================

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const iso = (offset: number) => new Date(now - offset).toISOString();

const AVATARS = [
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Aurora",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Neo",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Quasar",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Vega",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Lyra",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Orion",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Pulsar",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Nebula",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Helios",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Atlas",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Rigel",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Cosmo",
];

const seedUsers: User[] = [
  {
    id: "u1",
    username: "aurora",
    name: "Aurora Chen",
    email: "aurora@nexus.app",
    avatar: AVATARS[0],
    bio: "Physics PhD candidate | Quantum mechanics enthusiast | Coffee-powered",
    website: "aurora.science",
    joinedDate: iso(180 * day),
    reputation: 4820,
    role: "admin",
    followers: ["u2", "u3", "u5", "u7", "u9"],
    followingTopics: ["t1", "t2", "t3", "t9"],
    followingUsers: ["u2", "u4"],
    location: "Cambridge, MA",
  },
  {
    id: "u2",
    username: "neo",
    name: "Neo Park",
    email: "neo@nexus.app",
    avatar: AVATARS[1],
    bio: "Software engineer. Distributed systems & type theory.",
    website: "neo.dev",
    joinedDate: iso(150 * day),
    reputation: 3960,
    role: "moderator",
    followers: ["u1", "u6", "u8"],
    followingTopics: ["t4", "t5", "t6"],
    followingUsers: ["u1", "u3"],
  },
  {
    id: "u3",
    username: "quasar",
    name: "Quasar Patel",
    email: "quasar@nexus.app",
    avatar: AVATARS[2],
    bio: "Astrophysicist at MIT. Black holes, gravitational waves, and bad puns.",
    joinedDate: iso(120 * day),
    reputation: 3120,
    role: "user",
    followers: ["u1", "u4", "u10"],
    followingTopics: ["t1", "t2", "t8"],
    followingUsers: ["u1"],
  },
  {
    id: "u4",
    username: "vega",
    name: "Vega Lin",
    email: "vega@nexus.app",
    avatar: AVATARS[3],
    bio: "Philosophy major. Existentialism, ethics, and the occasional poem.",
    joinedDate: iso(95 * day),
    reputation: 2480,
    role: "user",
    followers: ["u5", "u7"],
    followingTopics: ["t9", "t10", "t11"],
    followingUsers: ["u2", "u8"],
  },
  {
    id: "u5",
    username: "lyra",
    name: "Lyra Sato",
    email: "lyra@nexus.app",
    avatar: AVATARS[4],
    bio: "Mathematician. Topology, category theory, and beautiful proofs.",
    joinedDate: iso(80 * day),
    reputation: 2140,
    role: "user",
    followers: ["u3", "u6"],
    followingTopics: ["t7", "t3", "t1"],
    followingUsers: ["u1", "u3"],
  },
  {
    id: "u6",
    username: "orion",
    name: "Orion Garcia",
    email: "orion@nexus.app",
    avatar: AVATARS[5],
    bio: "Frontend engineer. Building delightful interfaces one commit at a time.",
    joinedDate: iso(70 * day),
    reputation: 1860,
    role: "user",
    followers: ["u2", "u4"],
    followingTopics: ["t4", "t5"],
    followingUsers: ["u2"],
  },
  {
    id: "u7",
    username: "pulsar",
    name: "Pulsar Reyes",
    email: "pulsar@nexus.app",
    avatar: AVATARS[6],
    bio: "Neuroscience PhD. Brain-computer interfaces and cognition.",
    joinedDate: iso(60 * day),
    reputation: 1640,
    role: "user",
    followers: ["u1", "u9"],
    followingTopics: ["t12", "t1"],
    followingUsers: ["u1"],
  },
  {
    id: "u8",
    username: "nebula",
    name: "Nebula Kim",
    email: "nebula@nexus.app",
    avatar: AVATARS[7],
    bio: "Climate scientist. Modeling the future, one scenario at a time.",
    joinedDate: iso(50 * day),
    reputation: 1480,
    role: "user",
    followers: ["u3", "u10"],
    followingTopics: ["t13", "t14"],
    followingUsers: ["u3"],
  },
  {
    id: "u9",
    username: "helios",
    name: "Helios Tanaka",
    email: "helios@nexus.app",
    avatar: AVATARS[8],
    bio: "Historian of science. The past is the future, decoded.",
    joinedDate: iso(40 * day),
    reputation: 1280,
    role: "user",
    followers: ["u4", "u7"],
    followingTopics: ["t15", "t9"],
    followingUsers: ["u4"],
  },
  {
    id: "u10",
    username: "atlas",
    name: "Atlas Morgan",
    email: "atlas@nexus.app",
    avatar: AVATARS[9],
    bio: "Designer. Systems thinker. Maker of small, useful things.",
    joinedDate: iso(30 * day),
    reputation: 980,
    role: "user",
    followers: ["u6", "u8"],
    followingTopics: ["t4", "t16"],
    followingUsers: ["u6"],
  },
  {
    id: "u11",
    username: "rigel",
    name: "Rigel Ali",
    email: "rigel@nexus.app",
    avatar: AVATARS[10],
    bio: "Biologist. Genetics, evolution, and the code of life.",
    joinedDate: iso(20 * day),
    reputation: 720,
    role: "user",
    followers: ["u5"],
    followingTopics: ["t17", "t1"],
    followingUsers: [],
  },
  {
    id: "u12",
    username: "cosmo",
    name: "Cosmo Bauer",
    email: "cosmo@nexus.app",
    avatar: AVATARS[11],
    bio: "Economist. Game theory, networks, and emergent behavior.",
    joinedDate: iso(10 * day),
    reputation: 540,
    role: "user",
    followers: ["u9"],
    followingTopics: ["t18", "t11"],
    followingUsers: [],
  },
];

const seedTopics: Topic[] = [
  // Science
  { id: "t1", name: "Science", slug: "science", description: "The systematic study of the natural world through observation and experiment.", banner: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#8b5cf6", icon: "🔬", parentId: null, followers: ["u1","u2","u3","u5","u7","u9","u11"], postCount: 142, createdAt: iso(200*day) },
  { id: "t2", name: "Physics", slug: "physics", description: "From quantum fields to cosmology — the fundamental laws of nature.", banner: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#3b82f6", icon: "⚛️", parentId: "t1", followers: ["u1","u3","u5","u11"], postCount: 58, createdAt: iso(190*day) },
  { id: "t3", name: "Mechanics", slug: "mechanics", description: "Classical, quantum, and fluid mechanics — motion in all its forms.", banner: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#06b6d4", icon: "🛰️", parentId: "t2", followers: ["u1","u5"], postCount: 18, createdAt: iso(180*day) },
  { id: "t7", name: "Mathematics", slug: "mathematics", description: "The language of patterns — pure and applied.", banner: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#10b981", icon: "📐", parentId: null, followers: ["u5","u1","u3"], postCount: 64, createdAt: iso(180*day) },
  { id: "t8", name: "Astronomy", slug: "astronomy", description: "Stars, galaxies, and the structure of the cosmos.", banner: "linear-gradient(135deg, #1e1b4b, #6366f1)", color: "#6366f1", icon: "🌌", parentId: "t1", followers: ["u3","u1"], postCount: 32, createdAt: iso(170*day) },
  { id: "t17", name: "Biology", slug: "biology", description: "Life in all its forms — from cells to ecosystems.", banner: "linear-gradient(135deg, #84cc16, #10b981)", color: "#84cc16", icon: "🧬", parentId: "t1", followers: ["u11","u7"], postCount: 28, createdAt: iso(160*day) },
  // Tech
  { id: "t4", name: "Technology", slug: "technology", description: "The tools we build to shape the world.", banner: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#f59e0b", icon: "💻", parentId: null, followers: ["u2","u6","u10","u1"], postCount: 188, createdAt: iso(200*day) },
  { id: "t5", name: "Software Engineering", slug: "software-engineering", description: "Practices, patterns, and craft of building software.", banner: "linear-gradient(135deg, #ef4444, #ec4899)", color: "#ec4899", icon: "🧱", parentId: "t4", followers: ["u2","u6","u10"], postCount: 96, createdAt: iso(180*day) },
  { id: "t6", name: "Distributed Systems", slug: "distributed-systems", description: "Consensus, replication, and the architecture of the modern web.", banner: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#ec4899", icon: "🕸️", parentId: "t5", followers: ["u2","u6"], postCount: 41, createdAt: iso(160*day) },
  { id: "t16", name: "Design", slug: "design", description: "Visual, interaction, and systems design for humans.", banner: "linear-gradient(135deg, #f43f5e, #f59e0b)", color: "#f43f5e", icon: "🎨", parentId: "t4", followers: ["u10","u6"], postCount: 52, createdAt: iso(140*day) },
  // Philosophy
  { id: "t9", name: "Philosophy", slug: "philosophy", description: "The love of wisdom — questions that endure.", banner: "linear-gradient(135deg, #8b5cf6, #ec4899)", color: "#8b5cf6", icon: "🤔", parentId: null, followers: ["u1","u4","u9","u12"], postCount: 76, createdAt: iso(190*day) },
  { id: "t10", name: "Ethics", slug: "ethics", description: "What we owe to one another.", banner: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#a855f7", icon: "⚖️", parentId: "t9", followers: ["u4","u9"], postCount: 34, createdAt: iso(170*day) },
  { id: "t11", name: "Existentialism", slug: "existentialism", description: "Freedom, choice, and the search for meaning.", banner: "linear-gradient(135deg, #6366f1, #3b82f6)", color: "#6366f1", icon: "🕯️", parentId: "t9", followers: ["u4","u12"], postCount: 22, createdAt: iso(150*day) },
  { id: "t15", name: "History of Science", slug: "history-of-science", description: "How we came to know what we know.", banner: "linear-gradient(135deg, #14b8a6, #84cc16)", color: "#14b8a6", icon: "📜", parentId: "t9", followers: ["u9","u1"], postCount: 18, createdAt: iso(130*day) },
  // Neuroscience / cognition
  { id: "t12", name: "Neuroscience", slug: "neuroscience", description: "The brain — how it works and what it tells us about ourselves.", banner: "linear-gradient(135deg, #f97316, #ef4444)", color: "#f97316", icon: "🧠", parentId: null, followers: ["u7","u1","u11"], postCount: 44, createdAt: iso(140*day) },
  // Climate / Earth
  { id: "t13", name: "Climate", slug: "climate", description: "Earth's climate system — past, present, and future.", banner: "linear-gradient(135deg, #06b6d4, #10b981)", color: "#06b6d4", icon: "🌍", parentId: null, followers: ["u8","u3"], postCount: 38, createdAt: iso(120*day) },
  { id: "t14", name: "Earth Sciences", slug: "earth-sciences", description: "Geology, oceans, atmosphere — the planet itself.", banner: "linear-gradient(135deg, #0891b2, #06b6d4)", color: "#0891b2", icon: "🏔️", parentId: "t13", followers: ["u8"], postCount: 16, createdAt: iso(100*day) },
  // Economics
  { id: "t18", name: "Economics", slug: "economics", description: "Markets, incentives, and the science of choice.", banner: "linear-gradient(135deg, #eab308, #f59e0b)", color: "#eab308", icon: "📈", parentId: null, followers: ["u12","u9"], postCount: 26, createdAt: iso(110*day) },
];

const POST_BODY = (intro: string, sections: { h: string; p: string }[]) =>
  `${intro}\n\n${sections
    .map((s) => `## ${s.h}\n\n${s.p}`)
    .join("\n\n")}`;

const seedPosts: Post[] = [
  {
    id: "p1",
    authorId: "u1",
    topicIds: ["t3", "t2"],
    title: "Why Newton's Third Law is Wildly Misunderstood",
    preview:
      "Most people think 'every action has an equal and opposite reaction' is just about pushing back. It's actually a deep statement about the symmetry of interactions.",
    content: POST_BODY(
      "We've all heard it: *every action has an equal and opposite reaction*. But the textbook version obscures something beautiful — Newton's third law is really a statement about the **conservation of momentum** and the symmetry of physical interactions.",
      [
        {
          h: "The common misunderstanding",
          p: "People imagine pushing a wall and the wall pushing back. That's true, but trivial. The deeper point is that forces always come in pairs — they are interactions, not properties of single objects. There is no such thing as a 'one-sided' force in classical mechanics.",
        },
        {
          h: "Conservation of momentum",
          p: "If you take Newton's third law seriously, momentum conservation falls out almost for free. Sum the forces on a closed system and the internal forces cancel pairwise. What's left is `dp/dt = F_external`. This is why rockets work in vacuum — and why you can't pull yourself up by your own bootstraps.",
        },
        {
          h: "When it breaks down",
          p: "Relativity and quantum field theory modify the picture. In relativistic mechanics, forces need not be simultaneous, and the third law has to be reformulated in terms of momentum flow through fields. But the *spirit* — symmetry and conservation — survives.",
        },
        {
          h: "Takeaway",
          p: "The third law isn't a quirky rule about pushing. It's the first hint that **interactions are fundamental**, not objects. Modern physics took that hint and ran with it, all the way to gauge theories and the Standard Model.",
        },
      ]
    ),
    images: [],
    createdAt: iso(2 * day),
    upvotes: ["u2","u3","u4","u5","u7","u9","u10"],
    downvotes: [],
    bookmarks: ["u3","u6"],
    commentIds: ["c1","c2","c4"],
    views: 1840,
    tags: ["physics","classical-mechanics","symmetry"],
  },
  {
    id: "p2",
    authorId: "u2",
    topicIds: ["t6","t5"],
    title: "CAP Theorem: A Misunderstood Friend",
    preview:
      "People treat CAP like a hard ceiling. In practice, it's a continuum — and most modern systems live comfortably in the middle.",
    content: POST_BODY(
      "The CAP theorem is one of the most cited — and most misapplied — ideas in distributed systems. Let's set the record straight.",
      [
        { h: "What CAP actually says", p: "During a network partition, you must choose between **consistency** and **availability**. That's it. There is no third thing you give up. Outside of a partition, you can have both." },
        { h: "Why 'pick two' is misleading", p: "The popular framing of 'pick two of three' suggests a static tradeoff. In reality, partitions are rare in well-engineered networks, and the real question is *what you do when one occurs*." },
        { h: "PACELC is the better frame", p: "PACELC extends CAP: **if Partitioned, choose Availability or Consistency; Else, choose Latency or Consistency**. This captures the everyday tradeoff that engineers actually face." },
        { h: "Practical guidance", p: "For most applications, eventual consistency with strong read-your-writes for the user who wrote the data is the sweet spot. Reserve linearizability for the few things that truly need it (financial ledgers, coordination)." },
      ]
    ),
    images: [],
    createdAt: iso(1.2 * day),
    upvotes: ["u1","u3","u6","u8","u10"],
    downvotes: [],
    bookmarks: ["u1","u6"],
    commentIds: ["c3"],
    views: 1240,
    tags: ["distributed-systems","cap","consistency"],
  },
  {
    id: "p3",
    authorId: "u3",
    topicIds: ["t8","t2"],
    title: "What's Actually Inside a Black Hole? (We Don't Know)",
    preview:
      "Despite a century of theory, the interior of a black hole remains a frontier. Here's a tour of the leading ideas — and why each one is uncomfortable.",
    content: POST_BODY(
      "Black holes are nature's most extreme laboratories. We understand their exteriors remarkably well — thanks to general relativity — but their interiors remain a mystery.",
      [
        { h: "The classical picture", p: "Once you cross the event horizon, all paths lead inward. The singularity at `r=0` is unavoidable. But 'singularity' is really GR's way of saying *this theory has given up*." },
        { h: "Quantum gravity candidates", p: "String theory suggests the singularity may be replaced by a 'fuzzball' — a tangle of fundamental strings. Loop quantum gravity suggests a 'planck star' that bounces back. Neither is settled." },
        { h: "The holographic twist", p: "The AdS/CFT correspondence hints that the interior may not even be a 'place' in the traditional sense — it could be an emergent description of boundary degrees of freedom." },
        { h: "Why it matters", p: "Resolving the black hole interior is widely believed to require a working theory of quantum gravity. Whatever the answer is, it will reshape our understanding of space and time." },
      ]
    ),
    images: [],
    createdAt: iso(0.6 * day),
    upvotes: ["u1","u2","u4","u5","u7","u9","u11"],
    downvotes: [],
    bookmarks: ["u1","u4","u9"],
    commentIds: [],
    views: 2120,
    tags: ["black-holes","general-relativity","quantum-gravity"],
  },
  {
    id: "p4",
    authorId: "u4",
    topicIds: ["t11","t9"],
    title: "On Freedom: Sartre Was Almost Right",
    preview:
      "Sartre's 'condemned to be free' captures something real, but underestimates how much of our freedom is structured by what we can meaningfully choose between.",
    content: POST_BODY(
      "Jean-Paul Sartre famously claimed we are 'condemned to be free.' The line has a striking ring to it. But I think it papers over an important nuance.",
      [
        { h: "What Sartre got right", p: "Freedom is inescapable. Even refusing to choose is a choice. We are responsible for who we become, and there is no external authority to offload that responsibility onto." },
        { h: "What he missed", p: "Freedom is not just the absence of constraints — it's also the *presence of meaningful options*. A person in extreme poverty is technically 'free' to leave, but the option is hollow." },
        { h: "Amartya Sen's correction", p: "Sen's capability approach reframes freedom as the *actual ability* to pursue valued functionings. This connects freedom to material conditions, not just formal choice." },
        { h: "A synthesis", p: "Sartre was right that we bear final responsibility. But we should also recognize that the *quality* of our freedom depends on the world we share. Existentialism needs a social dimension." },
      ]
    ),
    images: [],
    createdAt: iso(0.4 * day),
    upvotes: ["u1","u7","u9","u12"],
    downvotes: [],
    bookmarks: ["u9"],
    commentIds: [],
    views: 880,
    tags: ["existentialism","sartre","freedom"],
  },
  {
    id: "p5",
    authorId: "u5",
    topicIds: ["t7","t3"],
    title: "The Most Beautiful Proof in Mathematics",
    preview:
      "Why there are infinitely many primes — Euclid's proof is short, ancient, and impossible to forget once you see it.",
    content: POST_BODY(
      "Some proofs are clever. Some are deep. A rare few are *beautiful*. Euclid's proof that there are infinitely many primes is all three.",
      [
        { h: "The proof", p: "Assume there are finitely many primes, say `p_1, p_2, ..., p_n`. Consider `N = p_1 * p_2 * ... * p_n + 1`. Either N is prime (and not in our list), or it's divisible by a prime not in our list. Either way, contradiction. ∎" },
        { h: "Why it's beautiful", p: "It's constructive *enough* — it shows you how to find a new prime from any finite list — but it never actually constructs the prime. It works by *refusing* to compute, which is oddly elegant." },
        { h: "What it teaches", p: "Beauty in proof often comes from minimal assumptions. Euclid doesn't need unique factorization, doesn't need the fundamental theorem of arithmetic, doesn't even need a strong notion of primality. Just enough to reach the conclusion." },
        { h: "A personal note", p: "I think every mathematician has a short list of proofs they would show to a curious stranger. This one is always on mine." },
      ]
    ),
    images: [],
    createdAt: iso(0.3 * day),
    upvotes: ["u1","u2","u3","u6","u9","u11"],
    downvotes: [],
    bookmarks: ["u1","u3"],
    commentIds: [],
    views: 1520,
    tags: ["mathematics","proof","primes"],
  },
  {
    id: "p6",
    authorId: "u7",
    topicIds: ["t12"],
    title: "Your Brain Predicts Reality Before You See It",
    preview:
      "Perception isn't a passive feed from the senses. It's an active prediction the brain constantly refines. Here's how predictive processing is rewriting neuroscience.",
    content: POST_BODY(
      "The classical view of perception is a feedforward pipeline: light hits the retina, gets processed, and out pops a conscious experience. The modern view is almost the opposite.",
      [
        { h: "Predictive processing", p: "The brain is constantly generating predictions about sensory input *before* the input arrives. Sensory data is then used to update the predictions — not to construct perception from scratch." },
        { h: "Why this is efficient", p: "The world is mostly stable. It's far cheaper to predict 'the room looks the same' and correct only for surprise than to re-render the whole scene every millisecond." },
        { h: "Surprising consequences", p: "This explains why we sometimes 'see' what we expect rather than what's there, why hallucinations happen, and why attention changes perception itself." },
        { h: "Open questions", p: "How exactly predictions are generated, where they live in the cortex, and how they interface with consciousness — all still hotly debated. But the framework itself is reshaping the field." },
      ]
    ),
    images: [],
    createdAt: iso(0.2 * day),
    upvotes: ["u1","u3","u4","u8","u11"],
    downvotes: [],
    bookmarks: ["u1","u11"],
    commentIds: [],
    views: 980,
    tags: ["neuroscience","perception","prediction"],
  },
  {
    id: "p7",
    authorId: "u8",
    topicIds: ["t13","t14"],
    title: "Climate Tipping Points: A Primer",
    preview:
      "The IPCC identifies several 'tipping points' — thresholds beyond which change becomes self-sustaining. Here's a non-alarmist tour of the candidates.",
    content: POST_BODY(
      "Climate discourse is full of the word 'tipping point.' But what does it actually mean, and which ones should we actually worry about?",
      [
        { h: "What is a tipping point?", p: "A tipping point is a threshold beyond which a system undergoes large, often irreversible change — even if the forcing stops. Think of a canoe: you can lean slowly up to a point, then it flips all at once." },
        { h: "The big candidates", p: "Greenland ice sheet collapse, Amazon rainforest dieback, AMOC slowdown, permafrost carbon release, coral reef die-off. Each has its own threshold and timescale." },
        { h: "Why 'irreversible' matters", p: "Some tipping points commit us to change over centuries, not decades. That means decisions made in the next 20 years could shape the next 10,000." },
        { h: "The honest framing", p: "Tipping points are reasons to act *urgently*, not reasons to despair. Many are still avoidable, and the same physics that produces them also gives us leverage to steer the system." },
      ]
    ),
    images: [],
    createdAt: iso(0.15 * day),
    upvotes: ["u1","u3","u9","u12"],
    downvotes: [],
    bookmarks: ["u9","u12"],
    commentIds: [],
    views: 760,
    tags: ["climate","tipping-points","ipcc"],
  },
  {
    id: "p8",
    authorId: "u6",
    topicIds: ["t5","t16"],
    title: "Designing Empty States That Don't Feel Empty",
    preview:
      "An empty state is not a dead end — it's an invitation. Here's how to design them so users feel guided, not abandoned.",
    content: POST_BODY(
      "Empty states are the most overlooked part of UI design. They're also one of the most important.",
      [
        { h: "The three jobs of an empty state", p: "1. Explain what's missing. 2. Tell the user what to do next. 3. Make them feel like they're still in a coherent place, not a broken one." },
        { h: "Common anti-patterns", p: "Generic 'No data' text. Cute illustrations that obscure the message. CTAs that send users into another empty state. The cardinal sin: silence." },
        { h: "A simple recipe", p: "Icon + headline + one-line explanation + one clear primary action. That's it. Anything more should be earned by the surrounding context." },
        { h: "Real-world examples", p: "Notion's 'Type / for commands'. Linear's 'Create your first issue'. Stripe's dashboard before any transactions. All do the same three jobs, each in their own voice." },
      ]
    ),
    images: [],
    createdAt: iso(0.1 * day),
    upvotes: ["u2","u10","u1"],
    downvotes: [],
    bookmarks: ["u10"],
    commentIds: [],
    views: 420,
    tags: ["design","ux","empty-states"],
  },
];

const seedComments: Comment[] = [
  {
    id: "c1",
    postId: "p1",
    authorId: "u2",
    parentId: null,
    content: "The bit about momentum conservation is what finally made it click for me in undergrad. Should be taught that way from the start.",
    createdAt: iso(1.8 * day),
    upvotes: ["u1","u3","u5"],
    downvotes: [],
    mentions: [],
  },
  {
    id: "c2",
    postId: "p1",
    authorId: "u3",
    parentId: "c1",
    content: "Agreed. The 'forces come in pairs' framing is also where the idea of a *field* starts to become necessary — you need a carrier for the interaction.",
    createdAt: iso(1.7 * day),
    upvotes: ["u1","u2"],
    downvotes: [],
    mentions: [],
  },
  {
    id: "c4",
    postId: "p1",
    authorId: "u5",
    parentId: null,
    content: "Question: does the relativistic reformulation still preserve a kind of pairwise structure, or does that break entirely?",
    createdAt: iso(1.5 * day),
    upvotes: ["u1"],
    downvotes: [],
    mentions: [],
  },
  {
    id: "c3",
    postId: "p2",
    authorId: "u6",
    parentId: null,
    content: "PACELC is *so* much more useful in practice. I wish more interview prep covered it instead of just CAP.",
    createdAt: iso(1.0 * day),
    upvotes: ["u2","u10"],
    downvotes: [],
    mentions: ["u2"],
  },
];

const seedNotifications: AppNotification[] = [
  { id: "n1", userId: "u1", type: "like", actorId: "u2", postId: "p1", message: "@neo upvoted your post \"Why Newton's Third Law is Wildly Misunderstood\"", createdAt: iso(1.5*day), read: false },
  { id: "n2", userId: "u1", type: "reply", actorId: "u2", postId: "p1", commentId: "c1", message: "@neo replied to your post", createdAt: iso(1.8*day), read: false },
  { id: "n3", userId: "u1", type: "mention", actorId: "u3", postId: "p1", commentId: "c2", message: "@quasar mentioned you in a comment", createdAt: iso(1.7*day), read: true },
  { id: "n4", userId: "u1", type: "follow", actorId: "u5", message: "@lyra started following you", createdAt: iso(0.8*day), read: false },
  { id: "n5", userId: "u1", type: "topic_update", topicId: "t2", message: "New trending post in Physics", createdAt: iso(0.3*day), read: false },
];

const seedReports: Report[] = [
  { id: "r1", reporterId: "u3", targetType: "post", targetId: "p5", reason: "Misleading title", details: "I don't think this is actually the *most* beautiful proof — subjective claim.", status: "pending", createdAt: iso(0.2*day) },
  { id: "r2", reporterId: "u6", targetType: "comment", targetId: "c3", reason: "Spam", status: "pending", createdAt: iso(0.1*day) },
];

const seedAuditLogs: AuditLog[] = [
  { id: "a1", actorId: "u1", action: "post.create", targetType: "post", targetId: "p1", createdAt: iso(2*day) },
  { id: "a2", actorId: "u2", action: "post.create", targetType: "post", targetId: "p2", createdAt: iso(1.2*day) },
];

const seedBookmarkFolders: BookmarkFolder[] = [
  { id: "bf1", userId: "u1", name: "Read later", postIds: ["p3","p5"], createdAt: iso(1*day) },
  { id: "bf2", userId: "u1", name: "Physics", postIds: ["p1"], createdAt: iso(0.5*day) },
];

// ============================================================================
// Store
// ============================================================================

interface NexusState {
  // bootstrapping
  bootstrapped: boolean;
  bootstrap: () => void;

  // session
  session: Session | null;
  signIn: (userId?: ID) => void;
  signOut: () => void;
  signedInUser: () => User | undefined;

  // data
  users: User[];
  topics: Topic[];
  posts: Post[];
  comments: Comment[];
  notifications: AppNotification[];
  reports: Report[];
  auditLogs: AuditLog[];
  bookmarkFolders: BookmarkFolder[];
  drafts: Draft[];

  // navigation
  view: View;
  viewHistory: View[];
  recentSearches: string[];
  setView: (v: View) => void;
  goBack: () => void;
  addRecentSearch: (q: string) => void;

  // post interactions
  upvotePost: (postId: ID) => void;
  downvotePost: (postId: ID) => void;
  bookmarkPost: (postId: ID, folderId?: ID) => void;
  createPost: (data: { title: string; content: string; topicIds: ID[]; images?: PostImage[]; tags?: string[] }) => ID;
  updatePost: (postId: ID, data: Partial<Pick<Post, "title" | "content" | "topicIds" | "tags" | "images">>) => void;
  deletePost: (postId: ID) => void;
  removePost: (postId: ID, reason: string) => void;
  saveDraft: (draft: Omit<Draft, "id" | "updatedAt"> & { id?: ID }) => ID;
  deleteDraft: (id: ID) => void;

  // comment interactions
  upvoteComment: (commentId: ID) => void;
  downvoteComment: (commentId: ID) => void;
  addComment: (data: { postId: ID; parentId: ID | null; content: string; mentions?: ID[] }) => ID;
  editComment: (commentId: ID, content: string) => void;
  deleteComment: (commentId: ID) => void;

  // topic interactions
  followTopic: (topicId: ID) => void;
  unfollowTopic: (topicId: ID) => void;
  isFollowingTopic: (topicId: ID) => boolean;

  // user interactions
  followUser: (userId: ID) => void;
  unfollowUser: (userId: ID) => void;
  isFollowingUser: (userId: ID) => boolean;
  updateProfile: (data: Partial<Pick<User, "name" | "bio" | "website" | "avatar" | "location">>) => void;
  banUser: (userId: ID) => void;
  unbanUser: (userId: ID) => void;
  setRole: (userId: ID, role: UserRole) => void;

  // notifications
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  unreadNotificationCount: () => number;

  // bookmarks
  createBookmarkFolder: (name: string) => ID;
  deleteBookmarkFolder: (id: ID) => void;
  renameBookmarkFolder: (id: ID, name: string) => void;
  moveBookmark: (postId: ID, fromFolderId: ID | null, toFolderId: ID | null) => void;

  // moderation
  reportTarget: (data: { targetType: Report["targetType"]; targetId: ID; reason: string; details?: string }) => void;
  resolveReport: (id: ID, resolution: "resolved" | "dismissed") => void;

  // selectors
  getPost: (id: ID) => Post | undefined;
  getUser: (id: ID) => User | undefined;
  getTopic: (id: ID) => Topic | undefined;
  getCommentsForPost: (postId: ID) => Comment[];
  getComment: (id: ID) => Comment | undefined;
  getChildComments: (parentId: ID) => Comment[];
  getTopicPosts: (topicId: ID, sort?: "trending" | "latest" | "popular") => Post[];
  getUserPosts: (userId: ID) => Post[];
  getUserComments: (userId: ID) => Comment[];
  searchAll: (query: string, filter?: SearchFilter) => { posts: Post[]; topics: Topic[]; users: User[] };
  getRelatedTopics: (topicId: ID) => Topic[];
  getTopContributors: (topicId: ID) => { user: User; count: number }[];
  getTrendingPosts: (limit?: number) => Post[];
  getPopularPosts: (limit?: number) => Post[];
  getLatestPosts: (limit?: number) => Post[];
  getFollowingPosts: (userId: ID) => Post[];
  getFeed: (tab: FeedTab) => Post[];
  getBookmarkedPosts: (userId: ID) => Post[];
  getAuditLogs: () => AuditLog[];
  getAllChildCommentIds: (commentId: ID) => ID[];
}

const initialState = {
  users: seedUsers,
  topics: seedTopics,
  posts: seedPosts,
  comments: seedComments,
  notifications: seedNotifications,
  reports: seedReports,
  auditLogs: seedAuditLogs,
  bookmarkFolders: seedBookmarkFolders,
  drafts: [] as Draft[],
  view: { name: "home", feed: "trending" } as View,
  viewHistory: [] as View[],
  recentSearches: [] as string[],
  bootstrapped: false,
  session: null as Session | null,
};

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      ...initialState,

      bootstrap: () => {
        set({ bootstrapped: true });
      },

      signIn: (userId = "u1") => {
        set({
          session: { userId, startedAt: new Date().toISOString() },
          view: { name: "home", feed: "trending" },
        });
      },

      signOut: () => {
        set({ session: null, view: { name: "home", feed: "trending" } });
      },

      signedInUser: () => {
        const s = get().session;
        if (!s) return undefined;
        return get().users.find((u) => u.id === s.userId);
      },

      setView: (v) => {
        const current = get().view;
        set({
          view: v,
          viewHistory: [...get().viewHistory, current].slice(-50),
        });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },

      goBack: () => {
        const hist = [...get().viewHistory];
        const prev = hist.pop();
        if (prev) set({ view: prev, viewHistory: hist });
      },

      addRecentSearch: (q) => {
        if (!q.trim()) return;
        const next = [q, ...get().recentSearches.filter((s) => s !== q)].slice(0, 10);
        set({ recentSearches: next });
      },

      // -------- Posts --------
      upvotePost: (postId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          posts: st.posts.map((p) => {
            if (p.id !== postId) return p;
            const upvoted = p.upvotes.includes(s.userId);
            return {
              ...p,
              upvotes: upvoted ? p.upvotes.filter((u) => u !== s.userId) : [...p.upvotes, s.userId],
              downvotes: p.downvotes.filter((u) => u !== s.userId),
            };
          }),
        }));
      },

      downvotePost: (postId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          posts: st.posts.map((p) => {
            if (p.id !== postId) return p;
            const downvoted = p.downvotes.includes(s.userId);
            return {
              ...p,
              downvotes: downvoted ? p.downvotes.filter((u) => u !== s.userId) : [...p.downvotes, s.userId],
              upvotes: p.upvotes.filter((u) => u !== s.userId),
            };
          }),
        }));
      },

      bookmarkPost: (postId, folderId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          posts: st.posts.map((p) => {
            if (p.id !== postId) return p;
            const has = p.bookmarks.includes(s.userId);
            return {
              ...p,
              bookmarks: has ? p.bookmarks.filter((u) => u !== s.userId) : [...p.bookmarks, s.userId],
            };
          }),
          bookmarkFolders: folderId
            ? st.bookmarkFolders.map((f) =>
                f.id === folderId && !f.postIds.includes(postId)
                  ? { ...f, postIds: [...f.postIds, postId] }
                  : f
              )
            : st.bookmarkFolders,
        }));
      },

      createPost: (data) => {
        const s = get().session; if (!s) return "";
        const id = "p" + Math.random().toString(36).slice(2, 9);
        const post: Post = {
          id,
          authorId: s.userId,
          topicIds: data.topicIds,
          title: data.title,
          preview: data.content.replace(/[#>*`_~\-\[\]\(\)!]/g, "").slice(0, 160).trim(),
          content: data.content,
          images: data.images ?? [],
          createdAt: new Date().toISOString(),
          upvotes: [],
          downvotes: [],
          bookmarks: [],
          commentIds: [],
          views: 0,
          tags: data.tags ?? [],
        };
        set((st) => ({
          posts: [post, ...st.posts],
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "post.create", targetType: "post", targetId: id, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
          topics: st.topics.map((t) => data.topicIds.includes(t.id) ? { ...t, postCount: t.postCount + 1 } : t),
        }));
        return id;
      },

      updatePost: (postId, data) => {
        set((st) => ({
          posts: st.posts.map((p) =>
            p.id === postId
              ? { ...p, ...data, updatedAt: new Date().toISOString(), preview: (data.content ?? p.content).replace(/[#>*`_~\-\[\]\(\)!]/g, "").slice(0,160).trim() }
              : p
          ),
        }));
      },

      deletePost: (postId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          posts: st.posts.filter((p) => p.id !== postId),
          comments: st.comments.filter((c) => c.postId !== postId),
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "post.delete", targetType: "post", targetId: postId, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
      },

      removePost: (postId, reason) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          posts: st.posts.map((p) => p.id === postId ? { ...p, removed: true, removedReason: reason } : p),
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "post.remove", targetType: "post", targetId: postId, metadata: reason, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
      },

      saveDraft: (draft) => {
        const id = draft.id ?? "d" + Math.random().toString(36).slice(2, 9);
        set((st) => {
          const exists = st.drafts.find((d) => d.id === id);
          const updated = { ...draft, id, updatedAt: new Date().toISOString() };
          return {
            drafts: exists
              ? st.drafts.map((d) => d.id === id ? updated : d)
              : [updated, ...st.drafts],
          };
        });
        return id;
      },

      deleteDraft: (id) => {
        set((st) => ({ drafts: st.drafts.filter((d) => d.id !== id) }));
      },

      // -------- Comments --------
      upvoteComment: (commentId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          comments: st.comments.map((c) => {
            if (c.id !== commentId) return c;
            const upvoted = c.upvotes.includes(s.userId);
            return {
              ...c,
              upvotes: upvoted ? c.upvotes.filter((u) => u !== s.userId) : [...c.upvotes, s.userId],
              downvotes: c.downvotes.filter((u) => u !== s.userId),
            };
          }),
        }));
      },

      downvoteComment: (commentId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          comments: st.comments.map((c) => {
            if (c.id !== commentId) return c;
            const downvoted = c.downvotes.includes(s.userId);
            return {
              ...c,
              downvotes: downvoted ? c.downvotes.filter((u) => u !== s.userId) : [...c.downvotes, s.userId],
              upvotes: c.upvotes.filter((u) => u !== s.userId),
            };
          }),
        }));
      },

      addComment: (data) => {
        const s = get().session; if (!s) return "";
        const id = "c" + Math.random().toString(36).slice(2, 9);
        const comment: Comment = {
          id,
          postId: data.postId,
          authorId: s.userId,
          parentId: data.parentId,
          content: data.content,
          createdAt: new Date().toISOString(),
          upvotes: [],
          downvotes: [],
          mentions: data.mentions ?? [],
        };
        set((st) => ({
          comments: [...st.comments, comment],
          posts: st.posts.map((p) => p.id === data.postId ? { ...p, commentIds: [...p.commentIds, id] } : p),
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "comment.create", targetType: "comment", targetId: id, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
        return id;
      },

      editComment: (commentId, content) => {
        set((st) => ({
          comments: st.comments.map((c) => c.id === commentId ? { ...c, content, updatedAt: new Date().toISOString() } : c),
        }));
      },

      deleteComment: (commentId) => {
        const s = get().session; if (!s) return;
        const childIds = get().getAllChildCommentIds(commentId);
        const all = [commentId, ...childIds];
        set((st) => ({
          comments: st.comments.filter((c) => !all.includes(c.id)),
          posts: st.posts.map((p) => ({ ...p, commentIds: p.commentIds.filter((id) => !all.includes(id)) })),
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "comment.delete", targetType: "comment", targetId: commentId, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
      },

      // -------- Topics --------
      followTopic: (topicId) => {
        const s = get().session; if (!s) return;
        if (get().isFollowingTopic(topicId)) return;
        set((st) => ({
          topics: st.topics.map((t) => t.id === topicId ? { ...t, followers: [...t.followers, s.userId] } : t),
          users: st.users.map((u) => u.id === s.userId ? { ...u, followingTopics: [...u.followingTopics, topicId] } : u),
        }));
      },

      unfollowTopic: (topicId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          topics: st.topics.map((t) => t.id === topicId ? { ...t, followers: t.followers.filter((u) => u !== s.userId) } : t),
          users: st.users.map((u) => u.id === s.userId ? { ...u, followingTopics: u.followingTopics.filter((id) => id !== topicId) } : u),
        }));
      },

      isFollowingTopic: (topicId) => {
        const s = get().session; if (!s) return false;
        return get().topics.find((t) => t.id === topicId)?.followers.includes(s.userId) ?? false;
      },

      // -------- Users --------
      followUser: (userId) => {
        const s = get().session; if (!s || s.userId === userId) return;
        if (get().isFollowingUser(userId)) return;
        set((st) => ({
          users: st.users.map((u) => {
            if (u.id === userId) return { ...u, followers: [...u.followers, s.userId] };
            if (u.id === s.userId) return { ...u, followingUsers: [...u.followingUsers, userId] };
            return u;
          }),
        }));
      },

      unfollowUser: (userId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          users: st.users.map((u) => {
            if (u.id === userId) return { ...u, followers: u.followers.filter((id) => id !== s.userId) };
            if (u.id === s.userId) return { ...u, followingUsers: u.followingUsers.filter((id) => id !== userId) };
            return u;
          }),
        }));
      },

      isFollowingUser: (userId) => {
        const s = get().session; if (!s) return false;
        return get().users.find((u) => u.id === userId)?.followers.includes(s.userId) ?? false;
      },

      updateProfile: (data) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          users: st.users.map((u) => u.id === s.userId ? { ...u, ...data } : u),
        }));
      },

      banUser: (userId) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          users: st.users.map((u) => u.id === userId ? { ...u, banned: true } : u),
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "user.ban", targetType: "user", targetId: userId, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
      },

      unbanUser: (userId) => {
        set((st) => ({
          users: st.users.map((u) => u.id === userId ? { ...u, banned: false } : u),
        }));
      },

      setRole: (userId, role) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          users: st.users.map((u) => u.id === userId ? { ...u, role } : u),
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "user.role", targetType: "user", targetId: userId, metadata: role, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
      },

      // -------- Notifications --------
      markNotificationRead: (id) => {
        set((st) => ({
          notifications: st.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        }));
      },

      markAllNotificationsRead: () => {
        set((st) => ({
          notifications: st.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      unreadNotificationCount: () => {
        const s = get().session; if (!s) return 0;
        return get().notifications.filter((n) => n.userId === s.userId && !n.read).length;
      },

      // -------- Bookmarks --------
      createBookmarkFolder: (name) => {
        const s = get().session; if (!s) return "";
        const id = "bf" + Math.random().toString(36).slice(2, 9);
        set((st) => ({
          bookmarkFolders: [...st.bookmarkFolders, { id, userId: s.userId, name, postIds: [], createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      deleteBookmarkFolder: (id) => {
        set((st) => ({ bookmarkFolders: st.bookmarkFolders.filter((f) => f.id !== id) }));
      },

      renameBookmarkFolder: (id, name) => {
        set((st) => ({
          bookmarkFolders: st.bookmarkFolders.map((f) => f.id === id ? { ...f, name } : f),
        }));
      },

      moveBookmark: (postId, fromFolderId, toFolderId) => {
        set((st) => ({
          bookmarkFolders: st.bookmarkFolders.map((f) => {
            if (f.id === fromFolderId) return { ...f, postIds: f.postIds.filter((p) => p !== postId) };
            if (f.id === toFolderId && !f.postIds.includes(postId)) return { ...f, postIds: [...f.postIds, postId] };
            return f;
          }),
        }));
      },

      // -------- Moderation --------
      reportTarget: (data) => {
        const s = get().session; if (!s) return;
        const id = "r" + Math.random().toString(36).slice(2, 9);
        set((st) => ({
          reports: [
            { id, reporterId: s.userId, ...data, status: "pending" as const, createdAt: new Date().toISOString() },
            ...st.reports,
          ],
          auditLogs: [
            { id: "a" + Math.random().toString(36).slice(2,9), actorId: s.userId, action: "report.create", targetType: data.targetType, targetId: data.targetId, createdAt: new Date().toISOString() },
            ...st.auditLogs,
          ],
        }));
      },

      resolveReport: (id, resolution) => {
        const s = get().session; if (!s) return;
        set((st) => ({
          reports: st.reports.map((r) => r.id === id ? { ...r, status: resolution, resolverId: s.userId } : r),
        }));
      },

      // -------- Selectors --------
      getPost: (id) => get().posts.find((p) => p.id === id),

      getUser: (id) => get().users.find((u) => u.id === id),

      getTopic: (id) => get().topics.find((t) => t.id === id),

      getCommentsForPost: (postId) => {
        return get()
          .comments.filter((c) => c.postId === postId && !c.parentId && !c.removed)
          .sort((a, b) => (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length));
      },

      getComment: (id) => get().comments.find((c) => c.id === id),

      getChildComments: (parentId) =>
        get().comments.filter((c) => c.parentId === parentId && !c.removed)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),

      getTopicPosts: (topicId, sort = "latest") => {
        const posts = get().posts.filter((p) => p.topicIds.includes(topicId) && !p.removed);
        if (sort === "trending") {
          return [...posts].sort((a, b) => {
            const ageA = (Date.now() - new Date(a.createdAt).getTime()) / day;
            const ageB = (Date.now() - new Date(b.createdAt).getTime()) / day;
            const scoreA = (a.upvotes.length - a.downvotes.length) / Math.pow(ageA + 2, 1.3);
            const scoreB = (b.upvotes.length - b.downvotes.length) / Math.pow(ageB + 2, 1.3);
            return scoreB - scoreA;
          });
        }
        if (sort === "popular") {
          return [...posts].sort((a, b) => (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length));
        }
        return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getUserPosts: (userId) =>
        get().posts.filter((p) => p.authorId === userId && !p.removed)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

      getUserComments: (userId) =>
        get().comments.filter((c) => c.authorId === userId && !c.removed)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

      searchAll: (query, filter = "all") => {
        const q = query.toLowerCase().trim();
        if (!q) return { posts: [], topics: [], users: [] };
        const posts = filter === "all" || filter === "posts"
          ? get().posts.filter((p) =>
              !p.removed && (
                p.title.toLowerCase().includes(q) ||
                p.preview.toLowerCase().includes(q) ||
                p.tags.some((t) => t.toLowerCase().includes(q))
              )
            ).slice(0, 30)
          : [];
        const topics = filter === "all" || filter === "topics"
          ? get().topics.filter((t) =>
              t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
            ).slice(0, 20)
          : [];
        const users = filter === "all" || filter === "users"
          ? get().users.filter((u) =>
              !u.banned && (
                u.name.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                u.bio.toLowerCase().includes(q)
              )
            ).slice(0, 20)
          : [];
        return { posts, topics, users };
      },

      getRelatedTopics: (topicId) => {
        const topic = get().getTopic(topicId);
        if (!topic) return [];
        // siblings + children + parent
        const siblings = get().topics.filter((t) => t.parentId === topic.parentId && t.id !== topicId);
        const children = get().topics.filter((t) => t.parentId === topicId);
        const parent = topic.parentId ? get().topics.filter((t) => t.id === topic.parentId) : [];
        return [...parent, ...siblings, ...children].slice(0, 8);
      },

      getTopContributors: (topicId) => {
        const posts = get().posts.filter((p) => p.topicIds.includes(topicId) && !p.removed);
        const counts: Record<ID, number> = {};
        posts.forEach((p) => {
          counts[p.authorId] = (counts[p.authorId] ?? 0) + 1;
        });
        return Object.entries(counts)
          .map(([uid, count]) => ({ user: get().getUser(uid)!, count }))
          .filter((x) => x.user)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      },

      getTrendingPosts: (limit = 20) => {
        return [...get().posts]
          .filter((p) => !p.removed)
          .map((p) => {
            const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / day;
            const score = (p.upvotes.length - p.downvotes.length + p.commentIds.length * 2 + p.views / 100) / Math.pow(ageDays + 2, 1.3);
            return { p, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map((x) => x.p);
      },

      getPopularPosts: (limit = 20) =>
        [...get().posts]
          .filter((p) => !p.removed)
          .sort((a, b) => (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length))
          .slice(0, limit),

      getLatestPosts: (limit = 20) =>
        [...get().posts]
          .filter((p) => !p.removed)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit),

      getFollowingPosts: (userId) => {
        const user = get().getUser(userId);
        if (!user) return [];
        const topicIds = new Set(user.followingTopics);
        const userIds = new Set(user.followingUsers);
        return get().posts
          .filter((p) => !p.removed && (p.topicIds.some((t) => topicIds.has(t)) || userIds.has(p.authorId)))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getFeed: (tab) => {
        const s = get().session;
        switch (tab) {
          case "trending": return get().getTrendingPosts();
          case "latest": return get().getLatestPosts();
          case "popular": return get().getPopularPosts();
          case "following": return s ? get().getFollowingPosts(s.userId) : [];
        }
      },

      getBookmarkedPosts: (userId) => get().posts.filter((p) => p.bookmarks.includes(userId) && !p.removed),

      getAuditLogs: () => [...get().auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

      getAllChildCommentIds: (commentId) => {
        const direct = get().comments.filter((c) => c.parentId === commentId).map((c) => c.id);
        return direct.concat(...direct.map(get().getAllChildCommentIds));
      },
    }),
    {
      name: "nexus-store-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))),
      partialize: (s) => ({
        users: s.users,
        topics: s.topics,
        posts: s.posts,
        comments: s.comments,
        notifications: s.notifications,
        reports: s.reports,
        auditLogs: s.auditLogs,
        bookmarkFolders: s.bookmarkFolders,
        drafts: s.drafts,
        recentSearches: s.recentSearches,
        session: s.session,
        view: s.view,
      }),
    }
  )
);
