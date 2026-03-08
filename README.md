# SteemBiota — Immutable Evolution

**SteemBiota** is a decentralised life simulation built on the **Steem blockchain**.

Creatures are generated from deterministic **genomes**, rendered procedurally in two modes, and their entire existence — from birth through breeding to fossilisation — is **permanently recorded on-chain**.

🌐 **Live app:** https://puncakbukit.github.io/steembiota

---

## Concept

SteemBiota explores digital organisms whose evolution is permanently stored on a blockchain.

Each creature has a compact genome that determines its body shape, colour, lifespan, and fertility window. Once published via Steem Keychain, the genome is immutable. A creature's lifecycle plays out in real time measured in days, and every interaction — feeding, breeding — is stored as a blockchain reply. The blockchain becomes the ecosystem's permanent fossil record.

---

## Technology Stack

The dApp runs entirely in the browser with no build tools and no backend.

| Layer | Technology |
|---|---|
| Blockchain | Steem (via steem-js) |
| Signing | Steem Keychain browser extension |
| UI Framework | Vue 3 (CDN) + Vue Router 4 (CDN) |
| Hosting | GitHub Pages |
| Build tools | None |

Files: `index.html`, `blockchain.js`, `components.js`, `app.js`

---

## Creature Genome

Each creature is defined by ten integer genes:

| Gene | Description | Range |
|---|---|---|
| `GEN` | Genus ID — species barrier | 0–999 |
| `SX` | Sex (0 = Male, 1 = Female) | 0–1 |
| `MOR` | Morphology seed — body shape and tail style | 0–9999 |
| `APP` | Appendage seed — ear shape, paw shape, wing presence | 0–9999 |
| `ORN` | Ornamentation seed — glow orbs, mane, pattern accent | 0–9999 |
| `CLR` | Colour hue offset | 0–359 degrees |
| `LIF` | Lifespan in real days | 80–159 |
| `FRT_START` | Fertility window start (days) | varies |
| `FRT_END` | Fertility window end (days) | varies |
| `MUT` | Mutation tendency — affects offspring variation | 0–5 |

The genome is stored inside every creature post in a fenced block and in json_metadata, so any client can reconstruct the creature directly from the blockchain.

---

## Lifecycle

Creature age is measured in **real days** since the post was published. Lifecycle stage is calculated as a percentage of LIF.

| Stage | Age % | Icon |
|---|---|---|
| Baby | 0–4% | Egg |
| Toddler | 5–11% | Hatching |
| Child | 12–24% | Seedling |
| Teenager | 25–39% | Sprout |
| Young Adult | 40–59% | Blossom |
| Middle-Aged | 60–79% | Leaf |
| Elder | 80–99% | Autumn leaf |
| Fossil | 100%+ | Bone |

Once the lifespan is exceeded the creature becomes a **Fossil**. Its genome and history remain permanently on-chain but it can no longer be fed or used in breeding.

---

## Visual Rendering

Every creature is rendered procedurally from its genome. The same genome always produces the same visual output.

### Canvas Rendering

Used in the web interface. Renders a side-profile quadruped on a 400x320 canvas using the HTML5 Canvas API.

Anatomy is drawn back to front (painter's algorithm): ground shadow, energy ribbons, back legs (dimmed for depth), flowing tail, torso with gradient, chest marking, body pattern, front legs, neck, mane wisps, head with snout and eye, ears, optional dorsal wing, glowing orb nodes along the tail, and fertility aura when in the fertile window.

The creature faces left or right at random on each page load via a canvas mirror transform.

Genome to canvas mapping:

| Gene | Visual effect |
|---|---|
| MOR | Body length, head size, fill density |
| APP | Leg length, ear height, wing presence |
| ORN | Glow orb count and hue, chest mark, mane |
| CLR | Base hue for body gradient |
| LIF / age | Body scale (grows from 45% at birth to full, shrinks at elder) |
| SX | Colour saturation variant |

### Unicode Rendering

Used inside Steem post bodies so the creature's form is stored permanently on-chain as plain text.

Art width grows with lifecycle stage (14 chars at Baby up to 36 chars at Young Adult, back to 30 at Elder, 24 at Fossil).

Row structure (creature faces left, tail extends right):
- Above body: ear glyphs and optional mane wisps
- Optional dorsal wing row above the top body row
- Body rows: head zone (snout, eye, fill), body zone (dense fill with orb accent), tail zone (tapered characters), floating orb nodes
- Below body: four leg columns with paw characters

Genome to unicode mapping:

| Gene | Visual effect |
|---|---|
| MOR mod 6 | Body fill palette and tail character style |
| APP mod 4 | Ear shape and paw shape |
| APP mod 5 | Dorsal wing presence (rare) |
| ORN mod 6 | Ornament and orb glyph |
| ORN mod 3 | Mane presence |
| ORN continuous | Orb count (1–4) and position |
| GEN mod 4 | Eye glyph |
| GEN mod 6 | Header sigil |

The header line shows fertile sparkles when the creature is in its fertility window.

---

## Feeding

Any logged-in Steem user can feed a creature by loading its post URL. Each feed is published as a blockchain reply.

### Food Types

| Food | Lifespan bonus | Fertility boost |
|---|---|---|
| Nectar | +1 day per feed | none |
| Fruit | +0.5 days per feed | +10% per feed |
| Crystal | none | +5% per feed |

### Feed Rules

- Each feeder is counted at most once per UTC day (anti-spam).
- Total feeds are capped at 20 per creature lifetime.
- Owner feeds count 3x toward the health score; community feeds count 1x.
- Maximum lifespan bonus: +20% of base LIF.
- Maximum fertility boost from community feeding: +25%.

### Health States

| State | Threshold | Symbol |
|---|---|---|
| Thriving | 80%+ | sparkle |
| Well-fed | 55%+ | star |
| Nourished | 30%+ | dot |
| Hungry | above 0% | small dot |
| Unfed | 0% | small dot |

---

## Breeding

Users pair two compatible creatures by pasting their Steem post URLs. The child genome is generated deterministically and published as a new Steem post.

### Compatibility Rules

All of the following must be true:

1. Same GEN (same genus)
2. Opposite SX (one Male, one Female)
3. Neither creature is the other's close relative (see Kinship Rules)

### Gene Inheritance

Each gene is inherited from one parent chosen at random (50/50), then potentially mutated. Mutation probability per gene = 1% times (1 + MUT_A + MUT_B). Breeding is deterministic: the same two parents always produce the same child, using a seeded PRNG (mulberry32) keyed on both parent genomes.

### Speciation

There is a 0.5% chance per breeding event that the child's GEN mutates to an entirely new value, creating a new genus. Speciated offspring cannot breed with their parents' genus.

### Kinship Rules

SteemBiota walks the blockchain ancestry graph before allowing a breed. A creature cannot breed with:

1. Its own and its partner's parents, grandparents, and all ancestors upward
2. Its own and its partner's siblings (full or half — any creature sharing at least one parent)
3. Its own and its partner's children, grandchildren, and all descendants downward
4. Its own and its partner's parents' siblings (aunts and uncles, full or half)
5. Its own and its partner's siblings' children, grandchildren, and all descendants downward

**How it works on-chain:**

Each offspring post stores parentA and parentB (author and permlink) in json_metadata.steembiota. At breed time the client:

1. Walks ancestry upward for both creatures via breadth-first search (up to 12 generations).
2. Collects every author seen and fetches their 100 most recent SteemBiota posts to build a local kinship corpus.
3. Within that corpus identifies all five categories of relatives for each creature.
4. Blocks breeding if either creature appears in the other's forbidden set, naming the specific relationship.

This prevents same-bloodline farming while keeping the check entirely client-side and bounded in blockchain API calls.

---

## Blockchain Post Structure

### Creature post (json_metadata.steembiota)

```
version: "1.0"
type: "founder" or "offspring"
genome: { GEN, SX, MOR, APP, ORN, CLR, LIF, FRT_START, FRT_END, MUT }
name: display name
age: days at time of publication
lifecycleStage: stage name
parentA: { author, permlink }   (offspring only)
parentB: { author, permlink }   (offspring only)
mutated: boolean                (offspring only)
speciated: boolean              (offspring only)
```

### Feed reply (json_metadata.steembiota)

```
version: "1.0"
type: "feed"
creature: { author, permlink }
feeder: username
food: "nectar" | "fruit" | "crystal"
ts: ISO 8601 UTC timestamp
```

### Post titles

Default title format (UTC time, user-editable before publishing):

```
Vyrex Nymwhisper — born at 7 in the morning UTC on Monday, January 3, 2026
```

### Permlinks

Derived from the post title: lowercased, whitespace becomes hyphens, non-alphanumeric stripped, truncated at 200 chars, then a millisecond timestamp appended. Always unique.

---

## App Routes

| URL | View |
|---|---|
| /#/ | Home — founder creation (restricted to @steembiota) + breed and feed panels |
| /#/about | About page |
| /#/@author/permlink | Creature page — canvas render, unicode render, stats, feed panel, breed panel with Parent A pre-filled |
| /#/@user | User profile page |

The creature page URL is embedded in every published post and feed reply body so Steem readers can visit the live visual rendering directly.

---

## Founder Creatures

The ecosystem begins with a small set of founder creatures published exclusively by the @steembiota account. All other creatures must arise through breeding. The Create and Publish buttons are only rendered when the logged-in account is @steembiota. No mention of founders is shown to regular users.

---

## Key Principles

**Immutability** — All genomes and life events are stored on-chain and cannot be altered.

**Determinism** — The same genome always renders the same creature. The same two parents always produce the same child.

**UTC time** — All timestamps use UTC to match the Steem blockchain clock.

**Client-side only** — All logic runs in the browser. No servers or external databases.

**Diversity enforcement** — The kinship system prevents same-bloodline farming and encourages cross-community breeding partnerships.

---

## License

Open source. Community experimentation and forks are encouraged.

---

## Author

Created for the Steem blockchain ecosystem by @puncakbukit.
