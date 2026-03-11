# SteemBiota — Immutable Evolution

**SteemBiota** is a decentralised life simulation built on the **Steem blockchain**.

Creatures are generated from deterministic **genomes**, rendered procedurally as canvas paintings, and their entire existence — from birth through feeding, play, breeding, and fossilisation — is **permanently recorded on-chain**.

🌐 **Live app:** https://puncakbukit.github.io/steembiota

---

## Concept

SteemBiota explores digital organisms whose evolution is permanently stored on a blockchain.

Each creature has a compact genome that determines its body shape, colour, lifespan, and fertility window. Once published via Steem Keychain, the genome is immutable. A creature's lifecycle plays out in real time measured in days, and every interaction — feeding, playing, walking, breeding — is stored as a blockchain reply. The blockchain becomes the ecosystem's permanent fossil record.

---

## Technology Stack

The dApp runs entirely in the browser with no build tools and no backend.

| Layer | Technology |
|---|---|
| Blockchain | Steem (via steem-js) |
| Signing | Steem Keychain browser extension |
| UI Framework | Vue 3 (CDN) + Vue Router 4 (CDN) |
| Routing | Vue Router 4 (CDN, hash mode) |
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

The genome is stored inside every creature post in a fenced code block and in `json_metadata`, so any client can reconstruct the creature directly from the blockchain.

### Genus Names

Each GEN value maps to a stable procedurally-generated genus name (e.g. `GEN 42` → *Vyrex*). The name is derived solely from the GEN integer so all creatures of the same genus share the same name regardless of their other genes. Genus names appear in the genome table, on creature cards, in post bodies, and as a filter option on the Home and Profile pages.

---

## Lifecycle

Creature age is measured in **real days** since the post was published. Lifecycle stage is calculated as a percentage of LIF (adjusted for any lifespan bonuses from feeding and walk activity).

| Stage | Age % | Icon |
|---|---|---|
| Baby | 0–4% | 🥚 |
| Toddler | 5–11% | 🐣 |
| Child | 12–24% | 🌱 |
| Teenager | 25–39% | 🌿 |
| Young Adult | 40–59% | 🌸 |
| Middle-Aged | 60–79% | 🍃 |
| Elder | 80–99% | 🍂 |
| Fossil | 100%+ | 🦴 |

Once the lifespan is exceeded the creature becomes a **Fossil**. Its genome and history remain permanently on-chain but it can no longer be fed, played with, or used in breeding.

---

## Visual Rendering — Canvas

Every creature is rendered procedurally from its genome on a 400×320 HTML5 Canvas. The same genome always produces the same base visual. Three sources of per-load variation are layered on top: random facing direction, random pose, and live expression driven by game state.

### Anatomy (painter's algorithm, back to front)

Ground shadow → energy ribbons → back legs (dimmed for depth) → tail → torso with gradient → chest marking → body pattern → front legs → neck → mane wisps → head with snout and nose → ears → eye → **face expression overlay** → dorsal wing/fin → glowing orb nodes → fertility aura

### Genome → Visual Mapping

| Gene | Visual effect |
|---|---|
| `GEN` | Colour palette family (8 palette groups) |
| `MOR` | Body length, body height, head size, tail curl |
| `APP` | Leg length, leg thickness, ear height/width, wing presence |
| `ORN` | Glow orb count and hue, chest marking, mane wisps, body pattern type |
| `CLR` | Hue offset applied on top of palette base |
| `LIF` / age | Body scale (45% at birth → 100% at Young Adult → 75% at Fossil) |
| Feed health | Colour saturation and lightness boost |

### Facing Direction

On each page load the creature is mirrored left or right at random via a canvas transform. The direction is stable for the lifetime of that component instance.

### Poses

On each page load the creature is assigned one of five poses at random. The pose is stable for the lifetime of that component instance.

| Pose | Description |
|---|---|
| 🐾 Standing | Default upright side profile |
| 👀 Alert | Torso raised, head lifted high, tail swept straight up |
| 🎉 Playful | Play-bow: front legs stretched forward and low, rear elevated, tail up |
| 🪑 Sitting | Torso tilted rear-down (~17°), folded haunches resting on the ground at the base of the tilted rear, front legs straight, tail wrapped under body |
| 💤 Sleeping | Body flat and low, head resting on ground, all legs tucked as flat pads, tail curled under, eye closed |

The torso ellipse rotation, haunch/leg positions, head and neck angle, tail shape, and shadow scale are all adjusted per pose. Fossil creatures always render in a flat fossilised form regardless of pose. A small italic label below the canvas shows the active pose.

### Face Expressions

Expressions are derived from live game state (feedState + activityState) and re-evaluated whenever data reloads. Pose overrides take highest priority.

| Expression | Trigger | Visual |
|---|---|---|
| 😴 Sleepy | Sleeping pose | Closed-eye arc, drooped heavy brow, tiny neutral mouth |
| 👀 Alert | Alert pose | Enlarged eye (×1.15), raised straight brow, neutral mouth |
| 🎉 Excited | Playful pose | Wide open smile + tongue dot, arched brow, star glints beside eye |
| ✨ Thriving | Health ≥ 80% (or play-boosted) | Big smile + tongue, raised brow, rosy cheek blush, star glints |
| 😊 Happy | Health ≥ 55% | Gentle smile, relaxed raised brow |
| 😐 Content | Health ≥ 30% or no data yet | Neutral straight mouth, flat brow |
| 😟 Hungry | Health > 0% but < 30% | Slight frown, one-sided worried brow, pupil shifted down |
| 😢 Sad | Completely unfed (health = 0%) | Pronounced frown, inward V-brow, teardrop below eye, pupil down |

Play activity adds up to +25% to the effective health score before picking the expression, so a well-played but underfed creature can still appear happier. Expressions only appear from Toddler stage onward.

---

## Visual Rendering — Unicode

Used inside Steem post bodies so the creature's form is stored permanently on-chain as plain text.

Art width grows with lifecycle stage (14 chars at Baby up to 36 at Young Adult, back to 30 at Elder, 24 at Fossil). Row structure: ears and mane above, optional dorsal wing, body rows (head / body / tail zones), leg columns below. Fertile creatures show sparkle characters in the header line.

| Gene | Unicode effect |
|---|---|
| `MOR` mod 6 | Body fill palette and tail character style |
| `APP` mod 4 | Ear and paw shape |
| `APP` mod 5 | Dorsal wing presence (rare) |
| `ORN` mod 6 | Ornament and orb glyph |
| `ORN` mod 3 | Mane presence |
| `ORN` continuous | Orb count (1–4) and position |
| `GEN` mod 4 | Eye glyph |
| `GEN` mod 6 | Header sigil |

---

## Feeding

Any logged-in Steem user can feed a creature by loading its post page. Each feed is published as a blockchain reply.

### Food Types

| Food | Lifespan bonus | Fertility boost |
|---|---|---|
| Nectar | +1 day per feed | none |
| Fruit | +0.5 days per feed | +10% per feed |
| Crystal | none | +5% per feed |

### Feed Rules

- Each feeder is counted at most once per UTC day (anti-spam).
- Total feeds are capped at 20 per creature lifetime.
- Owner feeds count 3× toward the health score; community feeds count 1×.
- Maximum lifespan bonus: +20% of base LIF.
- Maximum fertility boost from community feeding: +25%.

### Health States

| State | Threshold |
|---|---|
| Thriving | 80%+ |
| Well-fed | 55%+ |
| Nourished | 30%+ |
| Hungry | above 0% |
| Unfed | 0% |

---

## Activities — Play & Walk

Beyond feeding, logged-in users can interact with a creature through two daily activities. Activity events are published as blockchain replies and scored separately from feed events.

### Play 🎮

Playing improves the creature's **mood**, which affects its face expression and extends its fertility window.

- Each player is counted at most once per UTC day (anti-spam). Cap: 15 play events.
- Owner plays count 2×; community plays count 1×.
- **Mood score** (0–100%) scales linearly from total weighted play count.
- **Fertility extension**: up to +10 days added to each side of the fertility window at max mood.

### Walk 🦮

Walking builds the creature's **vitality**, which extends its lifespan.

- Same anti-spam rules as play (1 per user per UTC day). Cap: 15 walk events.
- Owner walks count 2×; community walks count 1×.
- **Vitality score** (0–100%) scales linearly from total weighted walk count.
- **Lifespan bonus**: up to +10 extra days at max vitality.

Mood and vitality badges (purple and teal) are shown in the creature page header stats row. The activity panel shows today's status and prevents duplicate actions.

---

## Breeding

Users pair two compatible creatures by pasting their Steem post URLs. The child genome is generated deterministically and published as a new Steem post.

### Compatibility Rules

All of the following must be true:

1. Same GEN (same genus)
2. Opposite SX (one Male, one Female)
3. Both creatures are within their fertility window at the time of breeding
4. Neither creature is the other's close relative (see Kinship Rules)

### Gene Inheritance

Each gene is inherited from one parent chosen at random (50/50), then potentially mutated. Mutation probability per gene = 1% × (1 + MUT_A + MUT_B). Breeding is deterministic: the same two parents always produce the same child, using a seeded PRNG (mulberry32) keyed on both parent genomes.

### Speciation

There is a 0.5% chance per breeding event that the child's GEN mutates to an entirely new value, creating a new genus. Speciated offspring cannot breed with their parents' genus.

### Kinship Rules

SteemBiota walks the blockchain ancestry graph before allowing a breed. A creature cannot breed with:

1. Its own and its partner's parents, grandparents, and all ancestors upward
2. Its own and its partner's siblings (full or half — any creature sharing at least one parent)
3. Its own and its partner's children, grandchildren, and all descendants downward
4. Its own and its partner's parents' siblings (aunts and uncles)
5. Its own and its partner's siblings' children and all descendants downward

The check is entirely client-side using BFS ancestry traversal (up to 12 generations). If blocked, the UI names the specific relationship that prevents breeding.

---

## User Levels & XP

Every on-chain action earns XP for the acting user. XP totals are computed client-side from blockchain history and displayed on each user's profile page.

| Action | XP |
|---|---|
| Publish a founder creature | 100 |
| Publish an offspring | 500 |
| Feed a creature (owner) | 20 |
| Feed a creature (community) | 10 |
| Play with a creature | 5 |
| Walk a creature | 5 |

XP thresholds follow a quadratic curve. Level title and progress are shown prominently on the profile page.

---

## Leaderboard

The `/leaderboard` page ranks all known SteemBiota participants by XP. It paginates through up to 200 creature posts using cursor-based pagination (Steem's API hard-limits responses to 100 posts per call), aggregates per-user XP from all activity, and displays the top players with their level badges.

---

## Creature Grid Filters

Both the Home page and individual Profile pages include a filter bar above the creature grid:

- **Genus** — filter by genus name (e.g. show only *Vyrex* creatures)
- **Sex** — filter by Male / Female
- **Age** — filter by age in days using `<`, `=`, or `>` operators with a numeric input

Filters can be combined and are cleared individually. Pagination resets automatically when a filter changes.

---

## App Routes

| URL | View |
|---|---|
| `/#/` | Home — creature grid with filters, founder creator |
| `/#/about` | About page |
| `/#/leaderboard` | Global XP leaderboard |
| `/#/@user` | User profile — creature grid with filters, level/XP badge, Steem profile header |
| `/#/@author/permlink` | Creature page — canvas render with pose + expression, unicode render, genome table, stats, feed panel, activity panel (play/walk), breed panel |

---

## Blockchain Post Structure

### Creature post (`json_metadata.steembiota`)

```json
{
  "version": "1.0",
  "type": "creature",
  "genome": { "GEN": 42, "SX": 0, "MOR": 1234, "APP": 5678, "ORN": 9012, "CLR": 180, "LIF": 100, "FRT_START": 30, "FRT_END": 70, "MUT": 1 },
  "name": "Vyrex Nymwhisper",
  "genusName": "Vyrex",
  "age": 0,
  "lifecycleStage": "Baby",
  "parentA": { "author": "alice", "permlink": "vyrex-nymwhisper-..." },
  "parentB": { "author": "bob",   "permlink": "vyrex-shadowpaw-..." },
  "mutated": false,
  "speciated": false
}
```

`parentA`, `parentB`, `mutated`, and `speciated` are only present on offspring posts.

### Feed reply (`json_metadata.steembiota`)

```json
{
  "version": "1.0",
  "type": "feed",
  "creature": { "author": "alice", "permlink": "vyrex-nymwhisper-..." },
  "feeder": "carol",
  "food": "nectar",
  "ts": "2026-01-03T07:00:00Z"
}
```

### Activity reply (`json_metadata.steembiota`)

```json
{
  "version": "1.0",
  "type": "play",
  "creature": { "author": "alice", "permlink": "vyrex-nymwhisper-..." },
  "player": "carol",
  "ts": "2026-01-03T07:30:00Z"
}
```

`type` is `"play"` or `"walk"`.

### Post titles

Default title format (UTC time, user-editable before publishing):

```
Vyrex Nymwhisper — born at 7 in the morning UTC on Monday, January 3, 2026
```

### Permlinks

Derived from the post title: lowercased, whitespace becomes hyphens, non-alphanumeric stripped, truncated at 200 chars, then a millisecond timestamp appended. Always unique.

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
