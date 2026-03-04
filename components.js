// ============================================================
// components.js
// Reusable Vue 3 components.
// Includes template base components + SteemBiota components.
// ============================================================

// ---- AppNotificationComponent ----
const AppNotificationComponent = {
  name: "AppNotificationComponent",
  props: {
    message: String,
    type: { type: String, default: "error" }
  },
  emits: ["dismiss"],
  data() { return { timer: null }; },
  watch: {
    message(val) {
      clearTimeout(this.timer);
      if (val && this.type !== "error") {
        this.timer = setTimeout(() => this.$emit("dismiss"), 3500);
      }
    }
  },
  beforeUnmount() { clearTimeout(this.timer); },
  computed: {
    styles() {
      const base = {
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        margin: "10px auto", padding: "10px 14px",
        borderRadius: "6px", maxWidth: "640px",
        fontSize: "14px", gap: "10px"
      };
      if (this.type === "success")
        return { ...base, background: "#1b2e1b", border: "1px solid #388e3c", color: "#a5d6a7" };
      if (this.type === "info")
        return { ...base, background: "#0d1a2e", border: "1px solid #1565c0", color: "#90caf9" };
      return   { ...base, background: "#3b0000", border: "1px solid #b71c1c", color: "#ff8a80" };
    },
    icon() {
      if (this.type === "success") return "✅";
      if (this.type === "info")    return "ℹ️";
      return "⚠️";
    }
  },
  template: `
    <div v-if="message" :style="styles" role="alert">
      <span>{{ icon }} {{ message }}</span>
      <button
        @click="$emit('dismiss')"
        style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;color:inherit;line-height:1;"
        aria-label="Dismiss"
      >✕</button>
    </div>
  `
};

// ---- AuthComponent ----
const AuthComponent = {
  name: "AuthComponent",
  props: {
    username:    String,
    hasKeychain: Boolean,
    loginError:  String,
    isLoggingIn: { type: Boolean, default: false }
  },
  emits: ["login", "logout", "close"],
  data() { return { usernameInput: "" }; },
  watch: {
    username(val) { if (val) this.$emit("close"); }
  },
  methods: {
    submit() {
      const val = this.usernameInput.trim().toLowerCase();
      if (!val) return;
      this.$emit("login", val);
    },
    onKeydown(e) {
      if (e.key === "Enter")  this.submit();
      if (e.key === "Escape") this.$emit("close");
    }
  },
  template: `
    <div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0;">
      <template v-if="!username">
        <input
          v-model="usernameInput"
          type="text"
          placeholder="Steem username"
          autocomplete="username"
          @keydown="onKeydown"
        />
        <button @click="submit" :disabled="!usernameInput.trim() || isLoggingIn">
          {{ isLoggingIn ? "Signing in…" : "Login with Keychain" }}
        </button>
        <button @click="$emit('close')" style="background:#555;">Cancel</button>
        <div v-if="loginError" style="width:100%;color:#ff8a80;font-size:13px;margin-top:4px;">
          {{ loginError }}
        </div>
      </template>
      <template v-else>
        <span style="font-size:14px;">Logged in as <strong>@{{ username }}</strong></span>
        <button @click="$emit('logout')" style="background:#555;">Logout</button>
      </template>
    </div>
  `
};

// ---- LoadingSpinnerComponent ----
const LoadingSpinnerComponent = {
  name: "LoadingSpinnerComponent",
  props: {
    message: { type: String, default: "Loading..." }
  },
  template: `
    <div style="text-align:center;padding:30px;color:#888;">
      <div style="
        display:inline-block;width:32px;height:32px;
        border:4px solid #333;border-top-color:#66bb6a;
        border-radius:50%;animation:spin 0.8s linear infinite;
      "></div>
      <p style="margin-top:10px;font-size:14px;">{{ message }}</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
};

// ---- UserProfileComponent ----
const UserProfileComponent = {
  name: "UserProfileComponent",
  props: { profileData: Object },
  methods: {
    safeUrl(url) {
      try {
        const u = new URL(url);
        return u.protocol === "https:" ? url : "";
      } catch { return ""; }
    }
  },
  template: `
    <div v-if="profileData">
      <div :style="{
        backgroundImage: 'url(' + safeUrl(profileData.coverImage) + ')',
        backgroundSize: 'cover', backgroundPosition: 'center',
        height: '120px', borderRadius: '8px', background: '#222'
      }"></div>
      <div style="display:flex;align-items:center;margin-top:-36px;padding:10px;justify-content:center;">
        <img
          :src="safeUrl(profileData.profileImage) || 'https://via.placeholder.com/80'"
          style="width:72px;height:72px;border-radius:50%;border:3px solid #444;background:#222;"
        />
        <div style="margin-left:15px;text-align:left;">
          <h2 style="margin:0;color:#eee;">{{ profileData.displayName }}</h2>
          <small style="color:#aaa;">@{{ profileData.username }}</small>
          <p style="margin:5px 0;color:#ccc;">{{ profileData.about }}</p>
        </div>
      </div>
    </div>
  `
};

// ============================================================
// SteemBiota-specific components
// ============================================================

// ---- CreatureCanvasComponent ----
// Renders the genome visually onto a <canvas> element.
// Pass :genome (object) to trigger a re-render.
const CreatureCanvasComponent = {
  name: "CreatureCanvasComponent",
  props: {
    genome: { type: Object, default: null }
  },
  watch: {
    genome(val) {
      if (val) this.$nextTick(() => this.draw(val));
    }
  },
  mounted() {
    if (this.genome) this.draw(this.genome);
  },
  methods: {
    draw(genome) {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 300, 300);

      const baseHue = (genome.GEN * 137.508) % 360;
      const hue     = (baseHue + genome.CLR) % 360;

      ctx.fillStyle   = `hsl(${hue}, 70%, 50%)`;
      ctx.strokeStyle = `hsl(${hue}, 70%, 30%)`;
      ctx.lineWidth   = 3;

      ctx.beginPath();
      ctx.ellipse(150, 150, 60 + (genome.MOR % 40), 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(130, 140, 8, 0, Math.PI * 2);
      ctx.arc(170, 140, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  template: `
    <canvas ref="canvas" width="300" height="300"></canvas>
  `
};

// ---- GenomeTableComponent ----
// Renders the genome key/value pairs in a styled table.
const GenomeTableComponent = {
  name: "GenomeTableComponent",
  props: {
    genome: { type: Object, required: true }
  },
  computed: {
    sexLabel() {
      return this.genome.SX === 0 ? "♂ Male" : "♀ Female";
    },
    rows() {
      const g = this.genome;
      return [
        { key: "Generation",        value: g.GEN },
        { key: "Sex",               value: this.sexLabel },
        { key: "Morphology",        value: g.MOR },
        { key: "Appearance",        value: g.APP },
        { key: "Ornamentation",     value: g.ORN },
        { key: "Colour (hue°)",     value: g.CLR },
        { key: "Lifespan",          value: g.LIF },
        { key: "Fertility start",   value: g.FRT_START },
        { key: "Fertility end",     value: g.FRT_END },
      ];
    }
  },
  template: `
    <table style="margin:12px auto;border-collapse:collapse;font-size:13px;color:#ccc;">
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td style="padding:3px 12px;text-align:right;color:#888;">{{ row.key }}</td>
          <td style="padding:3px 12px;text-align:left;color:#eee;font-weight:bold;">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  `
};
