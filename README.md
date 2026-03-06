# SteemBiota — Immutable Evolution

**SteemBiota** is an experimental decentralized life simulation built on the **Steem blockchain**.

Creatures are generated from deterministic **genomes**, rendered procedurally, and their **entire life history is permanently recorded on-chain**.

Every creature begins as a **baby**, grows through multiple lifecycle stages, can **reproduce with compatible partners**, be **fed by its owner or the community**, and eventually becomes a **fossil** — but its record remains forever.

The project runs entirely in the browser and uses the Steem blockchain as its **permanent evolutionary database**.

---

# Concept

SteemBiota explores the idea of **digital organisms whose evolution is permanently stored on a blockchain**.

Each creature has:

* a deterministic **genome**
* a **visual form** rendered procedurally in both Canvas and Unicode
* a **lifespan measured in real days**
* a **fertility window**
* a **health state** shaped by feeding events
* the ability to **breed with compatible creatures**

Every feeding, breeding, and lifecycle event is posted to Steem as a reply to the creature's root post, forming a **permanent evolutionary record**.

The blockchain effectively becomes the **ecosystem's fossil record**.

---

# Key Principles

### Immutable Evolution

All creature data is stored on the **Steem blockchain**. Once published, it cannot be altered. The genome is embedded in every post's `json_metadata` and in a human-readable ` ```genome ``` ` code block, so creatures can be reconstructed from the chain even if the web interface disappears.

---

### Deterministic Rendering

A creature's genome always produces the **same visual form** — the same Canvas drawing, the same Unicode art, the same name. No randomness is involved at render time.

---

### Fully Client-Side

The entire dApp runs in the browser with no backend:

* `steem-js` — blockchain API
* `Steem Keychain` — transaction signing
* `Vue 3` (CDN) — UI framework
* `Vue Router 4` (CDN) — client-side routing
* `GitHub Pages` — hosting

---

### Procedural Life

Creature age is derived from **Steem block timestamps**. Time on the blockchain is the clock of the ecosystem.

---

# Creature Genome

Each creature is defined by a compact genome of integers:

```
GEN       → Genus ID (0–999) — species barrier + color palette family
SX        → Sex (0 = Male, 1 = Female)
MOR       → Morphology seed — body shape, tail presence, head size
APP       → Appendage seed — limb count, horns, fins
ORN       → Ornament seed — spikes, glow nodes, frills, body pattern
CLR       → Color hue offset (0–359°)
LIF       → Base lifespan in days (80–159 for founders)
FRT_START → Fertility window start (days)
FRT_END   → Fertility window end (days)
MUT       → Mutation tendency (0–2 for founders, up to 5 after breeding)
```

The genome determines body structure, appendages, ornamentation, color family, lifespan, reproductive traits, and mutation probability in offspring.

It is stored inside every creature post in two places for redundancy:

````markdown
```genome
{
  "GEN": 4987,
  "SX": 1,
  "MOR": 2834,
  "APP": 1832,
  "ORN": 642,
  "CLR": 197,
  "LIF": 142,
  "FRT_START": 20,
  "FRT_END": 60,
  "MUT": 2
}
```
````

And inside `json_metadata.steembiota.genome` for fast client-side parsing.

---

# Naming System

Every creature receives a **deterministic scientific name** derived solely from its genome — the same genome always produces the same name.

The name has two parts:

**Genus** — generated from `GEN` using three syllable tables:

```
syllablesA = [Lu, Te, Mo, Va, Zi, Ra, Ko, Ny]
syllablesB = [mo, ra, vi, to, na, shi, ka, re]
syllablesC = [ra, nus, tor, lex, via, ron, dus, x]
```

**Species** — generated from `MOR` and `ORN` using two name tables:

```
speciesA = [Shavi, Virel, Morun, Zerin, Talin, Korin, Velis, Nora]
speciesB = [Oua, Tel, Ka, Pol, Zen, Ira, Lux, Tor]
```

Example: `Lumorlex Shavi Oua`

---

# Lifecycle

Creature age is measured in **real days** from the Steem post's `created` timestamp.

Lifecycle stages are calculated as **percentages of effective lifespan** (base `LIF` + any feeding bonus).

| Stage          | Lifespan % | Unicode Grid |
| -------------- | ---------- | ------------ |
| 🥚 Baby        | 0–4%       | 6×6          |
| 🐣 Toddler     | 5–11%      | 10×10        |
| 🌿 Child       | 12–24%     | 14×14        |
| 🌱 Teenager    | 25–39%     | 18×18        |
| 🌸 Young Adult | 40–59%     | 22×22        |
| 🍃 Middle-Aged | 60–79%     | 26×26        |
| 🍂 Elder       | 80–99%     | 30×30        |
| 🦴 Fossil      | 100%+      | 18×18        |

Once the effective lifespan is exceeded the creature becomes a **fossil**. Fossils remain permanently on-chain as part of the ecosystem's history.

---

# Breeding

Users provide **two SteemBiota post URLs** as parents. The client loads both posts, extracts their genomes, validates compatibility, and generates a deterministic child genome.

## Compatibility Rules

* Both creatures must share the **same GEN** (same genus)
* Breeding is blocked if GEN values differ — an explicit error is shown

## Deterministic Child Generation

The child genome is seeded from a hash of both parent genomes, ensuring the same two parents always produce the same child. The seed uses mulberry32 PRNG:

```
seed = hash(parentA.genome values + parentB.genome values)
rng  = mulberry32(seed)
```

Each gene is randomly inherited from one parent, then optionally mutated:

```
child.MOR = pick(parentA.MOR, parentB.MOR)  → maybe mutate ±range
child.APP = pick(parentA.APP, parentB.APP)  → maybe mutate ±range
child.ORN = pick(parentA.ORN, parentB.ORN)  → maybe mutate ±range
child.CLR = pick(parentA.CLR, parentB.CLR)  → maybe mutate ±10
child.LIF = pick(parentA.LIF, parentB.LIF)  → maybe mutate ±10
child.MUT = min(5, pick + 20% chance of +1)
```

## Mutation Probability

```
mutationChance = 0.01 × (1 + parentA.MUT + parentB.MUT)
```

Founders have `MUT 0–2`, giving a base mutation chance of 1–3%. High-MUT lineages can reach up to 11%.

## Speciation

There is a **0.5% chance per breeding** that `GEN` mutates to an entirely new random value, producing a new genus. Speciation is flagged in the UI and recorded in `json_metadata`.

## Offspring Publishing

Offspring are published as new root posts (not replies) with `type: "offspring"` in metadata, linking back to both parent posts by author/permlink.

---

# Feeding System

Feeding represents **care from the owner or the community**. It never modifies the genome — all effects are computed from the blockchain reply history at read time.

## How It Works

A feeding event is a **reply to the creature's post thread** containing structured metadata:

```
json_metadata.steembiota.type = "feed"
json_metadata.steembiota.food = "nectar" | "fruit" | "crystal"
json_metadata.steembiota.feeder = "@username"
```

The client scans all replies with `fetchAllReplies`, then `parseFeedEvents` filters and deduplicates them to derive a clean feed count.

## Food Types

| Food    | Lifespan Effect   | Fertility Effect     |
| ------- | ----------------- | -------------------- |
| 🍯 Nectar  | +1 day per feed   | none                 |
| 🍎 Fruit   | +0.5 day per feed | +10% per feed        |
| 💎 Crystal | none              | +5% per feed         |

## Anti-Spam Rules (enforced client-side at read time)

* **1 feed per feeder per UTC day** — duplicate feeds on the same day are ignored
* **20 total feeds maximum** — earlier feeds take priority under the cap
* Earlier-timestamp feeds are processed first; the cap stops counting once reached

## Health Score

Owner feeds count **3×**, community feeds count **1×** toward the weighted health score. This rewards dedicated care while still allowing community support.

```
weightedScore = (ownerFeeds × 3) + (communityFeeds × 1)
healthPct     = weightedScore / 60   (max score = 20 owner feeds × 3)
```

Health levels and their visual symbols:

| Health    | healthPct | Symbol |
| --------- | --------- | ------ |
| Thriving  | ≥ 80%     | ✨      |
| Well-fed  | ≥ 55%     | ✦      |
| Nourished | ≥ 30%     | •      |
| Hungry    | > 0%      | ·      |
| Unfed     | 0%        | ·      |

## Feed Bonuses

* **Lifespan bonus** — +1 day per total feed, capped at 20% of base `LIF`
* **Fertility boost** — community feeds add +5% each, capped at +25%
* The effective lifespan (`LIF + lifespanBonus`) is used for all lifecycle and fossil calculations

## Visual Effects

**Canvas renderer** — `healthPct` modulates color saturation (±15) and lightness (±8). Thriving creatures are vivid; unfed ones appear pale and desaturated.

**Unicode renderer** — the body glyph pool changes when a creature is completely unfed (uses a dimmer `░▒·∘◌○` pool). When thriving, the header ornament row gets `✨ orn ✨` flanking. The health symbol prefixes the sigil line whenever any feeds exist.

---

# Visual Rendering

Creatures are rendered procedurally from their genome in two modes.

## Canvas Rendering

Used in the web interface. The rendering pipeline:

1. `buildPhenotype(genome, age, feedState)` — derives all visual parameters: body shape from `MOR`, appendages from `APP`, ornaments from `ORN`, color palette from `GEN % 8`, fertility aura, health modulation from `feedState`
2. `draw()` — paints tail, limbs, fins, body, pattern, horns, spikes, frills, head, eyes, glow nodes, fertility aura in order

Color palette families (cycling on `GEN % 8`):

| GEN % 8 | Base Hue | Family        |
| ------- | -------- | ------------- |
| 0       | 160°     | Teal/Emerald  |
| 1       | 200°     | Cyan/Sky      |
| 2       | 280°     | Violet/Purple |
| 3       | 30°      | Amber/Gold    |
| 4       | 340°     | Rose/Crimson  |
| 5       | 100°     | Lime/Olive    |
| 6       | 240°     | Blue/Indigo   |
| 7       | 55°      | Yellow/Ochre  |

Final hue = `(paletteBase + CLR) % 360`.

## Unicode Rendering

Used inside Steem posts so the creature's form is **stored permanently on-chain**. The grid is an ellipse distance-field renderer — body characters fill cells that fall inside the ellipse defined by `MOR`-derived radii.

The grid grows from 6×6 (baby) to 30×30 (elder), then shrinks to 18×18 for fossils. Appendage glyphs are injected at evenly-spaced body rows; a tail character appears below the body from the Child stage onward.

---

# Blockchain Structure

Each creature corresponds to a Steem post thread. All events are replies to the root post:

```
Root Creature Post  (type: "founder" | "offspring")
      ↓
Feeding Event       (type: "feed")
      ↓
Feeding Event       (type: "feed")
      ↓
Breeding Event      (offspring published as a new root post)
      ↓
... (fossilises when age ≥ effective lifespan)
```

All `json_metadata` uses the `steembiota/1.0` app identifier and a `steembiota` object with a `version`, `type`, `genome`, and event-specific fields.

---

# RPC Node Fallback

The client maintains a list of four Steem API nodes and automatically falls back to the next on error:

```
https://api.steemit.com
https://api.justyy.com
https://steemd.steemworld.org
https://api.steem.fans
```

---

# User Interface

## Pages

* **Home** — create founder creatures, view canvas + unicode renders, publish to Steem, feed creatures, breed creatures
* **Profile** (`/@username`) — displays a user's Steem profile: cover image, avatar, display name, bio
* **About** — describes the project and genome fields

## Global Profile Banner

When a user is logged in, a compact banner showing their **cover image, avatar, display name, and @username** is displayed at the top of every page. The profile is fetched once on login and cached for the session.

## Authentication

Login uses `steem_keychain.requestSignBuffer` to verify account ownership without exposing any keys. The verified username is stored in `localStorage`. Without Keychain, the app runs in **read-only mode** — creatures can be viewed but not published or fed.

---

# Technology

SteemBiota is intentionally minimal — no build tools, no bundler, no node_modules.

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| UI         | Vue 3 (CDN)                   |
| Routing    | Vue Router 4 (CDN)            |
| Blockchain | steem-js (CDN)                |
| Signing    | Steem Keychain (browser ext)  |
| Hosting    | GitHub Pages                  |

All logic runs **entirely client-side**. The Steem blockchain functions as the database, history log, and evolutionary archive.

---

# Future Ideas

* procedural genus color families based on GEN ranges
* hybridization mechanics between related genera
* evolutionary statistics and genealogy trees
* creature extinction tracking
* ecosystem visualization maps
* food type phase-2 expansion (crystal mutation effects)
* lifecycle snapshot posts (on-chain growth record)
* community stewardship leaderboards

---

# License

Open source. Community experimentation and forks are encouraged.

---

# Author

Created for the **Steem blockchain ecosystem**.
