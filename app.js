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
  return {
    GEN:       randomInt(1000),
    SX:        randomInt(2),      // 0 = male, 1 = female
    MOR:       randomInt(9999),
    APP:       randomInt(9999),
    ORN:       randomInt(9999),
    CLR:       randomInt(360),
    LIF:       80 + randomInt(80),
    FRT_START: 20,
    FRT_END:   60
  };
}

function buildUnicodeArt(genome) {
  const rune = ["✶", "▲", "▣", "⊕", "☼", "✜", "⟁", "❂"][genome.GEN % 8];
  let grid = "";
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 25; x++) {
      const dx   = x - 12;
      const dy   = y - 7;
      const body = (dx * dx) / 60 + (dy * dy) / 20 < 1;
      if (body) {
        grid += (y === 6 && (x === 9 || x === 15)) ? "◉" : rune;
      } else {
        grid += " ";
      }
    }
    grid += "\n";
  }
  return grid;
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
      genome:      null,
      unicodeArt:  "",
      publishing:  false
    };
  },
  methods: {
    createFounder() {
      this.genome     = generateGenome();
      this.unicodeArt = buildUnicodeArt(this.genome);
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
      publishCreature(this.username, this.genome, this.unicodeArt, (response) => {
        this.publishing = false;
        if (response.success) {
          this.notify("🌿 Creature published to the blockchain!", "success");
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

      <!-- Canvas render -->
      <creature-canvas-component :genome="genome"></creature-canvas-component>

      <!-- Genome table -->
      <div v-if="genome">
        <h3 style="color:#a5d6a7;margin:16px 0 4px;">Genome</h3>
        <genome-table-component :genome="genome"></genome-table-component>

        <!-- Unicode art -->
        <h3 style="color:#a5d6a7;margin:16px 0 4px;">Unicode Render</h3>
        <pre>{{ unicodeArt }}</pre>

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
