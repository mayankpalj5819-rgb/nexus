// Generate a comprehensive hierarchical topic tree and insert into Supabase.
// Run: node scripts/seed-topics-massive.js

const PAT = "process.env.SUPABASE_PAT";
const PROJECT_REF = "mxfbotvszuegnzuefznw";

async function q(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// ============================================================================
// Topic tree — comprehensive, hierarchical, multi-domain
// ============================================================================
const TOPICS = [
  // === SCIENCE ===
  { name: "Science", slug: "science", desc: "The systematic study of the natural world through observation and experiment.", icon: "🔬", color: "#8b5cf6", banner: "linear-gradient(135deg, #6366f1, #8b5cf6)", parent: null, children: [
    { name: "Physics", slug: "physics", desc: "The fundamental laws of nature — from quantum fields to cosmology.", icon: "⚛️", color: "#3b82f6", banner: "linear-gradient(135deg, #3b82f6, #6366f1)", children: [
      { name: "Quantum Mechanics", slug: "quantum-mechanics", desc: "The physics of the very small — superposition, entanglement, uncertainty.", icon: "量子", color: "#6366f1" },
      { name: "Relativity", slug: "relativity", desc: "Einstein's theories of special and general relativity.", icon: "🌌", color: "#6366f1" },
      { name: "Classical Mechanics", slug: "classical-mechanics", desc: "Newton's laws, Lagrangian/Hamiltonian mechanics, rigid body dynamics.", icon: "🛰️", color: "#06b6d4" },
      { name: "Thermodynamics", slug: "thermodynamics", desc: "Heat, work, entropy, and the laws governing energy transfer.", icon: "🔥", color: "#ef4444" },
      { name: "Electromagnetism", slug: "electromagnetism", desc: "Electric and magnetic fields, Maxwell's equations, waves.", icon: "⚡", color: "#f59e0b" },
      { name: "Optics", slug: "optics", desc: "Light, lenses, lasers, and optical phenomena.", icon: "🔍", color: "#06b6d4" },
      { name: "Particle Physics", slug: "particle-physics", desc: "The Standard Model, quarks, leptons, gauge bosons.", icon: "⚛️", color: "#8b5cf6" },
      { name: "Astrophysics", slug: "astrophysics", desc: "The physics of stars, galaxies, and the universe.", icon: "🌟", color: "#6366f1" },
      { name: "Condensed Matter", slug: "condensed-matter", desc: "Solids, liquids, superconductors, semiconductors.", icon: "💎", color: "#06b6d4" },
      { name: "Nuclear Physics", slug: "nuclear-physics", desc: "Atomic nuclei, radioactivity, fission and fusion.", icon: "☢️", color: "#ef4444" },
      { name: "String Theory", slug: "string-theory", desc: "Theoretical framework treating particles as vibrating strings.", icon: "🎻", color: "#8b5cf6" },
      { name: "Cosmology", slug: "cosmology", desc: "The origin, evolution, and fate of the universe.", icon: "🌌", color: "#6366f1" },
    ]},
    { name: "Chemistry", slug: "chemistry", desc: "Matter, its properties, structure, and transformations.", icon: "⚗️", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #06b6d4)", children: [
      { name: "Organic Chemistry", slug: "organic-chemistry", desc: "Carbon-containing compounds and their reactions.", icon: "🧪", color: "#10b981" },
      { name: "Inorganic Chemistry", slug: "inorganic-chemistry", desc: "Non-carbon compounds, metals, minerals.", icon: "⛏️", color: "#64748b" },
      { name: "Biochemistry", slug: "biochemistry", desc: "Chemical processes within living organisms.", icon: "🧬", color: "#84cc16" },
      { name: "Physical Chemistry", slug: "physical-chemistry", desc: "Physics applied to chemical systems.", icon: "🔬", color: "#3b82f6" },
      { name: "Analytical Chemistry", slug: "analytical-chemistry", desc: "Methods for separating, identifying, and quantifying matter.", icon: "📊", color: "#f59e0b" },
      { name: "Materials Science", slug: "materials-science", desc: "Designing new materials with specific properties.", icon: "🧱", color: "#64748b" },
    ]},
    { name: "Biology", slug: "biology", desc: "Life in all its forms — from cells to ecosystems.", icon: "🧬", color: "#84cc16", banner: "linear-gradient(135deg, #84cc16, #10b981)", children: [
      { name: "Genetics", slug: "genetics", desc: "Heredity, DNA, genes, and genetic variation.", icon: "🧬", color: "#84cc16" },
      { name: "Evolution", slug: "evolution", desc: "Darwinian evolution, natural selection, speciation.", icon: "🦠", color: "#10b981" },
      { name: "Ecology", slug: "ecology", desc: "Interactions between organisms and their environment.", icon: "🌍", color: "#10b981" },
      { name: "Microbiology", slug: "microbiology", desc: "Microorganisms — bacteria, viruses, fungi, protists.", icon: "🦠", color: "#84cc16" },
      { name: "Neuroscience", slug: "neuroscience", desc: "The brain and nervous system — how they work.", icon: "🧠", color: "#f97316" },
      { name: "Cell Biology", slug: "cell-biology", desc: "The structure and function of cells.", icon: "🔬", color: "#10b981" },
      { name: "Marine Biology", slug: "marine-biology", desc: "Life in the oceans.", icon: "🐙", color: "#06b6d4" },
      { name: "Botany", slug: "botany", desc: "The study of plants.", icon: "🌱", color: "#84cc16" },
      { name: "Zoology", slug: "zoology", desc: "The animal kingdom.", icon: "🦁", color: "#f59e0b" },
      { name: "Immunology", slug: "immunology", desc: "The immune system and how it fights disease.", icon: "💉", color: "#ef4444" },
    ]},
    { name: "Astronomy", slug: "astronomy", desc: "Stars, galaxies, and the structure of the cosmos.", icon: "🌌", color: "#6366f1", banner: "linear-gradient(135deg, #1e1b4b, #6366f1)", children: [
      { name: "Exoplanets", slug: "exoplanets", desc: "Planets orbiting other stars.", icon: "🪐", color: "#6366f1" },
      { name: "Black Holes", slug: "black-holes", desc: "Regions of spacetime where gravity is inescapable.", icon: "⚫", color: "#1e1b4b" },
      { name: "Galaxies", slug: "galaxies", desc: "Vast collections of stars, gas, and dark matter.", icon: "🌌", color: "#6366f1" },
      { name: "Cosmology", slug: "astronomy-cosmology", desc: "The universe's origin, evolution, and fate.", icon: "🌌", color: "#8b5cf6" },
      { name: "Observational Astronomy", slug: "observational-astronomy", desc: "Telescopes, observation techniques, and data analysis.", icon: "🔭", color: "#3b82f6" },
      { name: "Solar System", slug: "solar-system", desc: "The Sun, planets, moons, and smaller bodies.", icon: "☀️", color: "#f59e0b" },
    ]},
    { name: "Earth Sciences", slug: "earth-sciences", desc: "Geology, oceans, atmosphere — the planet itself.", icon: "🏔️", color: "#0891b2", banner: "linear-gradient(135deg, #0891b2, #06b6d4)", children: [
      { name: "Geology", slug: "geology", desc: "Rocks, minerals, plate tectonics, and Earth's history.", icon: "🪨", color: "#64748b" },
      { name: "Meteorology", slug: "meteorology", desc: "Weather and atmospheric phenomena.", icon: "☁️", color: "#06b6d4" },
      { name: "Oceanography", slug: "oceanography", desc: "The physics, chemistry, and biology of oceans.", icon: "🌊", color: "#0891b2" },
      { name: "Climate Science", slug: "climate-science", desc: "Earth's climate system — past, present, and future.", icon: "🌍", color: "#10b981" },
      { name: "Volcanology", slug: "volcanology", desc: "Volcanoes, magma, and eruptions.", icon: "🌋", color: "#ef4444" },
      { name: "Seismology", slug: "seismology", desc: "Earthquakes and seismic waves.", icon: "📊", color: "#f59e0b" },
    ]},
    { name: "Mathematics", slug: "mathematics", desc: "The language of patterns — pure and applied.", icon: "📐", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #06b6d4)", children: [
      { name: "Algebra", slug: "algebra", desc: "Equations, structures, and abstract algebra.", icon: "𝑥", color: "#10b981" },
      { name: "Calculus", slug: "calculus", desc: "Limits, derivatives, integrals, and their applications.", icon: "∫", color: "#06b6d4" },
      { name: "Geometry", slug: "geometry", desc: "Shapes, spaces, and their properties.", icon: "📐", color: "#10b981" },
      { name: "Topology", slug: "topology", desc: "Properties preserved under continuous deformation.", icon: "🍩", color: "#8b5cf6" },
      { name: "Number Theory", slug: "number-theory", desc: "The properties of integers and primes.", icon: "🔢", color: "#f59e0b" },
      { name: "Statistics", slug: "statistics", desc: "Collecting, analyzing, and interpreting data.", icon: "📊", color: "#3b82f6" },
      { name: "Probability", slug: "probability", desc: "The mathematics of uncertainty.", icon: "🎲", color: "#8b5cf6" },
      { name: "Logic", slug: "logic", desc: "Formal reasoning and mathematical logic.", icon: "🤔", color: "#6366f1" },
      { name: "Linear Algebra", slug: "linear-algebra", desc: "Vectors, matrices, and linear transformations.", icon: "📐", color: "#10b981" },
      { name: "Category Theory", slug: "category-theory", desc: "The mathematics of mathematical structures.", icon: "🔗", color: "#8b5cf6" },
      { name: "Discrete Math", slug: "discrete-math", desc: "Combinatorics, graph theory, and discrete structures.", icon: "🕸️", color: "#06b6d4" },
    ]},
  ]},

  // === TECHNOLOGY ===
  { name: "Technology", slug: "technology", desc: "The tools we build to shape the world.", icon: "💻", color: "#f59e0b", banner: "linear-gradient(135deg, #f59e0b, #ef4444)", parent: null, children: [
    { name: "Software Engineering", slug: "software-engineering", desc: "Practices, patterns, and craft of building software.", icon: "🧱", color: "#ec4899", banner: "linear-gradient(135deg, #ef4444, #ec4899)", children: [
      { name: "Web Development", slug: "web-development", desc: "Building websites and web applications.", icon: "🌐", color: "#3b82f6" },
      { name: "Mobile Development", slug: "mobile-development", desc: "iOS, Android, and cross-platform apps.", icon: "📱", color: "#10b981" },
      { name: "Backend Development", slug: "backend-development", desc: "Servers, APIs, databases, and infrastructure.", icon: "🗄️", color: "#64748b" },
      { name: "Frontend Development", slug: "frontend-development", desc: "Everything the user sees and interacts with.", icon: "🎨", color: "#ec4899" },
      { name: "DevOps", slug: "devops", desc: "CI/CD, infrastructure as code, and operations.", icon: "🚀", color: "#06b6d4" },
      { name: "Distributed Systems", slug: "distributed-systems", desc: "Consensus, replication, and scalable architecture.", icon: "🕸️", color: "#8b5cf6" },
      { name: "Databases", slug: "databases", desc: "SQL, NoSQL, and everything in between.", icon: "🗃️", color: "#f59e0b" },
      { name: "APIs", slug: "apis", desc: "REST, GraphQL, gRPC, and API design.", icon: "🔌", color: "#10b981" },
      { name: "Testing", slug: "testing", desc: "Unit, integration, e2e, and property-based testing.", icon: "✅", color: "#84cc16" },
      { name: "Code Review", slug: "code-review", desc: "Best practices for reviewing and being reviewed.", icon: "👁️", color: "#6366f1" },
      { name: "Open Source", slug: "open-source", desc: "Contributing to and maintaining open source projects.", icon: "🔓", color: "#10b981" },
    ]},
    { name: "Programming Languages", slug: "programming-languages", desc: "The languages we use to instruct computers.", icon: "🔤", color: "#3b82f6", banner: "linear-gradient(135deg, #3b82f6, #8b5cf6)", children: [
      { name: "JavaScript", slug: "javascript", desc: "The language of the web.", icon: "🟨", color: "#f59e0b" },
      { name: "TypeScript", slug: "typescript", desc: "JavaScript with types.", icon: "🟦", color: "#3b82f6" },
      { name: "Python", slug: "python", desc: "Versatile language for scripting, data, and ML.", icon: "🐍", color: "#10b981" },
      { name: "Rust", slug: "rust", desc: "Systems programming with memory safety.", icon: "🦀", color: "#ef4444" },
      { name: "Go", slug: "go", desc: "Simple, fast, and concurrent.", icon: "🐹", color: "#06b6d4" },
      { name: "Java", slug: "java", desc: "Write once, run anywhere.", icon: "☕", color: "#ef4444" },
      { name: "C++", slug: "cpp", desc: "Systems programming with control and performance.", icon: "⚙️", color: "#3b82f6" },
      { name: "C", slug: "c-lang", desc: "The foundational systems language.", icon: "⚙️", color: "#64748b" },
      { name: "Swift", slug: "swift", desc: "Apple's modern language for iOS and macOS.", icon: "🕊️", color: "#f59e0b" },
      { name: "Kotlin", slug: "kotlin", desc: "Modern JVM language for Android and beyond.", icon: "🟪", color: "#8b5cf6" },
      { name: "Ruby", slug: "ruby", desc: "A language designed for developer happiness.", icon: "💎", color: "#ef4444" },
      { name: "Haskell", slug: "haskell", desc: "Pure functional programming.", icon: "λ", color: "#6366f1" },
      { name: "Elixir", slug: "elixir", desc: "Concurrent, fault-tolerant applications.", icon: "💧", color: "#6366f1" },
      { name: "Zig", slug: "zig", desc: "A modern alternative to C.", icon: "⚡", color: "#f59e0b" },
    ]},
    { name: "AI & Machine Learning", slug: "ai-ml", desc: "Artificial intelligence, machine learning, and deep learning.", icon: "🤖", color: "#8b5cf6", banner: "linear-gradient(135deg, #8b5cf6, #ec4899)", children: [
      { name: "Large Language Models", slug: "llms", desc: "GPT, Claude, Llama, and the transformer revolution.", icon: "🧠", color: "#8b5cf6" },
      { name: "Computer Vision", slug: "computer-vision", desc: "Teaching machines to see and understand images.", icon: "👁️", color: "#06b6d4" },
      { name: "Reinforcement Learning", slug: "reinforcement-learning", desc: "Learning through interaction and reward.", icon: "🎮", color: "#10b981" },
      { name: "Neural Networks", slug: "neural-networks", desc: "The architecture behind modern AI.", icon: "🕸️", color: "#8b5cf6" },
      { name: "Natural Language Processing", slug: "nlp", desc: "Understanding and generating human language.", icon: "💬", color: "#3b82f6" },
      { name: "AI Ethics", slug: "ai-ethics", desc: "The moral implications of artificial intelligence.", icon: "⚖️", color: "#f59e0b" },
      { name: "AI Safety", slug: "ai-safety", desc: "Ensuring AI systems are safe and aligned.", icon: "🛡️", color: "#ef4444" },
      { name: "Prompt Engineering", slug: "prompt-engineering", desc: "The art of communicating with LLMs.", icon: "✍️", color: "#8b5cf6" },
      { name: "Generative AI", slug: "generative-ai", desc: "AI that creates — images, text, music, code.", icon: "🎨", color: "#ec4899" },
    ]},
    { name: "Hardware", slug: "hardware", desc: "The physical side of computing.", icon: "🔧", color: "#64748b", banner: "linear-gradient(135deg, #64748b, #475569)", children: [
      { name: "CPUs", slug: "cpus", desc: "Processor architecture and performance.", icon: "🔲", color: "#64748b" },
      { name: "GPUs", slug: "gpus", desc: "Graphics processing and parallel computing.", icon: "🎮", color: "#10b981" },
      { name: "Embedded Systems", slug: "embedded-systems", desc: "Computing inside everything else.", icon: "🔌", color: "#f59e0b" },
      { name: "DIY Electronics", slug: "diy-electronics", desc: "Arduino, Raspberry Pi, and maker projects.", icon: "🛠️", color: "#ef4444" },
      { name: "Networking", slug: "networking", desc: "How computers talk to each other.", icon: "🌐", color: "#3b82f6" },
    ]},
    { name: "Cybersecurity", slug: "cybersecurity", desc: "Protecting systems, networks, and data.", icon: "🔒", color: "#ef4444", banner: "linear-gradient(135deg, #ef4444, #f59e0b)", children: [
      { name: "Cryptography", slug: "cryptography", desc: "The mathematics of secure communication.", icon: "🔐", color: "#ef4444" },
      { name: "Web Security", slug: "web-security", desc: "XSS, CSRF, SQL injection, and how to prevent them.", icon: "🛡️", color: "#3b82f6" },
      { name: "Network Security", slug: "network-security", desc: "Firewalls, IDS, and network defense.", icon: "🧱", color: "#64748b" },
      { name: "Reverse Engineering", slug: "reverse-engineering", desc: "Understanding how things work by taking them apart.", icon: "🔍", color: "#8b5cf6" },
      { name: "Privacy", slug: "privacy", desc: "Protecting personal data in a digital world.", icon: "🕵️", color: "#10b981" },
    ]},
    { name: "Web3 & Crypto", slug: "web3", desc: "Blockchain, cryptocurrencies, and decentralized tech.", icon: "⛓️", color: "#f59e0b", banner: "linear-gradient(135deg, #f59e0b, #8b5cf6)", children: [
      { name: "Blockchain", slug: "blockchain", desc: "Distributed ledgers and consensus mechanisms.", icon: "⛓️", color: "#f59e0b" },
      { name: "Cryptocurrencies", slug: "cryptocurrencies", desc: "Bitcoin, Ethereum, and the crypto ecosystem.", icon: "🪙", color: "#f59e0b" },
      { name: "Smart Contracts", slug: "smart-contracts", desc: "Self-executing contracts on the blockchain.", icon: "📜", color: "#8b5cf6" },
      { name: "DeFi", slug: "defi", desc: "Decentralized finance.", icon: "💰", color: "#10b981" },
      { name: "NFTs", slug: "nfts", desc: "Non-fungible tokens and digital ownership.", icon: "🎨", color: "#ec4899" },
    ]},
    { name: "Game Development", slug: "game-development", desc: "Building games — from indie to AAA.", icon: "🎮", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #06b6d4)", children: [
      { name: "Unity", slug: "unity", desc: "The Unity game engine.", icon: "🎮", color: "#64748b" },
      { name: "Unreal Engine", slug: "unreal-engine", desc: "Epic's powerhouse engine.", icon: "🎬", color: "#3b82f6" },
      { name: "Godot", slug: "godot", desc: "The open-source game engine.", icon: "🤖", color: "#3b82f6" },
      { name: "Game Design", slug: "game-design", desc: "Mechanics, narrative, and player experience.", icon: "🎲", color: "#8b5cf6" },
      { name: "Pixel Art", slug: "pixel-art", desc: "The art of pixel-perfect graphics.", icon: "🎨", color: "#ec4899" },
    ]},
    { name: "Design", slug: "design", desc: "Visual, interaction, and systems design.", icon: "🎨", color: "#f43f5e", banner: "linear-gradient(135deg, #f43f5e, #f59e0b)", children: [
      { name: "UI Design", slug: "ui-design", desc: "User interface design — pixels, layouts, components.", icon: "🖼️", color: "#ec4899" },
      { name: "UX Design", slug: "ux-design", desc: "User experience — research, flows, and usability.", icon: "🧭", color: "#3b82f6" },
      { name: "Graphic Design", slug: "graphic-design", desc: "Visual communication through typography and imagery.", icon: "🖌️", color: "#f43f5e" },
      { name: "Typography", slug: "typography", desc: "The art and craft of type.", icon: "🔤", color: "#64748b" },
      { name: "Motion Design", slug: "motion-design", desc: "Animation and motion graphics.", icon: "🎬", color: "#8b5cf6" },
      { name: "Design Systems", slug: "design-systems", desc: "Scalable, consistent design at scale.", icon: "📐", color: "#10b981" },
    ]},
  ]},

  // === PHILOSOPHY & HUMANITIES ===
  { name: "Philosophy", slug: "philosophy", desc: "The love of wisdom — questions that endure.", icon: "🤔", color: "#8b5cf6", banner: "linear-gradient(135deg, #8b5cf6, #ec4899)", parent: null, children: [
    { name: "Ethics", slug: "ethics", desc: "What we owe to one another.", icon: "⚖️", color: "#a855f7" },
    { name: "Existentialism", slug: "existentialism", desc: "Freedom, choice, and the search for meaning.", icon: "🕯️", color: "#6366f1" },
    { name: "Epistemology", slug: "epistemology", desc: "The theory of knowledge — what can we know?", icon: "🧠", color: "#3b82f6" },
    { name: "Metaphysics", slug: "metaphysics", desc: "The nature of reality itself.", icon: "🌌", color: "#8b5cf6" },
    { name: "Logic", slug: "philosophy-logic", desc: "The principles of valid reasoning.", icon: "🔗", color: "#6366f1" },
    { name: "Political Philosophy", slug: "political-philosophy", desc: "Justice, power, and the state.", icon: "🏛️", color: "#f59e0b" },
    { name: "Aesthetics", slug: "aesthetics", desc: "The philosophy of art and beauty.", icon: "🎨", color: "#ec4899" },
    { name: "Stoicism", slug: "stoicism", desc: "Ancient wisdom for modern resilience.", icon: "🗿", color: "#64748b" },
    { name: "Eastern Philosophy", slug: "eastern-philosophy", desc: "Buddhism, Taoism, Confucianism, and beyond.", icon: "☯️", color: "#10b981" },
    { name: "Philosophy of Mind", slug: "philosophy-of-mind", desc: "Consciousness, intentionality, and the self.", icon: "🧠", color: "#8b5cf6" },
    { name: "Philosophy of Science", slug: "philosophy-of-science", desc: "How science works and what it can tell us.", icon: "🔬", color: "#3b82f6" },
  ]},
  { name: "History", slug: "history", desc: "The past is the future, decoded.", icon: "📜", color: "#14b8a6", banner: "linear-gradient(135deg, #14b8a6, #84cc16)", parent: null, children: [
    { name: "Ancient History", slug: "ancient-history", desc: "Civilizations from Sumer to Rome.", icon: "🏛️", color: "#f59e0b" },
    { name: "Medieval History", slug: "medieval-history", desc: "From the fall of Rome to the Renaissance.", icon: "🏰", color: "#64748b" },
    { name: "Modern History", slug: "modern-history", desc: "From the Renaissance to the present.", icon: "🏭", color: "#3b82f6" },
    { name: "History of Science", slug: "history-of-science", desc: "How we came to know what we know.", icon: "🔬", color: "#14b8a6" },
    { name: "Military History", slug: "military-history", desc: "Wars, strategy, and their consequences.", icon: "⚔️", color: "#ef4444" },
    { name: "Cultural History", slug: "cultural-history", desc: "How cultures evolve and interact.", icon: "🎭", color: "#8b5cf6" },
  ]},
  { name: "Linguistics", slug: "linguistics", desc: "The scientific study of language.", icon: "🗣️", color: "#3b82f6", banner: "linear-gradient(135deg, #3b82f6, #06b6d4)", parent: null, children: [
    { name: "Syntax", slug: "syntax", desc: "The structure of sentences.", icon: "🌳", color: "#10b981" },
    { name: "Semantics", slug: "semantics", desc: "The meaning of words and sentences.", icon: "💭", color: "#8b5cf6" },
    { name: "Phonology", slug: "phonology", desc: "The sound systems of language.", icon: "🔊", color: "#f59e0b" },
    { name: "Language Learning", slug: "language-learning", desc: "Methods and tips for learning new languages.", icon: "📚", color: "#3b82f6" },
    { name: "Constructed Languages", slug: "conlangs", desc: "Esperanto, Klingon, Dothraki, and beyond.", icon: "🌐", color: "#ec4899" },
  ]},
  { name: "Literature", slug: "literature", desc: "Written works and their craft.", icon: "📚", color: "#a855f7", banner: "linear-gradient(135deg, #a855f7, #6366f1)", parent: null, children: [
    { name: "Fiction", slug: "fiction", desc: "Novels, short stories, and the art of narrative.", icon: "📖", color: "#a855f7" },
    { name: "Poetry", slug: "poetry", desc: "The art of language at its most condensed.", icon: "🪶", color: "#8b5cf6" },
    { name: "Non-Fiction", slug: "non-fiction", desc: "Essays, memoirs, and factual writing.", icon: "📝", color: "#3b82f6" },
    { name: "Science Fiction", slug: "science-fiction", desc: "Imagining futures and alternate realities.", icon: "🚀", color: "#6366f1" },
    { name: "Fantasy", slug: "fantasy", desc: "Worlds of magic and myth.", icon: "🐉", color: "#10b981" },
    { name: "Mystery", slug: "mystery", desc: "Whodunits and the art of suspense.", icon: "🔍", color: "#64748b" },
  ]},

  // === ARTS ===
  { name: "Arts", slug: "arts", desc: "Creative expression in all its forms.", icon: "🎭", color: "#ec4899", banner: "linear-gradient(135deg, #ec4899, #8b5cf6)", parent: null, children: [
    { name: "Music", slug: "music", desc: "Sound organized in time.", icon: "🎵", color: "#ec4899", banner: "linear-gradient(135deg, #ec4899, #f43f5e)", children: [
      { name: "Music Theory", slug: "music-theory", desc: "The grammar of music.", icon: "🎼", color: "#a855f7" },
      { name: "Music Production", slug: "music-production", desc: "Recording, mixing, and mastering.", icon: "🎛️", color: "#06b6d4" },
      { name: "Music Composition", slug: "music-composition", desc: "Writing original music.", icon: "✍️", color: "#8b5cf6" },
      { name: "Electronic Music", slug: "electronic-music", desc: "Synths, DAWs, and the electronic revolution.", icon: "🎹", color: "#3b82f6" },
      { name: "Classical Music", slug: "classical-music", desc: "From Bach to Shostakovich.", icon: "🎻", color: "#f59e0b" },
      { name: "Jazz", slug: "jazz", desc: "America's classical music.", icon: "🎷", color: "#3b82f6" },
      { name: "Hip Hop", slug: "hip-hop", desc: "Beats, rhymes, and culture.", icon: "🎤", color: "#ef4444" },
      { name: "Rock", slug: "rock", desc: "From the 50s to now.", icon: "🎸", color: "#ef4444" },
      { name: "Indie", slug: "indie-music", desc: "Independent and alternative.", icon: "🎚️", color: "#10b981" },
    ]},
    { name: "Film & Cinema", slug: "film", desc: "The art of the moving image.", icon: "🎬", color: "#f43f5e", banner: "linear-gradient(135deg, #f43f5e, #f59e0b)", children: [
      { name: "Film Criticism", slug: "film-criticism", desc: "Analyzing and reviewing films.", icon: "🍿", color: "#f59e0b" },
      { name: "Filmmaking", slug: "filmmaking", desc: "The craft of making films.", icon: "🎥", color: "#3b82f6" },
      { name: "Animation", slug: "animation", desc: "Bringing drawings and models to life.", icon: "✏️", color: "#ec4899" },
      { name: "Documentary", slug: "documentary", desc: "Non-fiction filmmaking.", icon: "📹", color: "#10b981" },
      { name: "Classic Cinema", slug: "classic-cinema", desc: "The great films of cinema history.", icon: "🎞️", color: "#f59e0b" },
    ]},
    { name: "Photography", slug: "photography", desc: "Capturing light and moment.", icon: "📷", color: "#64748b", banner: "linear-gradient(135deg, #64748b, #1e293b)", children: [
      { name: "Portrait Photography", slug: "portrait-photography", desc: "Capturing people.", icon: "👤", color: "#f59e0b" },
      { name: "Landscape Photography", slug: "landscape-photography", desc: "The natural world through a lens.", icon: "🏔️", color: "#10b981" },
      { name: "Street Photography", slug: "street-photography", desc: "Life in public spaces.", icon: "🚶", color: "#64748b" },
      { name: "Astrophotography", slug: "astrophotography", desc: "Photographing the night sky.", icon: "🌌", color: "#6366f1" },
    ]},
    { name: "Visual Arts", slug: "visual-arts", desc: "Drawing, painting, and visual expression.", icon: "🖼️", color: "#f43f5e", banner: "linear-gradient(135deg, #f43f5e, #ec4899)", children: [
      { name: "Drawing", slug: "drawing", desc: "The foundation of visual art.", icon: "✏️", color: "#64748b" },
      { name: "Painting", slug: "painting", desc: "Oil, acrylic, watercolor, and beyond.", icon: "🎨", color: "#ec4899" },
      { name: "Digital Art", slug: "digital-art", desc: "Art created with digital tools.", icon: "🖌️", color: "#8b5cf6" },
      { name: "Sculpture", slug: "sculpture", desc: "Three-dimensional art.", icon: "🗿", color: "#64748b" },
      { name: "Illustration", slug: "illustration", desc: "Visual communication through imagery.", icon: "📐", color: "#3b82f6" },
    ]},
  ]},

  // === HEALTH ===
  { name: "Health", slug: "health", desc: "Physical and mental wellbeing.", icon: "💚", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #84cc16)", parent: null, children: [
    { name: "Fitness", slug: "fitness", desc: "Exercise, training, and physical conditioning.", icon: "💪", color: "#ef4444", banner: "linear-gradient(135deg, #ef4444, #f59e0b)", children: [
      { name: "Strength Training", slug: "strength-training", desc: "Building muscle and strength.", icon: "🏋️", color: "#ef4444" },
      { name: "Cardio", slug: "cardio", desc: "Heart-pumping endurance training.", icon: "🏃", color: "#f59e0b" },
      { name: "Yoga", slug: "yoga", desc: "Union of body, breath, and mind.", icon: "🧘", color: "#8b5cf6" },
      { name: "Running", slug: "running", desc: "The most fundamental human exercise.", icon: "🏃", color: "#ef4444" },
      { name: "Calisthenics", slug: "calisthenics", desc: "Bodyweight training.", icon: "🤸", color: "#10b981" },
    ]},
    { name: "Nutrition", slug: "nutrition", desc: "What you eat and how it affects you.", icon: "🥗", color: "#84cc16", banner: "linear-gradient(135deg, #84cc16, #10b981)", children: [
      { name: "Healthy Eating", slug: "healthy-eating", desc: "Whole foods, balanced diets, and mindful eating.", icon: "🥦", color: "#10b981" },
      { name: "Vegan & Vegetarian", slug: "vegan-vegetarian", desc: "Plant-based living.", icon: "🌱", color: "#84cc16" },
      { name: "Keto", slug: "keto", desc: "The ketogenic lifestyle.", icon: "🥑", color: "#84cc16" },
      { name: "Meal Prep", slug: "meal-prep", desc: "Planning and preparing meals in advance.", icon: "🍱", color: "#f59e0b" },
    ]},
    { name: "Mental Health", slug: "mental-health", desc: "Psychological and emotional wellbeing.", icon: "🧠", color: "#8b5cf6", banner: "linear-gradient(135deg, #8b5cf6, #6366f1)", children: [
      { name: "Mindfulness", slug: "mindfulness", desc: "Present-moment awareness.", icon: "🧘", color: "#8b5cf6" },
      { name: "Meditation", slug: "meditation", desc: "Training the mind through practice.", icon: "🕉️", color: "#6366f1" },
      { name: "Anxiety", slug: "anxiety", desc: "Understanding and managing anxiety.", icon: "💙", color: "#3b82f6" },
      { name: "Depression", slug: "depression", desc: "Support, strategies, and understanding.", icon: "🌤️", color: "#f59e0b" },
      { name: "Therapy", slug: "therapy", desc: "Professional mental health support.", icon: "💬", color: "#10b981" },
    ]},
    { name: "Medicine", slug: "medicine", desc: "The science and practice of healing.", icon: "⚕️", color: "#ef4444", banner: "linear-gradient(135deg, #ef4444, #ec4899)", children: [
      { name: "Longevity", slug: "longevity", desc: "Extending healthy lifespan.", icon: "⏳", color: "#8b5cf6" },
      { name: "Mental Health Medication", slug: "mental-health-medication", desc: "Psychiatric medications and their effects.", icon: "💊", color: "#3b82f6" },
      { name: "Alternative Medicine", slug: "alternative-medicine", desc: "Non-conventional approaches to health.", icon: "🌿", color: "#10b981" },
    ]},
    { name: "Sleep", slug: "sleep", desc: "The third pillar of health.", icon: "😴", color: "#6366f1" },
    { name: "Biohacking", slug: "biohacking", desc: "Optimizing your biology through science.", icon: "🔬", color: "#8b5cf6" },
  ]},

  // === BUSINESS ===
  { name: "Business", slug: "business", desc: "Markets, entrepreneurship, and the economy.", icon: "💼", color: "#eab308", banner: "linear-gradient(135deg, #eab308, #f59e0b)", parent: null, children: [
    { name: "Startups", slug: "startups", desc: "Building companies from scratch.", icon: "🚀", color: "#f59e0b" },
    { name: "Finance", slug: "finance", desc: "Money, markets, and investing.", icon: "💰", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #eab308)", children: [
      { name: "Investing", slug: "investing", desc: "Stocks, bonds, and portfolio strategy.", icon: "📈", color: "#10b981" },
      { name: "Cryptocurrency", slug: "cryptocurrency", desc: "Digital assets and crypto markets.", icon: "🪙", color: "#f59e0b" },
      { name: "Personal Finance", slug: "personal-finance", desc: "Budgeting, saving, and financial planning.", icon: "🏦", color: "#3b82f6" },
      { name: "Real Estate", slug: "real-estate", desc: "Property, mortgages, and real estate investing.", icon: "🏠", color: "#64748b" },
    ]},
    { name: "Marketing", slug: "marketing", desc: "Reaching and resonating with customers.", icon: "📣", color: "#ec4899" },
    { name: "Product Management", slug: "product-management", desc: "Building the right thing, the right way.", icon: "📋", color: "#3b82f6" },
    { name: "Sales", slug: "sales", desc: "The art of the close.", icon: "🤝", color: "#f59e0b" },
    { name: "Economics", slug: "economics", desc: "How societies allocate scarce resources.", icon: "📊", color: "#3b82f6", children: [
      { name: "Macro Economics", slug: "macro-economics", desc: "The big picture — GDP, inflation, interest rates.", icon: "🌍", color: "#3b82f6" },
      { name: "Micro Economics", slug: "micro-economics", desc: "Individual markets and decision-making.", icon: "🔍", color: "#10b981" },
      { name: "Game Theory", slug: "game-theory", desc: "Strategic decision-making.", icon: "♟️", color: "#8b5cf6" },
    ]},
    { name: "Freelancing", slug: "freelancing", desc: "Working for yourself, on your own terms.", icon: "🧑‍💻", color: "#10b981" },
    { name: "Career Advice", slug: "career-advice", desc: "Navigating the professional world.", icon: "🎯", color: "#6366f1" },
  ]},

  // === ENTERTAINMENT ===
  { name: "Entertainment", slug: "entertainment", desc: "Games, shows, and things we love.", icon: "🎮", color: "#ec4899", banner: "linear-gradient(135deg, #ec4899, #f43f5e)", parent: null, children: [
    { name: "Gaming", slug: "gaming", desc: "Video games — playing, discussing, and creating.", icon: "🎮", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #06b6d4)", children: [
      { name: "PC Gaming", slug: "pc-gaming", desc: "The master race.", icon: "🖥️", color: "#3b82f6" },
      { name: "Console Gaming", slug: "console-gaming", desc: "PlayStation, Xbox, Nintendo.", icon: "🎮", color: "#ef4444" },
      { name: "Mobile Gaming", slug: "mobile-gaming", desc: "Games in your pocket.", icon: "📱", color: "#10b981" },
      { name: "Retro Gaming", slug: "retro-gaming", desc: "Classic games and consoles.", icon: "👾", color: "#f59e0b" },
      { name: "Indie Games", slug: "indie-games", desc: "Small studios, big ideas.", icon: "💎", color: "#8b5cf6" },
      { name: "RPGs", slug: "rpgs", desc: "Role-playing games, digital and tabletop.", icon: "⚔️", color: "#ef4444" },
      { name: "Strategy Games", slug: "strategy-games", desc: "4X, RTS, and turn-based.", icon: "♟️", color: "#6366f1" },
    ]},
    { name: "Tabletop Games", slug: "tabletop-games", desc: "Board games, card games, and RPGs.", icon: "🎲", color: "#8b5cf6" },
    { name: "Anime & Manga", slug: "anime-manga", desc: "Japanese animation and comics.", icon: "🎌", color: "#ec4899" },
    { name: "TV Shows", slug: "tv-shows", desc: "Serialized storytelling at its best.", icon: "📺", color: "#3b82f6" },
    { name: "Books", slug: "books", desc: "Reading recommendations and discussion.", icon: "📚", color: "#a855f7" },
    { name: "Comics", slug: "comics", desc: "Graphic novels and comic books.", icon: "💬", color: "#f59e0b" },
    { name: "Podcasts", slug: "podcasts", desc: "Audio storytelling and discussion.", icon: "🎧", color: "#10b981" },
    { name: "Streaming", slug: "streaming", desc: "Twitch, YouTube, and the creator economy.", icon: "📹", color: "#ef4444" },
  ]},

  // === LIFESTYLE ===
  { name: "Lifestyle", slug: "lifestyle", desc: "How we live, day to day.", icon: "🌟", color: "#f59e0b", banner: "linear-gradient(135deg, #f59e0b, #ec4899)", parent: null, children: [
    { name: "Cooking", slug: "cooking", desc: "Recipes, techniques, and culinary exploration.", icon: "🍳", color: "#ef4444", children: [
      { name: "Baking", slug: "baking", desc: "Bread, pastries, and the science of heat.", icon: "🍞", color: "#f59e0b" },
      { name: "Grilling & BBQ", slug: "grilling-bbq", desc: "Fire, smoke, and meat.", icon: "🔥", color: "#ef4444" },
      { name: "Vegan Cooking", slug: "vegan-cooking", desc: "Plant-based recipes.", icon: "🥬", color: "#10b981" },
      { name: "Coffee", slug: "coffee", desc: "Beans, brewing, and caffeine culture.", icon: "☕", color: "#64748b" },
      { name: "Tea", slug: "tea", desc: "Leaves, steeping, and ceremony.", icon: "🍵", color: "#10b981" },
      { name: "Cocktails", slug: "cocktails", desc: "The art of mixed drinks.", icon: "🍸", color: "#8b5cf6" },
    ]},
    { name: "Travel", slug: "travel", desc: "Seeing the world, one trip at a time.", icon: "✈️", color: "#3b82f6" },
    { name: "Fashion", slug: "fashion", desc: "Clothing, style, and self-expression.", icon: "👗", color: "#ec4899" },
    { name: "Home & Garden", slug: "home-garden", desc: "Making your space your own.", icon: "🏡", color: "#10b981" },
    { name: "DIY & Crafts", slug: "diy-crafts", desc: "Make it yourself.", icon: "🔨", color: "#f59e0b" },
    { name: "Pets", slug: "pets", desc: "Our animal companions.", icon: "🐕", color: "#f59e0b" },
    { name: "Parenting", slug: "parenting", desc: "Raising the next generation.", icon: "👶", color: "#ec4899" },
    { name: "Relationships", slug: "relationships", desc: "Love, friendship, and connection.", icon: "💕", color: "#ec4899" },
    { name: "Self-Improvement", slug: "self-improvement", desc: "Becoming the best version of yourself.", icon: "📈", color: "#10b981" },
    { name: "Productivity", slug: "productivity", desc: "Doing more of what matters.", icon: "⚡", color: "#f59e0b" },
    { name: "Minimalism", slug: "minimalism", desc: "Less, but better.", icon: "⚪", color: "#64748b" },
  ]},

  // === EDUCATION ===
  { name: "Education", slug: "education", desc: "Learning, teaching, and the pursuit of knowledge.", icon: "🎓", color: "#3b82f6", banner: "linear-gradient(135deg, #3b82f6, #10b981)", parent: null, children: [
    { name: "Self-Directed Learning", slug: "self-directed-learning", desc: "Taking charge of your own education.", icon: "📚", color: "#3b82f6" },
    { name: "Online Courses", slug: "online-courses", desc: "MOOCs, bootcamps, and digital learning.", icon: "💻", color: "#10b981" },
    { name: "Academic Research", slug: "academic-research", desc: "The craft of scholarship.", icon: "🔬", color: "#8b5cf6" },
    { name: "Study Skills", slug: "study-skills", desc: "Techniques for effective learning.", icon: "✏️", color: "#f59e0b" },
    { name: "Language Learning", slug: "language-learning-edu", desc: "Methods and motivation for new languages.", icon: "🌍", color: "#06b6d4" },
  ]},

  // === SPORTS ===
  { name: "Sports", slug: "sports", desc: "Athletic competition and fandom.", icon: "⚽", color: "#10b981", banner: "linear-gradient(135deg, #10b981, #3b82f6)", parent: null, children: [
    { name: "Football (Soccer)", slug: "football-soccer", desc: "The beautiful game.", icon: "⚽", color: "#10b981" },
    { name: "Basketball", slug: "basketball", desc: "Hoops, hardwood, and high-flying action.", icon: "🏀", color: "#f59e0b" },
    { name: "American Football", slug: "american-football", desc: "Gridiron glory.", icon: "🏈", color: "#3b82f6" },
    { name: "Baseball", slug: "baseball", desc: "America's pastime.", icon: "⚾", color: "#ef4444" },
    { name: "Tennis", slug: "tennis", desc: "Racquets, volleys, and grand slams.", icon: "🎾", color: "#84cc16" },
    { name: "MMA & Boxing", slug: "mma-boxing", desc: "Combat sports.", icon: "🥊", color: "#ef4444" },
    { name: "Cycling", slug: "cycling", desc: "Road, mountain, and track.", icon: "🚴", color: "#3b82f6" },
    { name: "Swimming", slug: "swimming", desc: "From pools to open water.", icon: "🏊", color: "#06b6d4" },
    { name: "Climbing", slug: "climbing", desc: "Bouldering, sport, and trad.", icon: "🧗", color: "#8b5cf6" },
    { name: "Skiing & Snowboarding", slug: "skiing-snowboarding", desc: "Winter sports.", icon: "⛷️", color: "#3b82f6" },
  ]},

  // === CURRENT EVENTS ===
  { name: "World & News", slug: "world-news", desc: "What's happening, and why it matters.", icon: "🌍", color: "#3b82f6", banner: "linear-gradient(135deg, #3b82f6, #10b981)", parent: null, children: [
    { name: "Climate Crisis", slug: "climate-crisis", desc: "The defining challenge of our time.", icon: "🌍", color: "#10b981" },
    { name: "Geopolitics", slug: "geopolitics", desc: "Power, nations, and global dynamics.", icon: "🗺️", color: "#6366f1" },
    { name: "Tech Policy", slug: "tech-policy", desc: "Regulation, privacy, and the digital commons.", icon: "⚖️", color: "#f59e0b" },
    { name: "Space Exploration", slug: "space-exploration", desc: "Mars, the Moon, and beyond.", icon: "🚀", color: "#6366f1" },
  ]},
];

// ============================================================================
// Flatten + assign UUIDs (deterministic, sequential)
// ============================================================================
let _counter = 1;
function nextUuid() {
  const hex = _counter.toString(16).padStart(12, "0");
  _counter++;
  return `00000000-0000-0000-0000-${hex}`;
}

// First pass: assign IDs to all topics (parents before children)
function assignIds(topics, parentId = null) {
  for (const t of topics) {
    t.id = nextUuid();
    t.parent_id = parentId;
    if (t.children) {
      assignIds(t.children, t.id);
    }
  }
}

// Second pass: flatten
function flatten(topics) {
  const result = [];
  for (const t of topics) {
    result.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.desc,
      banner: t.banner ?? `linear-gradient(135deg, ${t.color}, ${t.color}aa)`,
      color: t.color,
      icon: t.icon,
      parent_id: t.parent_id,
    });
    if (t.children) {
      result.push(...flatten(t.children));
    }
  }
  return result;
}

async function main() {
  assignIds(TOPICS);
  const flat = flatten(TOPICS);
  console.log(`Generated ${flat.length} topics. Inserting in batches...`);

  // Insert in batches of 25, but order so parents come before children
  // (flatten already does this because we assign IDs parent-first)
  const BATCH = 25;
  let ok = 0, failed = 0;
  for (let i = 0; i < flat.length; i += BATCH) {
    const batch = flat.slice(i, i + BATCH);
    const values = batch.map(t => `('${t.id}', '${t.name.replace(/'/g, "''")}', '${t.slug}', '${t.description.replace(/'/g, "''")}', '${t.banner}', '${t.color}', '${t.icon}', ${t.parent_id ? `'${t.parent_id}'` : 'NULL'}, 0, now())`).join(",\n");
    const sql = `INSERT INTO public.topics (id, name, slug, description, banner, color, icon, parent_id, post_count, created_at) VALUES ${values} ON CONFLICT (slug) DO NOTHING;`;
    const res = await q(sql);
    if (Array.isArray(res)) {
      ok += batch.length;
    } else {
      failed++;
      console.error(`Batch ${i / BATCH} failed:`, JSON.stringify(res).slice(0, 200));
    }
    process.stdout.write(".");
  }
  console.log(`\nDone: ${ok} inserted, ${failed} batches failed`);

  // Verify
  const count = await q("SELECT COUNT(*) AS count FROM public.topics;");
  console.log(`Total topics in database: ${Array.isArray(count) ? count[0].count : '?'}`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
