
# SteemBiota — Immutable Evolution

**SteemBiota** is an experimental decentralized life simulation built on the **Steem blockchain**.

Creatures are generated from deterministic **genomes**, rendered procedurally, and their **entire life history is permanently recorded on-chain**.

Every creature begins as a **baby**, grows through multiple lifecycle stages, can **reproduce with compatible partners**, and eventually becomes a **fossil** — but its record remains forever.

---

# Concept

SteemBiota explores the idea of **digital organisms whose evolution is permanently stored on a blockchain**.

Each creature has:

- A deterministic **genome**
- A **visual form** rendered procedurally
- A **lifespan measured in real days**
- A **fertility window**
- The ability to **breed with other compatible creatures**

Every stage of its life is posted to Steem as a reply to the creature's root post, forming a **permanent evolutionary record**.

---

# Key Principles

### Immutable Evolution
All creature snapshots are stored on the **Steem blockchain**.  
Nothing can be altered after posting.

### Deterministic Rendering
A creature’s genome always produces the **same visual form**.

### Fully Client-Side
The dApp runs entirely in the browser using:

- `steem-js`
- `Steem Keychain`

No servers are required.

### Procedural Life
Creatures grow automatically over time based on blockchain timestamps.

---

# Creature Genome

Each creature is defined by a compact genome:

```

GEN → Genus ID (species barrier + color family)
SX → Sex (0 = Male, 1 = Female)
MOR → Morphology seed (body structure)
APP → Appendage seed (limbs / horns / fins)
ORN → Ornament seed (patterns / spikes / glow)
CLR → Color variation offset
LIF → Lifespan (days)
FRT → Fertility window
MUT → Mutation tendency

```

The genome determines:

- body shape
- appendages
- ornamentation
- color family
- reproductive traits
- mutation probability

---

# Lifecycle

Creature age is measured in **real days** based on Steem block timestamps.

Lifecycle stages are calculated as percentages of lifespan.

| Stage | Age |
|------|------|
🥚 Baby | 0–4% |
🐣 Toddler | 5–11% |
🌿 Child | 12–24% |
🌱 Teenager | 25–39% |
🌸 Young Adult | 40–59% |
🍃 Middle-Aged | 60–79% |
🍂 Elder | 80–99% |
🦴 Fossil | 100%+ |

When lifespan is exceeded, the creature becomes a **fossil**.

---

# Breeding Rules

Creatures can breed only if:

- Same **GEN** (same genus)
- Opposite **SX** (male + female)
- Both inside their **fertility window**

Breeding produces a new genome by mixing parental genes.

Mutation may occur with a small probability.

---

# Visual Rendering

Creatures are rendered in two ways:

### Canvas Rendering
Used in the web interface for a rich visual display.

### Unicode Rendering
Used inside Steem posts so the creature's appearance is permanently stored on-chain.

Unicode creatures grow in size as they age:

| Stage | Grid Size |
|------|------|
Baby | 6×6 |
Toddler | 10×10 |
Child | 14×14 |
Teen | 18×18 |
Adult | 22×22 |
Middle Age | 26×26 |
Elder | 30×30 |
Fossil | 18×18 |

---

# Blockchain Structure

Each creature corresponds to a **Steem post thread**.

Root Post
↓
Baby snapshot
↓
Growth snapshot
↓
Growth snapshot
↓
Breeding event
↓
Final fossil state

This creates a **permanent evolutionary timeline**.

---

# Founder Creatures

The ecosystem begins with a limited number of **founder creatures**.

Only the `@steembiota` account can generate founders.

All other creatures must be created through **breeding**.

---

# Technology

SteemBiota is intentionally minimal.

Frontend only:

JavaScript
steem-js
Steem Keychain
GitHub Pages

No backend servers.

All logic runs **client-side**.

---

# Goals

SteemBiota explores several ideas:

- decentralized life simulation
- procedural creatures
- blockchain-recorded evolution
- immutable digital ecosystems

It is both an **experiment** and a **creative project**.

---

# Future Ideas

Possible future expansions:

- species name generation
- genus color families
- fossils and extinction tracking
- rare mutations
- evolutionary statistics
- creature genealogy trees
- hybridization between genera

---

# License

Open source.

Community experimentation is encouraged.

---

# Author

Created for the **Steem blockchain ecosystem**.


