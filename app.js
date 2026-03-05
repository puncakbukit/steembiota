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
    FRT_END
  };
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
// STEEMBIOTA UNICODE ART SYSTEM
// Assembles a 5-line glyph skeleton from genome seeds.
// Grid size grows with lifecycle stage — creatures visibly develop.
// ============================================================

// ---- Glyph pools (all indexed by genome seeds mod pool size) ----

const UNI_SIGIL  = ["⟡","✶","❖","✦","◈","✧"];          // GEN % 6
const UNI_BODY   = ["█","●","◉","◆","◍","▣"];          // MOR % 6
const UNI_LIMB_L = ["/","(", "{","⟨","◁","«"];          // APP % 6  left limb
const UNI_LIMB_R = ["\\",")","}","⟩","▷","»"];         // APP % 6  right limb
const UNI_LIMB_C = ["◁","(","«","⟨","<","∈"];           // APP % 6  center-left
const UNI_LIMB_D = ["▷",")",">","⟩","»","∋"];           // APP % 6  center-right
const UNI_ORN    = ["✦","*","∴","°","⊹","✧"];           // ORN % 6  ornament
const UNI_TAIL   = ["∿","~","≋","∾","⌇","⌀"];           // MOR % 6  tail
const UNI_FOSSIL_BODY = ["▒","░","▓","╬","╪","╫"];      // GEN % 6  fossil body

// Body glyph degrades with age: full → hollow → very faded
const UNI_BODY_ELDER  = ["□","○","◎","◇","◌","▢"];      // hollow variants
const UNI_FOSSIL_HEAD = ["☉","⊗","⊙","◎","⊛","⊜"];      // GEN % 6

// Fertility sparkle flanks
const UNI_SPARKLE = "✦";

// ---- Grid size by lifecycle percentage ----
function unicodeGridSize(pct) {
  if (pct < 0.05) return 9;
  if (pct < 0.12) return 15;
  if (pct < 0.25) return 21;
  if (pct < 0.40) return 27;
  if (pct < 0.60) return 39;
  if (pct < 0.80) return 51;
  if (pct < 1.00) return 63;
  return 39; // fossil
}

// ---- Main builder ----
// genome : genome object
// age    : integer days (0 = newborn)
// Returns a multi-line string ready for <pre> display.
//
// The renderer fills the full grid width at every stage.
// Grid is treated as the INTERIOR body width (in glyphs).
// Limb chars flank the body; the whole thing is centred.
function buildUnicodeArt(genome, age) {
  const pct    = Math.min(age / genome.LIF, 1.0);
  const fossil = pct >= 1.0;
  const grid   = unicodeGridSize(pct);

  // Pick glyph primitives from genome seeds
  const sigil   = UNI_SIGIL [genome.GEN % UNI_SIGIL.length];
  const rawBody = fossil
    ? UNI_FOSSIL_BODY[genome.GEN % UNI_FOSSIL_BODY.length]
    : (pct >= 0.80 ? UNI_BODY_ELDER : UNI_BODY)[genome.MOR % UNI_BODY.length];
  const limL    = UNI_LIMB_L[genome.APP % UNI_LIMB_L.length];
  const limR    = UNI_LIMB_R[genome.APP % UNI_LIMB_R.length];
  const limCL   = UNI_LIMB_C[genome.APP % UNI_LIMB_C.length];
  const limCR   = UNI_LIMB_D[genome.APP % UNI_LIMB_D.length];
  const orn     = UNI_ORN   [genome.ORN % UNI_ORN.length];
  const tail    = UNI_TAIL  [genome.MOR % UNI_TAIL.length];
  const sex     = genome.SX === 0 ? "♂" : "♀";
  const fertile = age >= genome.FRT_START && age < genome.FRT_END && !fossil;

  // Mirror closing limbs
  const closingL = limR === ")" ? "(" : limR === "}" ? "{" : limR === "⟩" ? "⟨" : limR === "▷" ? "◁" : limR === "»" ? "«" : "\\";
  const closingR = limL === "(" ? ")" : limL === "{" ? "}" : limL === "⟨" ? "⟩" : limL === "◁" ? "▷" : limL === "«" ? "»" : "/";

  // Centre a single string within (grid + limb width) total columns.
  // fullWidth = the reference width everything is padded to match.
  const fullWidth = grid + 2; // limL + body(grid) + limR
  function centre(str) {
    const pad = Math.max(0, Math.floor((fullWidth - str.length) / 2));
    return " ".repeat(pad) + str;
  }

  // Body row that exactly fills `grid` columns.
  // rawBody is 1 char; repeat to fill grid, trim/pad to exact width.
  function bodyFill(w) {
    return rawBody.repeat(Math.ceil(w / rawBody.length)).slice(0, w);
  }

  // A full-width body row with limbs: limL + body(grid) + limR  = fullWidth chars
  function bodyLine(lChar, rChar) {
    return centre(lChar + bodyFill(grid) + rChar);
  }

  // Number of middle rows scales with grid so taller creatures fill vertically.
  // Minimum 1 for Child+, grows every ~10 grid units.
  function midRowCount() {
    return Math.max(1, Math.floor(grid / 10));
  }

  const lines = [];

  // ---- FOSSIL ----
  if (fossil) {
    const fh   = UNI_FOSSIL_HEAD[genome.GEN % UNI_FOSSIL_HEAD.length];
    const side = "[" + bodyFill(grid) + "]";
    const mid  = bodyFill(grid + 2);   // full width, no brackets
    lines.push(centre(fh));
    lines.push(centre(side));
    for (let i = 0; i < midRowCount(); i++) lines.push(centre(mid));
    lines.push(centre(side));
    return lines.join("\n");
  }

  // ---- ORNAMENT ROW (Teen+) ----
  if (pct >= 0.25) {
    const ornRow = fertile
      ? UNI_SPARKLE + " " + sigil + sex + " " + UNI_SPARKLE
      : orn;
    lines.push(centre(ornRow));
  }

  // ---- SIGIL + SEX ROW (Toddler+) ----
  if (pct >= 0.05) {
    lines.push(centre(sigil + sex));
  }

  // ---- BABY: sigil + solid body blob filling grid, no limbs ----
  if (pct < 0.05) {
    lines.push(centre(sigil));
    lines.push(centre(bodyFill(grid)));
    return lines.join("\n");
  }

  // ---- UPPER LIMB ROW (Toddler+) ----
  lines.push(bodyLine(limL, limR));

  // ---- MIDDLE BODY ROWS (Child+) ----
  if (pct >= 0.12) {
    for (let i = 0; i < midRowCount(); i++) {
      lines.push(bodyLine(limCL, limCR));
    }
  }

  // ---- LOWER LIMB ROW (Child+) ----
  if (pct >= 0.12) {
    lines.push(bodyLine(closingL, closingR));
  }

  // ---- TAIL (Child+) ----
  if (pct >= 0.12) {
    lines.push(centre(tail));
  }

  return lines.join("\n");
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
    LoadingSpinnerComponent
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
    GenomeTableComponent
  },

  setup() {
    const username      = ref(localStorage.getItem("steem_user") || "");
    const hasKeychain   = ref(false);
    const keychainReady = ref(false);
    const loginError    = ref("");
    const showLoginForm = ref(false);
    const isLoggingIn   = ref(false);
    const notification  = ref({ message: "", type: "error" });

    function notify(message, type = "error") {
      notification.value = { message, type };
    }
    function dismissNotification() {
      notification.value = { message: "", type: "error" };
    }

    onMounted(() => {
      setRPC(0);
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
      });
    }

    function logout() {
      username.value = "";
      localStorage.removeItem("steem_user");
      showLoginForm.value = false;
    }

    provide("username",    username);
    provide("hasKeychain", hasKeychain);
    provide("notify",      notify);

    return {
      username, hasKeychain, keychainReady,
      loginError, showLoginForm, isLoggingIn,
      notification, notify, dismissNotification,
      login, logout
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

    <hr/>

    <!-- Page content -->
    <router-view></router-view>
  `
};

// ============================================================
// MOUNT
// ============================================================

const vueApp = createApp(App);

vueApp.component("AppNotificationComponent",  AppNotificationComponent);
vueApp.component("AuthComponent",             AuthComponent);
vueApp.component("UserProfileComponent",      UserProfileComponent);
vueApp.component("LoadingSpinnerComponent",   LoadingSpinnerComponent);
vueApp.component("CreatureCanvasComponent",   CreatureCanvasComponent);
vueApp.component("GenomeTableComponent",      GenomeTableComponent);

vueApp.use(router);
vueApp.mount("#app");
