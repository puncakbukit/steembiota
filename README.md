# SteemBiota — Immutable Evolution

**SteemBiota** is an experimental decentralized life simulation built on the **Steem blockchain**.

Creatures are generated from deterministic **genomes**, rendered procedurally, and their **entire life history is permanently recorded on-chain**.

Every creature begins as a **baby**, grows through multiple lifecycle stages, can **reproduce with compatible partners**, and eventually becomes a **fossil** — but its record remains forever.

The project runs entirely in the browser and uses the Steem blockchain as its **permanent evolutionary database**.

---

# Concept

SteemBiota explores the idea of **digital organisms whose evolution is permanently stored on a blockchain**.

Each creature has:

* a deterministic **genome**
* a **visual form** rendered procedurally
* a **lifespan measured in real days**
* a **fertility window**
* the ability to **breed with other compatible creatures**

Every stage of a creature’s life can be posted to Steem as replies to the creature’s root post, forming a **permanent evolutionary record**.

The blockchain effectively becomes the **ecosystem's fossil record**.

---

# Key Principles

### Immutable Evolution

All creature snapshots are stored on the **Steem blockchain**.
Once published, they cannot be altered.

---

### Deterministic Rendering

A creature’s genome always produces the **same visual form**.

The same genome rendered anywhere will produce **identical creatures**.

---

### Fully Client-Side

The entire dApp runs in the browser using:

* `steem-js`
* `Steem Keychain`

No servers or backend infrastructure are required.

---

### Procedural Life

Creature age is derived from **Steem block timestamps**.

Time in the blockchain becomes the **clock of the ecosystem**.

---

# Creature Genome

Each creature is defined by a compact genome:

```
GEN → Genus ID (species barrier + color family)
SX  → Sex (0 = Male, 1 = Female)
MOR → Morphology seed (body structure)
APP → Appendage seed (limbs / horns / fins)
ORN → Ornament seed (patterns / spikes / glow)
CLR → Color variation offset
LIF → Lifespan (days)
FRT_START → Fertility start age (days)
FRT_END → Fertility end age (days)
MUT → Mutation tendency
```

The genome determines:

* body structure
* appendages
* ornamentation
* color family
* lifespan
* reproductive traits
* mutation probability

The genome is stored inside creature posts using a dedicated block:

````markdown
```genome
{
 "GEN":4987,
 "SX":1,
 "MOR":2834,
 "APP":1832,
 "ORN":642,
 "CLR":197,
 "LIF":142,
 "FRT_START":20,
 "FRT_END":60,
 "MUT":12
}
```
````

This allows clients to **parse and reconstruct creatures directly from the blockchain**.

---

# Lifecycle

Creature age is measured in **real days** based on Steem block timestamps.

Lifecycle stages are calculated as **percentages of lifespan**.

| Stage          | Age    |
| -------------- | ------ |
| 🥚 Baby        | 0–4%   |
| 🐣 Toddler     | 5–11%  |
| 🌿 Child       | 12–24% |
| 🌱 Teenager    | 25–39% |
| 🌸 Young Adult | 40–59% |
| 🍃 Middle-Aged | 60–79% |
| 🍂 Elder       | 80–99% |
| 🦴 Fossil      | 100%+  |

Once the lifespan is exceeded, the creature becomes a **fossil**.

Fossils remain permanently stored on-chain as part of the ecosystem's history.

---

# Breeding

Creatures can reproduce by combining genomes.

Users provide **two Steem post URLs** representing parent creatures.

The SteemBiota client then:

1. Loads both posts
2. Extracts their genomes
3. Validates compatibility
4. Generates a child genome

---

## Breeding Rules

Creatures can breed only if:

* same **GEN** (same genus)
* opposite **SX** (male + female)
* both are inside their **fertility window**

---

## Gene Inheritance

Each gene is inherited randomly from one of the parents.

Example:

```
child.MOR = random(parentA.MOR, parentB.MOR)
child.APP = random(parentA.APP, parentB.APP)
child.ORN = random(parentA.ORN, parentB.ORN)
```

---

## Mutation

Mutation probability is determined by the **MUT gene**.

Higher MUT values increase the probability that a gene will randomly shift during inheritance.

Example mutation:

```
gene = gene + random(-20, 20)
```

Mutation introduces **evolutionary diversity** into the ecosystem.

---

# Visual Rendering

Creatures are rendered procedurally from their genome.

Two rendering modes exist.

---

## Canvas Rendering

Used inside the web interface for **interactive visualization**.

Canvas rendering produces richer graphical creatures.

---

## Unicode Rendering

Used inside Steem posts so the creature's form is **stored permanently on-chain**.

Unicode creatures evolve in size according to lifecycle stage.

| Stage       | Grid Size |
| ----------- | --------- |
| Baby        | 12×12     |
| Toddler     | 16×16     |
| Child       | 20×20     |
| Teen        | 24×24     |
| Young Adult | 28×28     |
| Middle Age  | 32×32     |
| Elder       | 36×36     |
| Fossil      | 24×24     |

Unicode rendering ensures the creature remains **viewable forever**, even if the web interface disappears.

---

# Blockchain Structure

Each creature corresponds to a **Steem post thread**.

```
Root Creature Post
      ↓
Lifecycle snapshot
      ↓
Lifecycle snapshot
      ↓
Breeding event
      ↓
Fossil state
```

This creates a **permanent evolutionary timeline**.

The blockchain effectively acts as the **ecosystem's fossil archive**.

---

# Founder Creatures

The ecosystem begins with a limited set of **founder creatures**.

Only the `@steembiota` account can generate founders.

All other creatures must arise through **breeding**.

This allows the ecosystem to grow organically over time.

---

# Technology

SteemBiota is intentionally minimal.

Frontend only:

* JavaScript
* steem-js
* Steem Keychain
* GitHub Pages

All logic runs **entirely client-side**.

The Steem blockchain functions as:

* database
* history log
* evolutionary archive

---

# Goals

SteemBiota explores several ideas:

* decentralized life simulation
* procedural creatures
* blockchain-recorded evolution
* immutable digital ecosystems
* community-driven biodiversity

It is both a **technical experiment** and a **creative exploration**.

---

# Future Ideas

Possible future expansions include:

* procedural species names
* genus color families
* hybridization between genera
* rare mutation events
* evolutionary statistics
* creature genealogy trees
* extinction tracking
* ecosystem visualization maps

---

# License

Open source.

Community experimentation and forks are encouraged.

---

# Author

Created for the **Steem blockchain ecosystem**.
