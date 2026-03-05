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
// Full genome-driven renderer with per-stage lifecycle evolution.
//
// Props:
//   :genome  — genome object
//   :age     — current age in days (integer)
//   :fossil  — bool shortcut for age >= LIF
//
// Pipeline: genome seeds → base phenotype → lifecycle modifiers → draw
const CreatureCanvasComponent = {
  name: "CreatureCanvasComponent",
  props: {
    genome: { type: Object,  default: null  },
    age:    { type: Number,  default: 0     },
    fossil: { type: Boolean, default: false }
  },
  watch: {
    genome()      { this.$nextTick(() => this.draw()); },
    age()         { this.$nextTick(() => this.draw()); },
    fossil()      { this.$nextTick(() => this.draw()); }
  },
  mounted() { this.draw(); },
  methods: {

    // ----------------------------------------------------------
    // Tiny seeded PRNG (mulberry32) — pure, no side-effects.
    // Returns a function that yields floats in [0, 1).
    // ----------------------------------------------------------
    makePrng(seed) {
      let s = seed >>> 0;
      return () => {
        s += 0x6D2B79F5;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    // ----------------------------------------------------------
    // Derive phenotype from genome + age.
    // All values are in [0,1] normalised space before drawing.
    // ----------------------------------------------------------
    buildPhenotype(genome, age) {
      const pct   = Math.min(age / genome.LIF, 1.0); // 0–1 lifespan progress
      const fossil = pct >= 1.0;

      // ---- Lifecycle growth/decay scalars ----
      // appendageScale and ornamentScale grow through youth, decay in old age.
      let appendageScale, ornamentScale, patternOpacity, colorSat, colorLight;

      if      (pct < 0.05) { appendageScale = 0.15; ornamentScale = 0.00; patternOpacity = 0.10; }
      else if (pct < 0.12) { appendageScale = 0.35; ornamentScale = 0.10; patternOpacity = 0.30; }
      else if (pct < 0.25) { appendageScale = 0.60; ornamentScale = 0.30; patternOpacity = 0.60; }
      else if (pct < 0.40) { appendageScale = 0.85; ornamentScale = 0.70; patternOpacity = 0.90; }
      else if (pct < 0.60) { appendageScale = 1.00; ornamentScale = 1.00; patternOpacity = 1.00; }
      else if (pct < 0.80) { appendageScale = 0.97; ornamentScale = 0.90; patternOpacity = 0.95; }
      else if (pct < 1.00) { appendageScale = 0.90; ornamentScale = 0.80; patternOpacity = 0.85; }
      else                 { appendageScale = 0.70; ornamentScale = 0.00; patternOpacity = 0.00; }

      // ---- Fertility window glow ----
      const fertile = age >= genome.FRT_START && age < genome.FRT_END && !fossil;

      // ---- GEN → color palette family (8 palettes cycling on GEN % 8) ----
      const palettes = [
        { base: 160 }, // teal/emerald
        { base: 200 }, // cyan/sky
        { base: 280 }, // violet/purple
        { base:  30 }, // amber/gold
        { base: 340 }, // rose/crimson
        { base: 100 }, // lime/olive
        { base: 240 }, // blue/indigo
        { base:  55 }, // yellow/ochre
      ];
      const paletteBase = palettes[genome.GEN % 8].base;
      const finalHue    = (paletteBase + genome.CLR) % 360;

      // Saturation: full at peak, fades with age; +10% during fertility
      colorSat   = fossil ? 8
                 : 55 + (ornamentScale * 20) + (fertile ? 10 : 0);
      colorLight = fossil ? 28
                 : 40 + (pct < 0.6 ? 10 : 0);

      // ---- SX → sexual dimorphism ----
      const male          = genome.SX === 0;
      const bodyScale     = male ? 1.00 : 1.10;
      const ornScaleSex   = male ? 1.20 : 0.90;

      // ---- MOR → body shape (seeded) ----
      const morRng    = this.makePrng(genome.MOR);
      const bodyRx    = 50 + morRng() * 30;   // x-radius  50–80
      const bodyRy    = 65 + morRng() * 25;   // y-radius  65–90
      const headRatio = 0.25 + morRng() * 0.2; // 0.25–0.45
      const hasTail   = morRng() > 0.4;
      const tailLen   = 20 + morRng() * 40;

      // ---- APP → appendages (seeded) ----
      const appRng    = this.makePrng(genome.APP);
      const limbCount = 2 + Math.floor(appRng() * 3);   // 2–4
      const hasHorns  = appRng() > 0.45;
      const hornLen   = 10 + appRng() * 20;
      const hasFins   = appRng() > 0.60;
      const finSize   = 8 + appRng() * 18;

      // ---- ORN → ornaments (seeded) ----
      const ornRng     = this.makePrng(genome.ORN);
      const spikeCount = Math.floor(ornRng() * 7);       // 0–6
      const glowNodes  = Math.floor(ornRng() * 4);       // 0–3
      const hasFrills  = ornRng() > 0.55;
      const frillSize  = 6 + ornRng() * 14;
      const patternType = Math.floor(ornRng() * 3);      // 0=none 1=spots 2=stripes

      return {
        fossil, pct,
        // color
        finalHue, colorSat, colorLight, fertile,
        // body
        bodyRx: bodyRx * bodyScale, bodyRy: bodyRy * bodyScale,
        headRatio, hasTail, tailLen,
        // appendages
        limbCount, hasHorns, hornLen, hasFins, finSize,
        appendageScale: appendageScale * (male ? 1.0 : 0.9),
        // ornaments
        spikeCount, glowNodes, hasFrills, frillSize, patternType,
        ornamentScale: ornamentScale * ornScaleSex,
        patternOpacity,
        // eye size — large on babies, normal otherwise
        eyeRadius: pct < 0.05 ? 11 : pct < 0.12 ? 9 : 7,
      };
    },

    // ----------------------------------------------------------
    // Main draw routine
    // ----------------------------------------------------------
    draw() {
      const canvas = this.$refs.canvas;
      if (!canvas || !this.genome) return;
      const ctx  = canvas.getContext("2d");
      const W    = canvas.width;
      const H    = canvas.height;
      const cx   = W / 2;
      const cy   = H / 2;

      ctx.clearRect(0, 0, W, H);

      const g = this.genome;
      const p = this.buildPhenotype(g, this.age);

      const fill   = `hsl(${p.finalHue}, ${p.colorSat}%, ${p.colorLight}%)`;
      const stroke = `hsl(${p.finalHue}, ${p.colorSat}%, ${Math.max(p.colorLight - 18, 8)}%)`;
      const dim    = `hsl(${p.finalHue}, ${Math.max(p.colorSat - 20, 5)}%, ${Math.max(p.colorLight - 10, 8)}%)`;

      // ---- FOSSIL special render ----
      if (p.fossil) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle   = "#555";
        ctx.strokeStyle = "#333";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, p.bodyRx * 0.7, p.bodyRy * 0.7, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // crack lines
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const crackRng = this.makePrng(g.MOR + i * 31);
          const sx = cx + (crackRng() - 0.5) * p.bodyRx * 1.2;
          const sy = cy + (crackRng() - 0.5) * p.bodyRy * 1.2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (crackRng() - 0.5) * 30, sy + (crackRng() - 0.5) * 30);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        return;
      }

      // ---- TAIL ----
      if (p.hasTail && p.appendageScale > 0.2) {
        const tScale = p.tailLen * p.appendageScale;
        ctx.fillStyle = dim;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + p.bodyRx * 0.7, cy + 10);
        ctx.quadraticCurveTo(
          cx + p.bodyRx + tScale * 0.6, cy + tScale * 0.5,
          cx + p.bodyRx + tScale,        cy
        );
        ctx.quadraticCurveTo(
          cx + p.bodyRx + tScale * 0.6, cy - tScale * 0.3,
          cx + p.bodyRx * 0.7, cy - 10
        );
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }

      // ---- LIMBS ----
      if (p.appendageScale > 0.1) {
        ctx.fillStyle = dim;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        const limbLen = 22 * p.appendageScale;
        const limbW   = 7  * p.appendageScale;
        // bottom limbs
        for (let i = 0; i < p.limbCount; i++) {
          const spread = (p.limbCount - 1) * 0.5;
          const lx = cx - spread * 22 + i * 22;
          ctx.beginPath();
          ctx.roundRect
            ? ctx.roundRect(lx - limbW / 2, cy + p.bodyRy * 0.75, limbW, limbLen, 4)
            : ctx.rect(lx - limbW / 2, cy + p.bodyRy * 0.75, limbW, limbLen);
          ctx.fill(); ctx.stroke();
        }
      }

      // ---- FINS (dorsal) ----
      if (p.hasFins && p.appendageScale > 0.3) {
        const fScale = p.finSize * p.appendageScale;
        ctx.fillStyle   = `hsl(${p.finalHue}, ${p.colorSat}%, ${p.colorLight + 10}%)`;
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - fScale, cy - p.bodyRy * 0.5);
        ctx.lineTo(cx,           cy - p.bodyRy * 0.85 - fScale);
        ctx.lineTo(cx + fScale, cy - p.bodyRy * 0.5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }

      // ---- MAIN BODY ----
      ctx.fillStyle   = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, p.bodyRx, p.bodyRy, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // ---- PATTERN (inside body clip) ----
      if (p.patternOpacity > 0.05 && p.patternType > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, p.bodyRx - 2, p.bodyRy - 2, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = p.patternOpacity * 0.35;
        ctx.fillStyle   = `hsl(${(p.finalHue + 40) % 360}, 60%, 70%)`;

        if (p.patternType === 1) {
          // spots
          const spotRng = this.makePrng(g.ORN + 7);
          for (let i = 0; i < 8; i++) {
            const sx = cx + (spotRng() - 0.5) * p.bodyRx * 1.4;
            const sy = cy + (spotRng() - 0.5) * p.bodyRy * 1.4;
            const sr = 4 + spotRng() * 8;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // stripes
          for (let i = -4; i <= 4; i++) {
            ctx.fillRect(cx + i * 14 - 4, cy - p.bodyRy, 7, p.bodyRy * 2);
          }
        }
        ctx.restore();
        ctx.globalAlpha = 1.0;
      }

      // ---- HORNS ----
      if (p.hasHorns && p.ornamentScale > 0.05) {
        const hLen = p.hornLen * p.ornamentScale;
        ctx.fillStyle   = `hsl(${(p.finalHue + 20) % 360}, 50%, 35%)`;
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 1.5;
        // left horn
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - p.bodyRy * 0.7);
        ctx.lineTo(cx - 22, cy - p.bodyRy * 0.7 - hLen);
        ctx.lineTo(cx - 12, cy - p.bodyRy * 0.7 - hLen * 0.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // right horn
        ctx.beginPath();
        ctx.moveTo(cx + 18, cy - p.bodyRy * 0.7);
        ctx.lineTo(cx + 22, cy - p.bodyRy * 0.7 - hLen);
        ctx.lineTo(cx + 12, cy - p.bodyRy * 0.7 - hLen * 0.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }

      // ---- SPIKES ----
      if (p.spikeCount > 0 && p.ornamentScale > 0.2) {
        const sLen = 10 * p.ornamentScale;
        ctx.fillStyle   = `hsl(${(p.finalHue + 30) % 360}, 55%, 40%)`;
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 1;
        for (let i = 0; i < p.spikeCount; i++) {
          const angle = (Math.PI * 2 / p.spikeCount) * i - Math.PI / 2;
          const bx    = cx + Math.cos(angle) * p.bodyRx * 0.9;
          const by    = cy + Math.sin(angle) * p.bodyRy * 0.9;
          const ox    = Math.cos(angle) * sLen;
          const oy    = Math.sin(angle) * sLen;
          ctx.beginPath();
          ctx.moveTo(bx - oy * 0.3, by + ox * 0.3);
          ctx.lineTo(bx + ox,       by + oy);
          ctx.lineTo(bx + oy * 0.3, by - ox * 0.3);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
        }
      }

      // ---- FRILLS ----
      if (p.hasFrills && p.ornamentScale > 0.25) {
        const fLen = p.frillSize * p.ornamentScale;
        ctx.strokeStyle = `hsl(${p.finalHue}, ${p.colorSat + 10}%, ${p.colorLight + 15}%)`;
        ctx.lineWidth   = 2;
        for (let i = -2; i <= 2; i++) {
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(cx + i * 10, cy - p.bodyRy * 0.85);
          ctx.lineTo(cx + i * 10, cy - p.bodyRy * 0.85 - fLen);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      // ---- HEAD ----
      const headR = p.bodyRx * p.headRatio;
      const headY = cy - p.bodyRy * 0.72;
      ctx.fillStyle   = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // ---- EYES ----
      const eyeOff  = headR * 0.38;
      const eyeR    = p.eyeRadius;
      // sclera
      ctx.fillStyle = "#eee";
      ctx.beginPath();
      ctx.arc(cx - eyeOff, headY - 2, eyeR, 0, Math.PI * 2);
      ctx.arc(cx + eyeOff, headY - 2, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // pupil
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(cx - eyeOff + 1, headY - 1, eyeR * 0.55, 0, Math.PI * 2);
      ctx.arc(cx + eyeOff + 1, headY - 1, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // ---- GLOW NODES (fertility / ornament) ----
      if (p.glowNodes > 0 && p.ornamentScale > 0.4) {
        const glowRng = this.makePrng(g.ORN + 99);
        ctx.globalAlpha = p.ornamentScale * (p.fertile ? 0.9 : 0.5);
        for (let i = 0; i < p.glowNodes; i++) {
          const angle = glowRng() * Math.PI * 2;
          const dist  = glowRng() * p.bodyRx * 0.7;
          const gx    = cx + Math.cos(angle) * dist;
          const gy    = cy + Math.sin(angle) * dist;
          const grad  = ctx.createRadialGradient(gx, gy, 0, gx, gy, 10);
          grad.addColorStop(0,   `hsl(${(p.finalHue + 60) % 360}, 100%, 85%)`);
          grad.addColorStop(1,   `hsla(${p.finalHue}, 80%, 60%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(gx, gy, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      // ---- FERTILITY AURA ----
      if (p.fertile) {
        ctx.globalAlpha = 0.18;
        const aura = ctx.createRadialGradient(cx, cy, p.bodyRx * 0.5, cx, cy, p.bodyRx * 1.5);
        aura.addColorStop(0,   `hsl(${(p.finalHue + 60) % 360}, 100%, 80%)`);
        aura.addColorStop(1,   `hsla(${p.finalHue}, 60%, 50%, 0)`);
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy, p.bodyRx * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
  },
  template: `<canvas ref="canvas" width="300" height="300"></canvas>`
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
        { key: "Genus ID",           value: g.GEN },
        { key: "Sex",               value: this.sexLabel },
        { key: "Morphology",        value: g.MOR },
        { key: "Appendage Seed",    value: g.APP },
        { key: "Ornamentation",     value: g.ORN },
        { key: "Colour (hue°)",     value: g.CLR },
        { key: "Lifespan",          value: g.LIF },
        { key: "Fertility start",   value: g.FRT_START },
        { key: "Fertility end",     value: g.FRT_END },
        { key: "Mutation tendency", value: g.MUT !== undefined ? g.MUT : "—" },
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

// ============================================================
// BreedingPanelComponent
// Lets users paste two SteemBiota post URLs, loads genomes,
// breeds them client-side (deterministic seeded PRNG + MUT),
// previews the child, then publishes via Steem Keychain.
// ============================================================
const BreedingPanelComponent = {
  name: "BreedingPanelComponent",
  props: {
    username: String
  },
  emits: ["notify"],
  data() {
    return {
      urlA:        "",
      urlB:        "",
      loading:     false,
      loadError:   "",
      childGenome: null,
      childName:   null,
      childArt:    null,
      breedInfo:   null,   // { mutated, speciated }
      publishing:  false,
    };
  },
  computed: {
    sexLabel() {
      if (!this.childGenome) return "";
      return this.childGenome.SX === 0 ? "♂ Male" : "♀ Female";
    },
    mutationLabel() {
      if (!this.breedInfo) return "";
      if (this.breedInfo.speciated) return "⚡ Speciation — new genus emerged!";
      if (this.breedInfo.mutated)   return "🧬 Mutation occurred";
      return "✔ Clean inheritance";
    },
    mutationColor() {
      if (!this.breedInfo) return "#888";
      if (this.breedInfo.speciated) return "#ffb74d";
      if (this.breedInfo.mutated)   return "#80deea";
      return "#666";
    }
  },
  methods: {
    async breedCreatures() {
      this.loadError   = "";
      this.childGenome = null;
      this.childArt    = null;
      this.breedInfo   = null;

      const ua = this.urlA.trim();
      const ub = this.urlB.trim();
      if (!ua || !ub) {
        this.loadError = "Please enter both parent URLs.";
        return;
      }
      if (ua === ub) {
        this.loadError = "Parent A and Parent B must be different posts.";
        return;
      }

      this.loading = true;
      try {
        const [resA, resB] = await Promise.all([
          loadGenomeFromPost(ua),
          loadGenomeFromPost(ub)
        ]);
        const { child, mutated, speciated } = breedGenomes(resA.genome, resB.genome);
        this.childGenome = child;
        this.childName   = generateFullName(child);
        this.childArt    = buildUnicodeArt(child, 0);
        this.breedInfo   = { mutated, speciated,
          parentA: { author: resA.author, permlink: resA.permlink },
          parentB: { author: resB.author, permlink: resB.permlink }
        };
      } catch (e) {
        this.loadError = e.message || String(e);
      }
      this.loading = false;
    },

    async publishChild() {
      if (!this.username) {
        this.$emit("notify", "Please log in first.", "error");
        return;
      }
      if (!window.steem_keychain) {
        this.$emit("notify", "Steem Keychain is not installed.", "error");
        return;
      }
      this.publishing = true;
      publishOffspring(
        this.username,
        this.childGenome,
        this.childArt,
        this.childName,
        0,
        "Baby",
        this.breedInfo.parentA,
        this.breedInfo.parentB,
        (response) => {
          this.publishing = false;
          if (response.success) {
            this.$emit("notify", "🧬 " + this.childName + " published to the blockchain!", "success");
            // Reset form
            this.urlA = "";
            this.urlB = "";
            this.childGenome = null;
            this.childArt = null;
            this.breedInfo = null;
          } else {
            this.$emit("notify", "Publish failed: " + (response.message || "Unknown error"), "error");
          }
        }
      );
    }
  },
  template: `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #333;">
      <h3 style="color:#80deea;margin:0 0 12px;">🧬 Breed Creatures</h3>

      <div style="display:flex;flex-direction:column;gap:8px;max-width:520px;margin:0 auto;">
        <input
          v-model="urlA"
          type="text"
          placeholder="Parent A — Steem post URL"
          style="font-size:13px;"
        />
        <input
          v-model="urlB"
          type="text"
          placeholder="Parent B — Steem post URL"
          style="font-size:13px;"
        />
        <button
          @click="breedCreatures"
          :disabled="loading"
          style="background:#1a3a2a;"
        >
          {{ loading ? "Loading genomes…" : "🔬 Breed" }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="loadError" style="color:#ff8a80;font-size:13px;margin-top:8px;">
        ⚠ {{ loadError }}
      </div>

      <!-- Child preview -->
      <div v-if="childGenome" style="margin-top:20px;">
        <div style="font-size:1.1rem;font-weight:bold;color:#80deea;">
          ❇ {{ childName }}
        </div>
        <div style="font-size:0.85rem;color:#888;margin:2px 0 6px;">
          {{ sexLabel }}
          &nbsp;·&nbsp;
          <span :style="{ color: mutationColor }">{{ mutationLabel }}</span>
        </div>

        <!-- Unicode art preview -->
        <pre style="font-size:11px;line-height:1.3;display:inline-block;text-align:left;">{{ childArt }}</pre>

        <!-- Genome summary -->
        <div style="font-size:12px;color:#666;margin:4px 0 10px;">
          GEN {{ childGenome.GEN }}
          &nbsp;·&nbsp; MOR {{ childGenome.MOR }}
          &nbsp;·&nbsp; APP {{ childGenome.APP }}
          &nbsp;·&nbsp; ORN {{ childGenome.ORN }}
          &nbsp;·&nbsp; MUT {{ childGenome.MUT }}
          &nbsp;·&nbsp; LIF {{ childGenome.LIF }} days
        </div>

        <button
          @click="publishChild"
          :disabled="publishing || !username"
          style="background:#1565c0;"
        >
          {{ publishing ? "Publishing…" : "📡 Publish Offspring to Steem" }}
        </button>
        <p v-if="!username" style="color:#888;font-size:13px;margin:4px 0;">
          Log in to publish.
        </p>
      </div>
    </div>
  `
};
