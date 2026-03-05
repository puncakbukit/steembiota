// ============================================================
// app.js
// SteemBiota — Immutable Evolution
// Vue 3 + Vue Router 4 SPA entry point.
// ============================================================

const { createApp, ref, computed, onMounted, provide, inject, nextTick } = Vue;
const { createRouter, createWebHashHistory, useRoute } = VueRouter;

// ============================================================
// STEEMBIOTA GENOME HELPERS (pure functions, no DOM)
// ============================================================

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function generateGenome() {
  const LIF       = 80 + randomInt(80);
  const FRT_START = Math.min(20 + randomInt(20), LIF - 10);
  const FRT_END   = Math.min(60 + randomInt(20), LIF - 1);
  return {
    GEN: randomInt(1000),
    SX:  randomInt(2),      // 0 = male, 1 = female
    MOR: randomInt(9999),
    APP: randomInt(9999),
    ORN: randomInt(9999),
    CLR: randomInt(360),
    LIF,
    FRT_START,
    FRT_END,
    MUT: randomInt(3)       // 0–2 for founders; range 0–5
  };
}

// ============================================================
// STEEMBIOTA BREEDING SYSTEM
// ============================================================

// Seeded PRNG (mulberry32) — ensures same parents + seed → same child.
// Returns a function yielding floats in [0, 1).
function makePrng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Derive a deterministic integer seed from two genomes.
// Uses a simple hash over all gene values so order-of-paste doesn't matter.
function breedSeed(a, b) {
  const vals = [a.GEN,a.MOR,a.APP,a.ORN,a.CLR,a.LIF,a.MUT,
                b.GEN,b.MOR,b.APP,b.ORN,b.CLR,b.LIF,b.MUT];
  return vals.reduce((h, v) => (Math.imul(h ^ (v | 0), 0x9e3779b9) >>> 0), 0x12345678);
}

// Mutation probability from both parents' MUT genes.
// base = 1%; scales with combined MUT.
function mutationChance(a, b) {
  return 0.01 * (1 + a.MUT + b.MUT);
}

// Inherit one gene: pick from either parent, then optionally mutate.
// rng     — seeded PRNG function
// a, b    — parent gene values
// mChance — probability of mutation this call
// range   — max ± shift when mutation fires
// min/max — clamp bounds
function inheritGene(rng, a, b, mChance, range, min, max) {
  let v = rng() < 0.5 ? a : b;
  if (rng() < mChance) {
    v = v + Math.floor(rng() * range * 2) - range;
  }
  return Math.max(min, Math.min(max, Math.round(v)));
}

// Rare speciation: 0.5% chance GEN mutates to an entirely new value.
function maybeSpeciate(rng, gen) {
  if (rng() < 0.005) return Math.floor(rng() * 1000);
  return gen;
}

// Parse a Steem post URL into { author, permlink }.
// Handles steemit.com and plain author/permlink strings.
function parseSteemUrl(url) {
  url = url.trim();
  // Match https://steemit.com/category/@author/permlink
  // or    https://steemit.com/@author/permlink
  const m = url.match(/@([a-z0-9.-]+)\/([a-z0-9-]+)\s*$/i);
  if (!m) throw new Error("Cannot parse Steem URL: " + url);
  return { author: m[1], permlink: m[2] };
}

// Load a genome from a published SteemBiota post.
// Tries json_metadata first (fast), falls back to body regex.
async function loadGenomeFromPost(url) {
  const { author, permlink } = parseSteemUrl(url);
  const post = await fetchPost(author, permlink);
  if (!post || !post.author) throw new Error("Post not found: " + url);

  // Try json_metadata.steembiota.genome first
  try {
    const meta = JSON.parse(post.json_metadata || "{}");
    if (meta.steembiota && meta.steembiota.genome) {
      return { genome: meta.steembiota.genome, author, permlink };
    }
  } catch {}

  // Fallback: parse ```genome ... ``` block from post body
  const match = post.body.match(/```genome\s*([\s\S]*?)```/);
  if (!match) throw new Error("No genome found in post: " + url);
  return { genome: JSON.parse(match[1].trim()), author, permlink };
}

// Breed two genomes into a child genome.
// Returns { child, mutated, speciated } for display purposes.
function breedGenomes(a, b) {
  if (a.GEN !== b.GEN) {
    throw new Error(
      "Genus mismatch: GEN " + a.GEN + " ≠ GEN " + b.GEN +
      ". Only same-genus creatures can breed."
    );
  }

  const seed  = breedSeed(a, b);
  const rng   = makePrng(seed);
  const mCh   = mutationChance(a, b);
  const i     = (av, bv, range, min, max) => inheritGene(rng, av, bv, mCh, range, min, max);

  // Track whether any mutation fired (for UI feedback)
  const beforeMOR = (rng() < 0.5 ? a.MOR : b.MOR); // peek — rewind not possible, so we check post-hoc below
  void beforeMOR; // used indirectly via child fields

  const child = {
    GEN:       a.GEN,                                   // same genus (may speciate below)
    SX:        Math.floor(rng() * 2),                   // 50/50 sex
    MOR:       i(a.MOR, b.MOR,  200, 0,    9999),
    APP:       i(a.APP, b.APP,  200, 0,    9999),
    ORN:       i(a.ORN, b.ORN,  200, 0,    9999),
    CLR:       i(a.CLR, b.CLR,   10, 0,     359),
    LIF:       i(a.LIF, b.LIF,   10, 40,    200),
    FRT_START: 0,   // recalculated below
    FRT_END:   0,
    MUT:       Math.min(5, i(a.MUT, b.MUT, 1, 0, 5) + (rng() < 0.2 ? 1 : 0))
  };

  // Recalculate FRT bounds from child LIF
  child.FRT_START = Math.min(
    i(a.FRT_START, b.FRT_START, 5, 10, child.LIF - 10),
    child.LIF - 10
  );
  child.FRT_END = Math.min(
    i(a.FRT_END, b.FRT_END, 5, child.FRT_START + 5, child.LIF - 1),
    child.LIF - 1
  );

  // Speciation check — may change GEN to a new value
  const originalGEN = child.GEN;
  child.GEN = maybeSpeciate(rng, child.GEN);
  const speciated = child.GEN !== originalGEN;

  // Detect if any field mutated vs simple mix
  const simpleMix = {
    MOR: rng() < 0.5 ? a.MOR : b.MOR,
    APP: rng() < 0.5 ? a.APP : b.APP,
    ORN: rng() < 0.5 ? a.ORN : b.ORN,
  };
  const mutated =
    speciated ||
    Math.abs(child.MOR - simpleMix.MOR) > 0 ||
    Math.abs(child.APP - simpleMix.APP) > 0 ||
    Math.abs(child.ORN - simpleMix.ORN) > 0;

  return { child, mutated, speciated };
}

// ============================================================
// STEEMBIOTA NAMING SYSTEM (deterministic from genome)
// ============================================================

const syllablesA = ["Lu", "Te", "Mo", "Va", "Zi", "Ra", "Ko", "Ny"];
const syllablesB = ["mo", "ra", "vi", "to", "na", "shi", "ka", "re"];
const syllablesC = ["ra", "nus", "tor", "lex", "via", "ron", "dus", "x"];

const speciesA = ["Shavi", "Virel", "Morun", "Zerin", "Talin", "Korin", "Velis", "Nora"];
const speciesB = ["Oua", "Tel", "Ka", "Pol", "Zen", "Ira", "Lux", "Tor"];

function generateGenusName(GEN) {
  const a = syllablesA[GEN % syllablesA.length];
  const b = syllablesB[Math.floor(GEN / 3) % syllablesB.length];
  const c = syllablesC[Math.floor(GEN / 7) % syllablesC.length];
  return a + b + c;
}

function generateSpeciesName(MOR, ORN) {
  const partA = speciesA[MOR % speciesA.length];
  const partB = speciesB[ORN % speciesB.length];
  return partA + " " + partB;
}

function generateFullName(genome) {
  const genus   = generateGenusName(genome.GEN);
  const species = generateSpeciesName(genome.MOR, genome.ORN);
  return genus + " " + species;
}

// ============================================================
// STEEMBIOTA AGING SYSTEM (deterministic from block timestamp)
// ============================================================

// Returns age in whole days from a Steem post.created timestamp.
function calculateAge(birthTimestamp) {
  const now   = new Date();
  const birth = new Date(
    typeof birthTimestamp === "string" && !birthTimestamp.endsWith("Z")
      ? birthTimestamp + "Z"
      : birthTimestamp
  );
  const diffSeconds = (now - birth) / 1000;
  return Math.max(0, Math.floor(diffSeconds / 86400));
}

// Lifecycle stages defined as percentage thresholds of LIF (lifespan).
// Fossil is the post-death state beyond 100%.
const LIFECYCLE_STAGES = [
  { name: "Baby",        from: 0,    icon: "🥚", color: "#90caf9" },
  { name: "Toddler",     from: 0.05, icon: "🐣", color: "#80deea" },
  { name: "Child",       from: 0.12, icon: "🌿", color: "#a5d6a7" },
  { name: "Teenager",    from: 0.25, icon: "🌱", color: "#66bb6a" },
  { name: "Young Adult", from: 0.40, icon: "🌸", color: "#f48fb1" },
  { name: "Middle-Aged", from: 0.60, icon: "🍃", color: "#ffb74d" },
  { name: "Elder",       from: 0.80, icon: "🍂", color: "#ff8a65" },
  // Sentinel — age >= LIF means Fossil
  { name: "Fossil",      from: 1.00, icon: "🦴", color: "#666"    },
];

// Returns the full stage object for the creature's current age.
function getLifecycleStage(age, genome) {
  const pct = age / genome.LIF;
  // Walk backwards to find the highest threshold not exceeded
  for (let i = LIFECYCLE_STAGES.length - 1; i >= 0; i--) {
    if (pct >= LIFECYCLE_STAGES[i].from) return LIFECYCLE_STAGES[i];
  }
  return LIFECYCLE_STAGES[0];
}

function isFossil(age, genome) {
  return age >= genome.LIF;
}

// ============================================================
// STEEMBIOTA UNICODE ART SYSTEM v2
// Radial distance-field renderer — organic oval body shape.
// Grid grows with lifecycle stage; all values are deterministic.
// ============================================================

// ---- Glyph pools ----
const UNI_BODY        = ["●","◉","◆","◍","▣","⬡"];        // MOR % 6
const UNI_BODY_ELDER  = ["◇","○","◎","□","◌","▢"];        // MOR % 6  hollow/aged
const UNI_FOSSIL_BODY = ["▒","░","▓","╬","╪","╫"];        // GEN % 6
const UNI_FOSSIL_HEAD = ["☉","⊗","⊙","◎","⊛","⊜"];        // GEN % 6
const UNI_SIGIL       = ["⟡","✶","❖","✦","◈","✧"];        // GEN % 6
const UNI_ORN         = ["✦","✧","✶","✹","❈","✷"];        // ORN % 6
const UNI_TAIL        = ["∿","≋","∾","~","⌇","⌀"];        // MOR % 6
const UNI_APP_L       = ["◁","(","«","⟨","╱","<"];        // APP % 6
const UNI_APP_R       = ["▷",")",">","⟩","╲","»"];        // APP % 6
const UNI_SPARKLE     = "✦";

// ---- Grid size by lifecycle percentage ----
function unicodeGridSize(pct) {
  if (pct < 0.05) return 6;
  if (pct < 0.12) return 10;
  if (pct < 0.25) return 14;
  if (pct < 0.40) return 18;
  if (pct < 0.60) return 22;
  if (pct < 0.80) return 26;
  if (pct < 1.00) return 30;
  return 18; // fossil
}

// ---- Main builder ----
// genome : genome object
// age    : integer days (0 = newborn)
function buildUnicodeArt(genome, age) {
  const pct    = Math.min(age / genome.LIF, 1.0);
  const fossil = pct >= 1.0;
  const size   = unicodeGridSize(pct);
  const cx     = size / 2;        // fractional centre x
  const cy     = size / 2;        // fractional centre y

  // ---- Glyph selection ----
  const bodyChar = fossil
    ? UNI_FOSSIL_BODY[genome.GEN % UNI_FOSSIL_BODY.length]
    : (pct >= 0.80 ? UNI_BODY_ELDER : UNI_BODY)[genome.MOR % UNI_BODY.length];
  const sigil   = UNI_SIGIL [genome.GEN % UNI_SIGIL.length];
  const ornChar = UNI_ORN   [genome.ORN % UNI_ORN.length];
  const tailChar = UNI_TAIL [genome.MOR % UNI_TAIL.length];
  const appL    = UNI_APP_L [genome.APP % UNI_APP_L.length];
  const appR    = UNI_APP_R [genome.APP % UNI_APP_R.length];
  const sex     = genome.SX === 0 ? "♂" : "♀";
  const fertile = age >= genome.FRT_START && age < genome.FRT_END && !fossil;

  // ---- Radii derived from genome + stage ----
  // rx/ry: ellipse radii as fractions of size/2.
  // MOR biases the shape; lifecycle narrows/widens it.
  const morFrac = (genome.MOR % 1000) / 1000;   // 0.0–1.0
  const baseRx  = 0.30 + morFrac * 0.18;        // 0.30–0.48 of size/2
  const baseRy  = 0.38 + morFrac * 0.14;        // 0.38–0.52
  // Stage modifiers: body shrinks slightly for elder/fossil
  const stageScale = pct >= 0.80 ? 0.88 : 1.0;
  const rx = baseRx * stageScale * (size / 2);
  const ry = baseRy * stageScale * (size / 2);

  // Appendage rows: APP determines how many side rows get flanking glyphs.
  // Active from Child (pct>=0.12). Count scales with grid.
  const appCount = pct >= 0.12
    ? Math.max(1, 2 + Math.floor((genome.APP % 4) * pct))
    : 0;

  // ---- Build grid row by row ----
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) {
      // Ellipse membership test using pixel centres (+0.5)
      const dx = (x + 0.5) - cx;
      const dy = (y + 0.5) - cy;
      const inside = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0;
      if (inside) {
        row += bodyChar;
      } else {
        row += " ";
      }
    }
    rows.push(row);
  }

  // ---- FOSSIL: replace body with fossil chars + crack overlay ----
  if (fossil) {
    // Already using fossil bodyChar; just add bracket frame on first/last body rows
    const firstBody = rows.findIndex(r => r.trim().length > 0);
    const lastBody  = rows.length - 1 - [...rows].reverse().findIndex(r => r.trim().length > 0);
    const fh = UNI_FOSSIL_HEAD[genome.GEN % UNI_FOSSIL_HEAD.length];
    // Insert head above first body row
    if (firstBody > 0) {
      rows[firstBody - 1] = " ".repeat(Math.floor(size / 2)) + fh;
    }
    const result = rows.join("\n");
    return result;
  }

  // ---- APPENDAGES: inject limb chars on side cells of select rows ----
  if (appCount > 0) {
    // Find body rows (non-empty) and pick evenly spaced ones for appendages
    const bodyRowIdxs = rows
      .map((r, i) => ({ i, filled: r.trim().length }))
      .filter(r => r.filled > 0)
      .map(r => r.i);
    // Space appendage rows evenly across body, skipping first and last
    const inner = bodyRowIdxs.slice(1, -1);
    const step  = Math.max(1, Math.floor(inner.length / appCount));
    for (let a = 0; a < appCount && a * step < inner.length; a++) {
      const ri = inner[a * step];
      const row = rows[ri];
      // Find leftmost and rightmost body char positions
      const left  = row.indexOf(bodyChar);
      const right = row.lastIndexOf(bodyChar);
      if (left > 0 && right < size - 1) {
        rows[ri] =
          row.slice(0, left - 1) + appL +
          row.slice(left, right + 1) +
          appR + row.slice(right + 2);
      }
    }
  }

  // ---- HEADER: sigil + sex (+ ornament if Teen+, sparkles if fertile) ----
  const headerLines = [];
  if (pct >= 0.25) {
    const ornRow = fertile
      ? UNI_SPARKLE + " " + sigil + sex + " " + UNI_SPARKLE
      : ornChar;
    headerLines.push(ornRow);
  }
  headerLines.push(sigil + sex);

  // ---- TAIL: append below last body row (Child+) ----
  // Find last row with body content and place tail just after
  const lastBodyRow = rows.length - 1 - [...rows].reverse().findIndex(r => r.trim().length > 0);
  if (pct >= 0.12 && lastBodyRow < rows.length - 1) {
    rows[lastBodyRow + 1] = " ".repeat(Math.floor(size / 2)) + tailChar;
  } else if (pct >= 0.12) {
    rows.push(" ".repeat(Math.floor(size / 2)) + tailChar);
  }

  // ---- Trim blank rows from top and bottom of body grid ----
  while (rows.length > 0 && rows[0].trim() === "") rows.shift();
  while (rows.length > 0 && rows[rows.length - 1].trim() === "") rows.pop();

  // ---- Centre helper ----
  function centre(str, width) {
    const pad = Math.max(0, Math.floor((width - str.length) / 2));
    return " ".repeat(pad) + str;
  }

  // ---- Combine header + body rows ----
  // Total target = size lines exactly.
  // headerLines sit first; remaining lines come from body rows.
  // If body rows + header < size, pad with empty lines at bottom.
  // If body rows + header > size, trim from bottom (shouldn't happen normally).
  const combined = [
    ...headerLines.map(h => centre(h, size)),
    ...rows
  ];
  while (combined.length < size) combined.push("");
  while (combined.length > size) combined.pop();

  return combined.join("\n");
}
// ============================================================
// ROUTE VIEWS
// ============================================================

// ---- HomeView (SteemBiota main) ----
const HomeView = {
  name: "HomeView",
  inject: ["username", "hasKeychain", "notify"],
  components: {
    CreatureCanvasComponent,
    GenomeTableComponent,
    LoadingSpinnerComponent,
    BreedingPanelComponent
  },
  data() {
    return {
      genome:         null,
      unicodeArt:     "",
      publishing:     false,
      birthTimestamp: null,   // set at creation time; mimics post.created
      now:            new Date()
    };
  },
  created() {
    // Tick every minute so age display stays current
    this._ageTicker = setInterval(() => { this.now = new Date(); }, 60000);
  },
  beforeUnmount() {
    clearInterval(this._ageTicker);
  },
  computed: {
    creatureName() {
      return this.genome ? generateFullName(this.genome) : null;
    },
    sexLabel() {
      return this.genome ? (this.genome.SX === 0 ? "♂ Male" : "♀ Female") : "";
    },
    age() {
      if (!this.birthTimestamp) return 0;
      const diffSec = (this.now - new Date(this.birthTimestamp)) / 1000;
      return Math.max(0, Math.floor(diffSec / 86400));
    },
    lifecycleStage() {
      return this.genome ? getLifecycleStage(this.age, this.genome) : null;
    },
    fossil() {
      return this.genome ? isFossil(this.age, this.genome) : false;
    },
    lifecycleColor() {
      return this.lifecycleStage ? this.lifecycleStage.color : "#888";
    },
    lifecycleIcon() {
      return this.lifecycleStage ? this.lifecycleStage.icon : "";
    }
  },
  watch: {
    age(newAge) {
      if (this.genome) this.unicodeArt = buildUnicodeArt(this.genome, newAge);
    }
  },
  methods: {
    createFounder() {
      this.birthTimestamp = new Date().toISOString();
      this.genome         = generateGenome();
      this.unicodeArt     = buildUnicodeArt(this.genome, 0);
    },

    async publishCreature() {
      if (!this.username) {
        this.notify("Please log in first.", "error");
        return;
      }
      if (!this.genome) {
        this.notify("Create a creature first.", "error");
        return;
      }
      if (!window.steem_keychain) {
        this.notify("Steem Keychain is not installed.", "error");
        return;
      }

      this.publishing = true;
      publishCreature(this.username, this.genome, this.unicodeArt, this.creatureName, this.age, this.lifecycleStage.name, (response) => {
        this.publishing = false;
        if (response.success) {
          this.notify("🌿 " + this.creatureName + " published to the blockchain!", "success");
        } else {
          this.notify("Publish failed: " + (response.message || "Unknown error"), "error");
        }
      });
    }
  },

  template: `
    <div style="margin-top:20px;padding:0 16px;">

      <!-- Create button -->
      <button @click="createFounder">🌱 Create Founder Creature</button>

      <!-- Identity header -->
      <div v-if="creatureName" style="margin:16px 0 6px;">
        <div style="font-size:1.3rem;font-weight:bold;color:#a5d6a7;letter-spacing:0.03em;">
          ❇ {{ creatureName }}
        </div>
        <div style="font-size:0.9rem;color:#888;margin-top:2px;">{{ sexLabel }}</div>

        <!-- Age + lifecycle badge -->
        <div style="margin-top:8px;display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
          <span style="font-size:0.85rem;color:#aaa;">
            Age: <strong style="color:#eee;">{{ age }} day{{ age === 1 ? '' : 's' }}</strong>
          </span>
          <span :style="{ fontSize: '0.82rem', fontWeight: 'bold', color: lifecycleColor, border: '1px solid ' + lifecycleColor, borderRadius: '12px', padding: '2px 10px' }">
            {{ lifecycleIcon }} {{ lifecycleStage.name }}
          </span>
          <span style="font-size:0.8rem;color:#666;">
            Lifespan: {{ genome.LIF }} days
            &nbsp;·&nbsp;
            Fertile: {{ genome.FRT_START }}–{{ genome.FRT_END }}
          </span>
        </div>
      </div>

      <!-- Canvas render — age drives full lifecycle visual evolution -->
      <creature-canvas-component :genome="genome" :age="age" :fossil="fossil"></creature-canvas-component>

      <!-- Fossil overlay label -->
      <div v-if="fossil" style="margin:6px 0;color:#666;font-size:0.85rem;letter-spacing:0.05em;">
        🦴 This creature has fossilised. Its genome is preserved on-chain.
      </div>

      <!-- Genome table -->
      <div v-if="genome">
        <h3 style="color:#a5d6a7;margin:16px 0 4px;">Genome</h3>
        <genome-table-component :genome="genome"></genome-table-component>

        <!-- Unicode art -->
        <h3 style="color:#a5d6a7;margin:16px 0 4px;">Unicode Render</h3>
        <pre :style="fossil ? { color: '#444', opacity: '0.6' } : {}">{{ unicodeArt }}</pre>

        <!-- Publish button -->
        <br/>
        <button
          @click="publishCreature"
          :disabled="publishing || !username"
          style="background:#1565c0;"
        >
          {{ publishing ? "Publishing…" : "📡 Publish to Steem" }}
        </button>
        <p v-if="!username" style="color:#888;font-size:13px;margin:4px 0;">
          Log in to publish your creature.
        </p>
      </div>

      <p v-else style="color:#666;margin-top:24px;">
        Press <strong>Create Founder Creature</strong> to generate your first organism.
      </p>

      <!-- Breeding panel — always visible -->
      <breeding-panel-component
        :username="username"
        @notify="(msg,type) => notify(msg,type)"
      ></breeding-panel-component>

    </div>
  `
};

// ---- AboutView ----
const AboutView = {
  name: "AboutView",
  template: `
    <div style="margin:30px auto;max-width:600px;padding:0 16px;text-align:left;color:#ccc;line-height:1.7;">
      <h2 style="color:#a5d6a7;">🌿 About SteemBiota</h2>
      <p>
        <strong style="color:#eee;">SteemBiota — Immutable Evolution</strong> is an on-chain
        creature generator built on the Steem blockchain.
      </p>
      <p>
        Each creature is defined by a randomly generated <em>genome</em> — a compact set of
        integers that determine its appearance, lifespan, and fertility window.
        Once published via Steem Keychain, the genome is stored immutably on the blockchain
        forever.
      </p>
      <h3 style="color:#66bb6a;">Genome fields</h3>
      <ul style="color:#aaa;">
        <li><strong style="color:#eee;">GEN</strong> — generation index (0–999)</li>
        <li><strong style="color:#eee;">SX</strong> — sex (0 male / 1 female)</li>
        <li><strong style="color:#eee;">MOR</strong> — morphology (body shape variance)</li>
        <li><strong style="color:#eee;">APP</strong> — appearance</li>
        <li><strong style="color:#eee;">ORN</strong> — ornamentation</li>
        <li><strong style="color:#eee;">CLR</strong> — colour hue (0–359°)</li>
        <li><strong style="color:#eee;">LIF</strong> — lifespan (80–159)</li>
        <li><strong style="color:#eee;">FRT_START / FRT_END</strong> — fertility window</li>
        <li><strong style="color:#eee;">MUT</strong> — mutation tendency (0–5); affects offspring variation</li>
      </ul>
      <h3 style="color:#66bb6a;">Tech stack</h3>
      <p>
        Built with <strong style="color:#eee;">steem-js</strong>,
        <strong style="color:#eee;">Steem Keychain</strong>,
        <strong style="color:#eee;">Vue 3 CDN</strong>, and
        <strong style="color:#eee;">Vue Router 4</strong>.
        No build tools required.
      </p>
    </div>
  `
};

// ---- ProfileView ----
const ProfileView = {
  name: "ProfileView",
  inject: ["notify"],
  components: { UserProfileComponent, LoadingSpinnerComponent },
  data() { return { profileData: null, loading: true }; },
  async created() {
    const user = this.$route.params.user;
    this.loading = true;
    try {
      this.profileData = await fetchAccount(user);
    } catch {
      this.notify("Failed to load profile.", "error");
    }
    this.loading = false;
  },
  template: `
    <div style="margin-top:20px;">
      <loading-spinner-component v-if="loading"></loading-spinner-component>
      <div v-else-if="!profileData" style="color:#888;">
        <p>User @{{ $route.params.user }} not found.</p>
      </div>
      <user-profile-component v-else :profile-data="profileData"></user-profile-component>
    </div>
  `
};

// ============================================================
// ROUTER
// ============================================================

const routes = [
  { path: "/",        component: HomeView    },
  { path: "/about",   component: AboutView   },
  { path: "/@:user",  component: ProfileView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// ============================================================
// ROOT APP
// ============================================================

const App = {
  components: {
    AppNotificationComponent,
    AuthComponent,
    UserProfileComponent,
    LoadingSpinnerComponent,
    CreatureCanvasComponent,
    GenomeTableComponent,
    GlobalProfileBannerComponent
  },

  setup() {
    const username      = ref(localStorage.getItem("steem_user") || "");
    const hasKeychain   = ref(false);
    const keychainReady = ref(false);
    const loginError    = ref("");
    const showLoginForm = ref(false);
    const isLoggingIn   = ref(false);
    const notification  = ref({ message: "", type: "error" });
    const profileData   = ref(null);

    async function loadProfile(user) {
      if (!user) { profileData.value = null; return; }
      profileData.value = await fetchAccount(user);
    }

    function notify(message, type = "error") {
      notification.value = { message, type };
    }
    function dismissNotification() {
      notification.value = { message: "", type: "error" };
    }

    onMounted(() => {
      setRPC(0);
      if (username.value) loadProfile(username.value);
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.steem_keychain || attempts > 10) {
          clearInterval(interval);
          hasKeychain.value   = !!window.steem_keychain;
          keychainReady.value = true;
        }
      }, 100);
    });

    function login(user) {
      loginError.value = "";
      if (!window.steem_keychain) {
        loginError.value = "Steem Keychain extension is not installed.";
        return;
      }
      if (!user) return;
      isLoggingIn.value = true;
      keychainLogin(user, (res) => {
        isLoggingIn.value = false;
        if (!res.success) {
          loginError.value = "Keychain sign-in was rejected.";
          return;
        }
        const verified = res.data?.username || res.username;
        if (verified !== user) {
          loginError.value = "Signed account does not match entered username.";
          return;
        }
        username.value      = user;
        hasKeychain.value   = true;
        localStorage.setItem("steem_user", user);
        loginError.value    = "";
        showLoginForm.value = false;
        notify("Logged in as @" + user, "success");
        loadProfile(user);
      });
    }

    function logout() {
      username.value = "";
      profileData.value = null;
      localStorage.removeItem("steem_user");
      showLoginForm.value = false;
    }

    provide("username",    username);
    provide("hasKeychain", hasKeychain);
    provide("notify",      notify);
    provide("profileData", profileData);

    return {
      username, hasKeychain, keychainReady,
      loginError, showLoginForm, isLoggingIn,
      notification, notify, dismissNotification,
      login, logout, profileData
    };
  },

  template: `
    <h1>🌿 SteemBiota — Immutable Evolution</h1>

    <!-- Navigation -->
    <nav>
      <router-link to="/"       exact-active-class="nav-active">Home</router-link>
      <router-link
        v-if="username"
        :to="'/@' + username"
        exact-active-class="nav-active"
      >Profile</router-link>
      <router-link to="/about"  exact-active-class="nav-active">About</router-link>

      <a v-if="!username" href="#" @click.prevent="showLoginForm = !showLoginForm">Login</a>
      <a v-else           href="#" @click.prevent="logout">Logout (@{{ username }})</a>
    </nav>

    <!-- Inline login form -->
    <div v-if="!username && showLoginForm" style="margin:8px 0;">
      <auth-component
        :username="username"
        :has-keychain="hasKeychain"
        :login-error="loginError"
        :is-logging-in="isLoggingIn"
        @login="login"
        @logout="logout"
        @close="showLoginForm = false"
      ></auth-component>
    </div>

    <!-- Keychain not detected notice -->
    <div v-if="keychainReady && !hasKeychain" class="keychain-notice">
      <strong>Read-only mode</strong> — Install the
      <a href="https://www.google.com/search?q=steem+keychain" target="_blank" style="color:#ffe082;">
        Steem Keychain
      </a>
      browser extension to publish creatures.
    </div>

    <!-- Global notification -->
    <app-notification-component
      :message="notification.message"
      :type="notification.type"
      @dismiss="dismissNotification"
    ></app-notification-component>

    <!-- Global profile banner — visible on all pages when logged in -->
    <global-profile-banner-component
      v-if="username"
      :profile-data="profileData"
    ></global-profile-banner-component>

    <hr/>

    <!-- Page content -->
    <router-view></router-view>
  `
};

// ============================================================
// MOUNT
// ============================================================

const vueApp = createApp(App);

vueApp.component("AppNotificationComponent",    AppNotificationComponent);
vueApp.component("AuthComponent",               AuthComponent);
vueApp.component("UserProfileComponent",        UserProfileComponent);
vueApp.component("LoadingSpinnerComponent",     LoadingSpinnerComponent);
vueApp.component("CreatureCanvasComponent",     CreatureCanvasComponent);
vueApp.component("GenomeTableComponent",        GenomeTableComponent);
vueApp.component("BreedingPanelComponent",      BreedingPanelComponent);
vueApp.component("GlobalProfileBannerComponent", GlobalProfileBannerComponent);

vueApp.use(router);
vueApp.mount("#app");
