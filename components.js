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
    genome:    { type: Object,  default: null  },
    age:       { type: Number,  default: 0     },
    fossil:    { type: Boolean, default: false },
    feedState: { type: Object,  default: null  }
  },
  data() {
    // Direction is chosen once at component creation — purely random,
    // not derived from the genome so it varies each time the page loads.
    return { facingRight: Math.random() < 0.5 };
  },
  watch: {
    genome()    { this.$nextTick(() => this.draw()); },
    age()       { this.$nextTick(() => this.draw()); },
    fossil()    { this.$nextTick(() => this.draw()); },
    feedState() { this.$nextTick(() => this.draw()); }
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
    // ----------------------------------------------------------
    buildPhenotype(genome, age, feedState) {
      const lifespanBonus = feedState ? feedState.lifespanBonus : 0;
      const effectiveLIF  = genome.LIF + lifespanBonus;
      const pct    = Math.min(age / effectiveLIF, 1.0);
      const fossil = pct >= 1.0;

      // Lifecycle scalars
      let bodyScale, ornamentScale, patternOpacity;
      if      (pct < 0.05) { bodyScale = 0.45; ornamentScale = 0.00; patternOpacity = 0.10; }
      else if (pct < 0.12) { bodyScale = 0.60; ornamentScale = 0.15; patternOpacity = 0.30; }
      else if (pct < 0.25) { bodyScale = 0.78; ornamentScale = 0.40; patternOpacity = 0.60; }
      else if (pct < 0.40) { bodyScale = 0.90; ornamentScale = 0.75; patternOpacity = 0.90; }
      else if (pct < 0.60) { bodyScale = 1.00; ornamentScale = 1.00; patternOpacity = 1.00; }
      else if (pct < 0.80) { bodyScale = 0.98; ornamentScale = 0.88; patternOpacity = 0.90; }
      else if (pct < 1.00) { bodyScale = 0.92; ornamentScale = 0.70; patternOpacity = 0.75; }
      else                 { bodyScale = 0.75; ornamentScale = 0.00; patternOpacity = 0.00; }

      const fertile = age >= genome.FRT_START && age < genome.FRT_END && !fossil;
      const male    = genome.SX === 0;

      // Colour
      const palettes = [
        { base: 160 }, { base: 200 }, { base: 280 }, { base:  30 },
        { base: 340 }, { base: 100 }, { base: 240 }, { base:  55 },
      ];
      const paletteBase = palettes[genome.GEN % 8].base;
      const finalHue    = (paletteBase + genome.CLR) % 360;
      const healthPct   = feedState ? feedState.healthPct : 0.5;
      const satBoost    = fossil ? 0 : Math.round((healthPct - 0.5) * 30);
      const litBoost    = fossil ? 0 : Math.round((healthPct - 0.5) * 16);
      const colorSat    = fossil ? 8  : Math.max(10, Math.min(100, 55 + ornamentScale * 20 + (fertile ? 10 : 0) + satBoost));
      const colorLight  = fossil ? 28 : Math.max(15, Math.min(70,  40 + (pct < 0.6 ? 10 : 0) + litBoost));

      // MOR → body proportions
      const morRng      = this.makePrng(genome.MOR);
      const bodyLen     = 80 + morRng() * 30;   // torso half-width
      const bodyH       = 42 + morRng() * 18;   // torso half-height
      const headSize    = 26 + morRng() * 12;   // head radius
      const tailCurve   = 0.4 + morRng() * 0.5; // tail curl amount

      // APP → appendage style
      const appRng      = this.makePrng(genome.APP);
      const legLen      = 44 + appRng() * 20;
      const legThick    = 7  + appRng() * 5;
      const earH        = 22 + appRng() * 14;
      const earW        = 10 + appRng() * 6;
      const hasWings    = appRng() > 0.72;      // rare dorsal wing/fin
      const wingSpan    = 24 + appRng() * 20;

      // ORN → ornament style
      const ornRng      = this.makePrng(genome.ORN);
      const glowOrbs    = 2 + Math.floor(ornRng() * 4);  // 2–5 orbs on tail
      const ribbons     = 1 + Math.floor(ornRng() * 3);  // 1–3 energy ribbons
      const patternType = Math.floor(ornRng() * 3);      // 0=plain 1=spots 2=dapple
      const orbHue      = (finalHue + 40 + ornRng() * 60) % 360;
      const hasChestMark = ornRng() > 0.4;
      const hasMane      = ornRng() > 0.45;

      return {
        fossil, pct, fertile, male,
        bodyScale, ornamentScale, patternOpacity,
        finalHue, colorSat, colorLight, orbHue,
        bodyLen, bodyH, headSize, tailCurve,
        legLen, legThick, earH, earW,
        hasWings, wingSpan,
        glowOrbs, ribbons, patternType, hasChestMark, hasMane,
        eyeRadius: pct < 0.08 ? 9 : 7,
      };
    },

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------
    hsl(h, s, l, a = 1) {
      return a < 1
        ? `hsla(${h},${s}%,${l}%,${a})`
        : `hsl(${h},${s}%,${l}%)`;
    },
    radGrad(ctx, x, y, r0, r1, stops) {
      const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
      stops.forEach(([t, c]) => g.addColorStop(t, c));
      return g;
    },
    linGrad(ctx, x0, y0, x1, y1, stops) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([t, c]) => g.addColorStop(t, c));
      return g;
    },

    // ----------------------------------------------------------
    // Main draw
    // ----------------------------------------------------------
    draw() {
      const canvas = this.$refs.canvas;
      if (!canvas || !this.genome) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Mirror the entire canvas when facing right — no drawing code changes needed.
      if (this.facingRight) {
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }

      const g = this.genome;
      const p = this.buildPhenotype(g, this.age, this.feedState);
      const sc = p.bodyScale;

      // Creature is drawn in side-profile facing left.
      // Pivot point: centre of torso.
      const ox = W * 0.46;   // torso centre x (shifted left so tail fits)
      const oy = H * 0.52;   // torso centre y

      const H1  = this.hsl;
      const hue = p.finalHue;
      const sat = p.colorSat;
      const lit = p.colorLight;

      // ---- FOSSIL ----
      if (p.fossil) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle   = "#666";
        ctx.strokeStyle = "#444";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.ellipse(ox, oy, p.bodyLen * 0.55, p.bodyH * 0.9, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        const crRng = this.makePrng(g.MOR + 11);
        ctx.strokeStyle = "#333"; ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          const sx = ox + (crRng() - 0.5) * p.bodyLen;
          const sy = oy + (crRng() - 0.5) * p.bodyH * 1.5;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (crRng() - 0.5) * 28, sy + (crRng() - 0.5) * 28);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return;
      }

      // ---- SHADOW ----
      const shadowY  = oy + p.bodyH * sc + p.legLen * sc * 0.85;
      const shadowGr = this.radGrad(ctx, ox, shadowY, 0, p.bodyLen * sc * 0.9, [
        [0,   `hsla(0,0%,0%,0.18)`],
        [1,   `hsla(0,0%,0%,0)`],
      ]);
      ctx.fillStyle = shadowGr;
      ctx.beginPath();
      ctx.ellipse(ox, shadowY, p.bodyLen * sc * 0.85, 7 * sc, 0, 0, Math.PI * 2);
      ctx.fill();

      // ---- ENERGY RIBBONS (behind body) ----
      if (p.ornamentScale > 0.3) {
        const ribRng = this.makePrng(g.ORN + 200);
        for (let r = 0; r < p.ribbons; r++) {
          const yOff   = (ribRng() - 0.5) * p.bodyH * sc * 0.9;
          const ctrl1x = ox + p.bodyLen * sc * 0.8 + 20 + ribRng() * 30;
          const ctrl1y = oy + yOff - 20 - ribRng() * 25;
          const ctrl2x = ctrl1x + 30 + ribRng() * 50;
          const ctrl2y = oy + yOff + (ribRng() - 0.5) * 40;
          const endX   = ctrl2x + 20 + ribRng() * 40;
          const endY   = ctrl2y + (ribRng() - 0.5) * 30;
          const alpha  = 0.55 + ribRng() * 0.35;
          const w      = (2 + ribRng() * 3) * p.ornamentScale;

          ctx.globalAlpha = alpha * p.ornamentScale;
          ctx.strokeStyle = H1((p.orbHue + r * 20) % 360, sat + 30, lit + 30);
          ctx.lineWidth   = w * sc;
          ctx.lineCap     = "round";
          ctx.beginPath();
          ctx.moveTo(ox + p.bodyLen * sc * 0.6, oy + yOff);
          ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, endX, endY);
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.lineCap = "butt";
      }

      // ---- BACK LEGS (behind body, slightly muted) ----
      this._drawLeg(ctx, p, sc, ox + p.bodyLen * sc * 0.52, oy + p.bodyH * sc * 0.55,
                    hue, sat - 8, lit - 10, true);
      this._drawLeg(ctx, p, sc, ox - p.bodyLen * sc * 0.18, oy + p.bodyH * sc * 0.55,
                    hue, sat - 8, lit - 10, true);

      // ---- TAIL ----
      this._drawTail(ctx, p, sc, ox, oy, hue, sat, lit);

      // ---- TORSO ----
      // Underbelly gradient
      const torsoGr = this.linGrad(ctx,
        ox, oy - p.bodyH * sc,
        ox, oy + p.bodyH * sc,
        [
          [0,   H1(hue, sat - 5,  lit - 8)],
          [0.4, H1(hue, sat,      lit)],
          [1,   H1(hue, sat - 12, lit + 14)], // lighter belly
        ]
      );
      ctx.fillStyle   = torsoGr;
      ctx.strokeStyle = H1(hue, sat, lit - 18);
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      // Slightly longer horizontally than tall — fox-like torso
      ctx.ellipse(ox, oy, p.bodyLen * sc, p.bodyH * sc, -0.08, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // ---- CHEST MARKING ----
      if (p.hasChestMark && p.ornamentScale > 0.2) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ox, oy, p.bodyLen * sc, p.bodyH * sc, -0.08, 0, Math.PI * 2);
        ctx.clip();
        const chestGr = this.radGrad(ctx,
          ox - p.bodyLen * sc * 0.35, oy,
          0, p.bodyLen * sc * 0.45,
          [
            [0,   H1(hue, sat - 20, lit + 28, 0.65)],
            [0.6, H1(hue, sat - 10, lit + 14, 0.25)],
            [1,   H1(hue, sat,      lit,       0)],
          ]
        );
        ctx.fillStyle = chestGr;
        ctx.fillRect(ox - p.bodyLen * sc, oy - p.bodyH * sc, p.bodyLen * sc * 2, p.bodyH * sc * 2);
        ctx.restore();
      }

      // ---- PATTERN (spots / dapple) ----
      if (p.patternOpacity > 0.1 && p.patternType > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ox, oy, p.bodyLen * sc - 2, p.bodyH * sc - 2, -0.08, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = p.patternOpacity * 0.22;
        ctx.fillStyle   = H1((hue + 35) % 360, sat + 10, lit + 20);
        const patRng = this.makePrng(g.ORN + 77);
        if (p.patternType === 1) {
          // subtle spots
          for (let i = 0; i < 10; i++) {
            const sx = ox + (patRng() - 0.5) * p.bodyLen * sc * 1.6;
            const sy = oy + (patRng() - 0.5) * p.bodyH * sc * 1.6;
            const sr = (3 + patRng() * 6) * sc;
            ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // dapple — large soft blobs
          for (let i = 0; i < 5; i++) {
            const sx = ox + (patRng() - 0.5) * p.bodyLen * sc * 1.2;
            const sy = oy + (patRng() - 0.5) * p.bodyH * sc;
            ctx.beginPath();
            ctx.ellipse(sx, sy, (8 + patRng() * 14) * sc, (5 + patRng() * 10) * sc, patRng() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore(); ctx.globalAlpha = 1;
      }

      // ---- FRONT LEGS (in front of body) ----
      this._drawLeg(ctx, p, sc, ox + p.bodyLen * sc * 0.42, oy + p.bodyH * sc * 0.6,
                    hue, sat, lit, false);
      this._drawLeg(ctx, p, sc, ox - p.bodyLen * sc * 0.08, oy + p.bodyH * sc * 0.6,
                    hue, sat, lit, false);

      // ---- NECK ----
      const headX = ox - p.bodyLen * sc * 0.68;
      const headY = oy - p.bodyH * sc * 0.35;
      const neckGr = this.linGrad(ctx, ox - p.bodyLen * sc * 0.5, oy - p.bodyH * sc * 0.1,
                                  headX, headY + p.headSize * sc * 0.4,
        [
          [0,   H1(hue, sat - 5, lit - 5)],
          [1,   H1(hue, sat,     lit)],
        ]
      );
      ctx.fillStyle   = neckGr;
      ctx.strokeStyle = H1(hue, sat, lit - 18);
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox - p.bodyLen * sc * 0.42, oy - p.bodyH * sc * 0.5);
      ctx.quadraticCurveTo(
        ox - p.bodyLen * sc * 0.58, oy - p.bodyH * sc * 0.2,
        headX + p.headSize * sc * 0.55, headY + p.headSize * sc * 0.5
      );
      ctx.quadraticCurveTo(
        ox - p.bodyLen * sc * 0.52, oy,
        ox - p.bodyLen * sc * 0.32, oy + p.bodyH * sc * 0.1
      );
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // ---- MANE ----
      if (p.hasMane && p.ornamentScale > 0.2) {
        const maneRng = this.makePrng(g.ORN + 555);
        ctx.strokeStyle = H1(hue, sat - 10, lit + 22);
        ctx.lineCap = "round";
        for (let i = 0; i < 7; i++) {
          const t      = i / 6;
          const mx     = ox - p.bodyLen * sc * (0.45 + t * 0.28);
          const my     = oy - p.bodyH * sc * (0.55 + t * 0.15);
          const len    = (8 + maneRng() * 12) * sc * p.ornamentScale;
          const angle  = -0.4 - maneRng() * 0.5;
          ctx.globalAlpha = 0.55 + maneRng() * 0.3;
          ctx.lineWidth   = (1.5 + maneRng() * 2) * sc;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(angle) * len, my + Math.sin(angle) * len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.lineCap = "butt";
      }

      // ---- HEAD ----
      const hR = p.headSize * sc;
      // Head gradient — lighter face, darker crown
      const headGr = this.radGrad(ctx, headX - hR * 0.15, headY + hR * 0.2, hR * 0.1, hR * 1.1,
        [
          [0,   H1(hue, sat - 18, lit + 22)],
          [0.5, H1(hue, sat,      lit)],
          [1,   H1(hue, sat + 5,  lit - 12)],
        ]
      );
      ctx.fillStyle   = headGr;
      ctx.strokeStyle = H1(hue, sat, lit - 18);
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.arc(headX, headY, hR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Snout
      const snoutX = headX - hR * 0.72;
      const snoutY = headY + hR * 0.18;
      ctx.fillStyle   = H1(hue, sat - 5, lit + 12);
      ctx.strokeStyle = H1(hue, sat, lit - 18);
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.ellipse(snoutX, snoutY, hR * 0.44, hR * 0.28, -0.15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Nose
      ctx.fillStyle = H1(hue, sat + 10, lit - 30);
      ctx.beginPath();
      ctx.ellipse(snoutX - hR * 0.22, snoutY - hR * 0.06, hR * 0.12, hR * 0.08, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // ---- EARS ----
      this._drawEar(ctx, p, sc, headX, headY, hue, sat, lit, -1, false); // back ear
      this._drawEar(ctx, p, sc, headX, headY, hue, sat, lit,  1, true);  // front ear

      // ---- EYE ----
      const eyeX = headX - hR * 0.28;
      const eyeY = headY - hR * 0.14;
      const eyeR = p.eyeRadius * sc;
      // Iris
      const irisGr = this.radGrad(ctx, eyeX - eyeR * 0.2, eyeY - eyeR * 0.2, 0, eyeR,
        [
          [0,   H1((hue + 120) % 360, 70, 75)],
          [0.6, H1((hue + 90)  % 360, 80, 50)],
          [1,   H1((hue + 60)  % 360, 60, 25)],
        ]
      );
      ctx.fillStyle = irisGr;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      // Pupil
      ctx.fillStyle = "#0a0a14";
      ctx.beginPath(); ctx.ellipse(eyeX + eyeR * 0.05, eyeY, eyeR * 0.42, eyeR * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      // Highlights
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.beginPath(); ctx.arc(eyeX - eyeR * 0.28, eyeY - eyeR * 0.28, eyeR * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.arc(eyeX + eyeR * 0.2, eyeY + eyeR * 0.15, eyeR * 0.12, 0, Math.PI * 2); ctx.fill();
      // Outline
      ctx.strokeStyle = H1(hue, sat, lit - 25); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.stroke();

      // ---- DORSAL WING / FIN (if present) ----
      if (p.hasWings && p.ornamentScale > 0.35) {
        const wS = p.wingSpan * sc * p.ornamentScale;
        const wx = ox - p.bodyLen * sc * 0.1;
        const wy = oy - p.bodyH * sc * 0.88;
        ctx.fillStyle   = H1(hue, sat + 10, lit + 16, 0.7);
        ctx.strokeStyle = H1(hue, sat, lit - 10, 0.8);
        ctx.lineWidth   = 1.2;
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.moveTo(wx - wS * 0.5, wy + wS * 0.35);
        ctx.quadraticCurveTo(wx - wS * 0.3, wy - wS * 0.4, wx, wy - wS);
        ctx.quadraticCurveTo(wx + wS * 0.3, wy - wS * 0.4, wx + wS * 0.5, wy + wS * 0.35);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ---- GLOWING ORB NODES on tail ----
      if (p.ornamentScale > 0.4) {
        this._drawOrbNodes(ctx, p, sc, ox, oy, g);
      }

      // ---- FERTILITY AURA ----
      if (p.fertile) {
        ctx.globalAlpha = 0.14;
        const aura = this.radGrad(ctx, ox, oy, p.bodyLen * sc * 0.3, p.bodyLen * sc * 1.6,
          [
            [0, H1((hue + 60) % 360, 100, 85)],
            [1, H1(hue, 60, 50, 0)],
          ]
        );
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(ox, oy, p.bodyLen * sc * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Restore mirror transform if applied.
      if (this.facingRight) ctx.restore();
    },

    // ----------------------------------------------------------
    // Draw a single leg + paw
    // ----------------------------------------------------------
    _drawLeg(ctx, p, sc, x, y, hue, sat, lit, behind) {
      const lLen = p.legLen * sc;
      const lW   = p.legThick * sc;
      const alpha = behind ? 0.62 : 1.0;
      ctx.globalAlpha = alpha;

      // Upper leg
      const legGr = this.linGrad(ctx, x, y, x + lW * 0.3, y + lLen * 0.6,
        [
          [0, this.hsl(hue, sat - 5, lit - 5)],
          [1, this.hsl(hue, sat - 10, lit - 14)],
        ]
      );
      ctx.fillStyle   = legGr;
      ctx.strokeStyle = this.hsl(hue, sat, lit - 22);
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x - lW * 0.5, y);
      ctx.quadraticCurveTo(x - lW * 0.7, y + lLen * 0.5, x - lW * 0.3, y + lLen * 0.7);
      ctx.lineTo(x + lW * 0.3, y + lLen * 0.7);
      ctx.quadraticCurveTo(x + lW * 0.7, y + lLen * 0.5, x + lW * 0.5, y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Paw
      ctx.fillStyle   = this.hsl(hue, sat - 15, lit + 10);
      ctx.strokeStyle = this.hsl(hue, sat, lit - 22);
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y + lLen * 0.72, lW * 0.72, lW * 0.42, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.globalAlpha = 1;
    },

    // ----------------------------------------------------------
    // Draw tail with flowing shape
    // ----------------------------------------------------------
    _drawTail(ctx, p, sc, ox, oy, hue, sat, lit) {
      const tX0 = ox + p.bodyLen * sc * 0.82;
      const tY0 = oy - p.bodyH * sc * 0.08;
      const curl = p.tailCurve;

      const cp1x = tX0 + 32 * sc;
      const cp1y = tY0 - 30 * sc * curl;
      const cp2x = tX0 + 65 * sc;
      const cp2y = tY0 - 55 * sc * curl;
      const endX = tX0 + 55 * sc;
      const endY = tY0 - 78 * sc * curl;

      // Base tail shape — fluffy
      const tailGr = this.linGrad(ctx, tX0, tY0, endX, endY,
        [
          [0,   this.hsl(hue, sat - 5,  lit - 8)],
          [0.5, this.hsl(hue, sat,      lit + 4)],
          [1,   this.hsl((hue + 30) % 360, sat + 15, lit + 18)],
        ]
      );
      ctx.fillStyle   = tailGr;
      ctx.strokeStyle = this.hsl(hue, sat, lit - 14);
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(tX0, tY0 + 10 * sc);
      ctx.bezierCurveTo(cp1x, cp1y + 12 * sc, cp2x + 4 * sc, cp2y + 10 * sc, endX + 8 * sc, endY);
      ctx.bezierCurveTo(cp2x - 6 * sc, cp2y - 14 * sc, cp1x - 10 * sc, cp1y - 12 * sc, tX0, tY0 - 10 * sc);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Fluffy tip — lighter burst
      const tipGr = this.radGrad(ctx, endX, endY, 0, 20 * sc,
        [
          [0,   this.hsl((hue + 40) % 360, sat + 20, lit + 32, 0.9)],
          [0.6, this.hsl((hue + 20) % 360, sat + 10, lit + 18, 0.5)],
          [1,   this.hsl(hue, sat, lit, 0)],
        ]
      );
      ctx.fillStyle = tipGr;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(endX, endY, 20 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    },

    // ----------------------------------------------------------
    // Draw a pointed ear
    // ----------------------------------------------------------
    _drawEar(ctx, p, sc, headX, headY, hue, sat, lit, side, front) {
      const hR   = p.headSize * sc;
      const eH   = p.earH * sc;
      const eW   = p.earW * sc;
      const baseX = headX - hR * 0.12 + (side < 0 ? -hR * 0.28 : hR * 0.28);
      const baseY = headY - hR * 0.62;
      const tipX  = baseX + (side < 0 ? -eW * 0.3 : eW * 0.3);
      const tipY  = baseY - eH;
      ctx.globalAlpha = front ? 1.0 : 0.7;

      // Outer ear
      ctx.fillStyle   = this.hsl(hue, sat + 5, lit - 5);
      ctx.strokeStyle = this.hsl(hue, sat, lit - 20);
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.moveTo(baseX - eW * 0.55, baseY);
      ctx.quadraticCurveTo(baseX - eW * 0.7, baseY - eH * 0.5, tipX, tipY);
      ctx.quadraticCurveTo(baseX + eW * 0.7, baseY - eH * 0.5, baseX + eW * 0.55, baseY);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Inner ear — pinkish/contrasting
      if (front && p.ornamentScale > 0.1) {
        ctx.fillStyle = this.hsl((hue + 15) % 360, sat + 20, lit + 20, 0.65);
        ctx.beginPath();
        ctx.moveTo(baseX - eW * 0.3, baseY - eH * 0.12);
        ctx.quadraticCurveTo(baseX - eW * 0.35, baseY - eH * 0.55, tipX, tipY + eH * 0.22);
        ctx.quadraticCurveTo(baseX + eW * 0.35, baseY - eH * 0.55, baseX + eW * 0.3, baseY - eH * 0.12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    // ----------------------------------------------------------
    // Draw glowing orb nodes along the tail
    // ----------------------------------------------------------
    _drawOrbNodes(ctx, p, sc, ox, oy, g) {
      const orbRng = this.makePrng(g.ORN + 888);
      const tX0    = ox + p.bodyLen * sc * 0.82;
      const tY0    = oy - p.bodyH * sc * 0.08;

      for (let i = 0; i < p.glowOrbs; i++) {
        const t  = (i + 1) / (p.glowOrbs + 1);
        // Place orbs along the tail bezier (linear approximation)
        const curl = p.tailCurve;
        const bx = tX0 + (32 + t * 33) * sc;
        const by = tY0 - (t * 55 * curl + (orbRng() - 0.5) * 10) * sc;

        const orbR    = (5 + orbRng() * 5) * sc * p.ornamentScale;
        const orbHue  = (p.orbHue + i * 25) % 360;
        const isPrimary = i % 2 === 0;

        // Outer glow
        const glowGr = this.radGrad(ctx, bx, by, 0, orbR * 2.8,
          [
            [0,   this.hsl(orbHue, 100, 88, 0.7)],
            [0.4, this.hsl(orbHue,  90, 70, 0.35)],
            [1,   this.hsl(orbHue,  80, 55, 0)],
          ]
        );
        ctx.fillStyle = glowGr;
        ctx.globalAlpha = 0.8 * p.ornamentScale;
        ctx.beginPath(); ctx.arc(bx, by, orbR * 2.8, 0, Math.PI * 2); ctx.fill();

        // Orb body
        const orbGr = this.radGrad(ctx, bx - orbR * 0.3, by - orbR * 0.3, 0, orbR,
          [
            [0,   this.hsl(orbHue, 60, 95)],
            [0.5, this.hsl(orbHue, 90, 72)],
            [1,   this.hsl(orbHue, 100, 45)],
          ]
        );
        ctx.globalAlpha = p.ornamentScale;
        ctx.fillStyle   = orbGr;
        ctx.strokeStyle = this.hsl(orbHue, 80, 60, 0.6);
        ctx.lineWidth   = 0.7;
        ctx.beginPath(); ctx.arc(bx, by, orbR, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Specular
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.globalAlpha = p.ornamentScale * 0.8;
        ctx.beginPath(); ctx.arc(bx - orbR * 0.32, by - orbR * 0.32, orbR * 0.28, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  },
  template: `<canvas ref="canvas" width="400" height="320" style="max-width:100%;"></canvas>`
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

// ---- GlobalProfileBannerComponent ----
// Compact logged-in user banner shown on every page.
// Displays cover image, avatar, display name, and @username.
const GlobalProfileBannerComponent = {
  name: "GlobalProfileBannerComponent",
  props: {
    profileData: { type: Object, default: null }
  },
  methods: {
    safeUrl(url) {
      try {
        const u = new URL(url);
        return u.protocol === "https:" ? url : "";
      } catch { return ""; }
    }
  },
  template: `
    <div v-if="profileData" style="position:relative;margin:8px auto 0;max-width:700px;border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;">
      <!-- Cover image -->
      <div :style="{
        height: '72px',
        background: safeUrl(profileData.coverImage)
          ? 'url(' + safeUrl(profileData.coverImage) + ') center/cover no-repeat'
          : 'linear-gradient(135deg, #1a2e1a 0%, #0d1a0d 100%)',
        borderBottom: '1px solid #222'
      }"></div>

      <!-- Avatar + info row -->
      <div style="display:flex;align-items:center;gap:12px;padding:0 16px 10px;background:#161616;">
        <!-- Avatar overlapping cover -->
        <img
          :src="safeUrl(profileData.profileImage) || ''"
          @error="$event.target.style.display='none'"
          style="width:52px;height:52px;border-radius:50%;border:2px solid #2e7d32;background:#222;margin-top:-26px;flex-shrink:0;object-fit:cover;"
        />
        <div style="text-align:left;margin-top:4px;min-width:0;">
          <div style="font-size:0.95rem;font-weight:bold;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            {{ profileData.displayName }}
          </div>
          <div style="font-size:0.78rem;color:#66bb6a;">@{{ profileData.username }}</div>
          <div v-if="profileData.about" style="font-size:0.75rem;color:#666;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;">
            {{ profileData.about }}
          </div>
        </div>
      </div>
    </div>
  `
};

// ============================================================
// FeedingPanelComponent
// Lets users paste a SteemBiota post URL, view its feed history,
// and send a new feeding reply via Steem Keychain.
//
// Anti-spam (read-side): parseFeedEvents() enforces
//   — 1 feed per (feeder, UTC-day) pair
//   — 20 total feeds per creature lifetime
//
// Owner feeds count 3× toward health; community feeds count 1×.
// ============================================================
const FeedingPanelComponent = {
  name: "FeedingPanelComponent",
  props: {
    username: String
  },
  emits: ["notify", "feed-state-updated"],
  data() {
    return {
      postUrl:          "",
      foodType:         "nectar",
      loading:          false,
      loadError:        "",
      publishing:       false,
      // Loaded creature context
      creatureAuthor:   null,
      creaturePermlink: null,
      creatureName:     null,
      feedEvents:       null,   // raw result from parseFeedEvents()
      feedState:        null,   // computed from computeFeedState()
      // Rate-limit check
      alreadyFedToday:  false,
    };
  },
  computed: {
    foodOptions() {
      return [
        { value: "nectar",  label: "🍯 Nectar  — +1 day lifespan" },
        { value: "fruit",   label: "🍎 Fruit   — +10% fertility" },
        { value: "crystal", label: "💎 Crystal — +5% fertility" },
      ];
    },
    healthBarWidth() {
      if (!this.feedState) return "0%";
      return Math.round(this.feedState.healthPct * 100) + "%";
    },
    healthBarColor() {
      if (!this.feedState) return "#444";
      const h = this.feedState.healthPct;
      return h >= 0.80 ? "#66bb6a" : h >= 0.55 ? "#a5d6a7" : h >= 0.30 ? "#ffb74d" : "#888";
    },
    canFeed() {
      return !this.alreadyFedToday &&
             !!this.creatureAuthor &&
             !!this.username &&
             !this.publishing &&
             this.feedEvents &&
             this.feedEvents.total < 20;
    },
    feedButtonLabel() {
      if (this.publishing)         return "Feeding…";
      if (!this.username)          return "Log in to feed";
      if (!this.creatureAuthor)    return "Load a creature first";
      if (this.alreadyFedToday)    return "Already fed today ✓";
      if (this.feedEvents && this.feedEvents.total >= 20) return "Feed cap reached (20/20)";
      return "🍃 Feed this creature";
    }
  },
  methods: {
    async loadCreature() {
      this.loadError        = "";
      this.creatureAuthor   = null;
      this.creaturePermlink = null;
      this.creatureName     = null;
      this.feedEvents       = null;
      this.feedState        = null;
      this.alreadyFedToday  = false;

      const url = this.postUrl.trim();
      if (!url) { this.loadError = "Please enter a creature post URL."; return; }

      this.loading = true;
      try {
        const { author, permlink } = parseSteemUrl(url);
        const post = await fetchPost(author, permlink);
        if (!post || !post.author) throw new Error("Post not found.");

        // Verify it's a SteemBiota post
        let meta = {};
        try { meta = JSON.parse(post.json_metadata || "{}"); } catch {}
        if (!meta.steembiota) throw new Error("This post does not appear to be a SteemBiota creature.");

        this.creatureAuthor   = author;
        this.creaturePermlink = permlink;
        this.creatureName     = meta.steembiota.name || author;

        // Fetch all replies and parse feed events
        const replies = await fetchAllReplies(author, permlink);
        this.feedEvents = parseFeedEvents(replies, author);
        this.feedState  = computeFeedState(this.feedEvents, meta.steembiota.genome || { LIF: 100 });
        this.$emit("feed-state-updated", this.feedState);

        // Check if logged-in user already fed today
        if (this.username) {
          const todayUTC = new Date().toISOString().slice(0, 10);
          const key = `${this.username}::${todayUTC}`;
          // Reconstruct from byFeeder — we check if any feed from today exists
          // (parseFeedEvents already deduped, so if byFeeder has this user it counted once today max)
          // More precise: re-scan replies for today
          const alreadyToday = replies.some(r => {
            if (r.author !== this.username) return false;
            let m = {};
            try { m = JSON.parse(r.json_metadata || "{}"); } catch {}
            if (!m.steembiota || m.steembiota.type !== "feed") return false;
            const d = (r.created.endsWith("Z") ? r.created : r.created + "Z");
            return new Date(d).toISOString().slice(0, 10) === todayUTC;
          });
          this.alreadyFedToday = alreadyToday;
        }
      } catch(e) {
        this.loadError = e.message || String(e);
      }
      this.loading = false;
    },

    async feedCreature() {
      if (!this.canFeed) return;
      if (!window.steem_keychain) {
        this.$emit("notify", "Steem Keychain is not installed.", "error");
        return;
      }
      this.publishing = true;
      publishFeed(
        this.username,
        this.creatureAuthor,
        this.creaturePermlink,
        this.creatureName,
        this.foodType,
        (response) => {
          this.publishing = false;
          if (response.success) {
            // Optimistically update local state
            const feeder = this.username;
            const isOwner = feeder === this.creatureAuthor;
            this.feedEvents = {
              ...this.feedEvents,
              total:          this.feedEvents.total + 1,
              ownerFeeds:     isOwner ? this.feedEvents.ownerFeeds + 1 : this.feedEvents.ownerFeeds,
              communityFeeds: isOwner ? this.feedEvents.communityFeeds : this.feedEvents.communityFeeds + 1,
              byFeeder: {
                ...this.feedEvents.byFeeder,
                [feeder]: (this.feedEvents.byFeeder[feeder] || 0) + 1
              }
            };
            // We need genome.LIF for recompute — re-use a stub if genome not available
            const genomeLIF = this.feedState
              ? Math.round(this.feedState.lifespanBonus / 0.20 + (this.feedState.lifespanBonus > 0 ? 1 : 100))
              : 100;
            this.feedState = computeFeedState(this.feedEvents, { LIF: genomeLIF });
            this.alreadyFedToday = true;
            this.$emit("feed-state-updated", this.feedState);
            const foodLabel = { nectar: "Nectar", fruit: "Fruit", crystal: "Crystal" }[this.foodType] || this.foodType;
            this.$emit("notify", "🍃 Fed " + this.creatureName + " with " + foodLabel + "!", "success");
          } else {
            this.$emit("notify", "Feed failed: " + (response.message || "Unknown error"), "error");
          }
        }
      );
    }
  },

  template: `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #333;">
      <h3 style="color:#66bb6a;margin:0 0 12px;">🍃 Feed a Creature</h3>

      <!-- URL input + load -->
      <div style="display:flex;flex-direction:column;gap:8px;max-width:520px;margin:0 auto;">
        <input
          v-model="postUrl"
          type="text"
          placeholder="Creature post URL (steemit.com/@user/permlink)"
          style="font-size:13px;"
          @keydown.enter="loadCreature"
        />
        <button @click="loadCreature" :disabled="loading" style="background:#1a2e1a;">
          {{ loading ? "Loading…" : "🔍 Load Creature" }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="loadError" style="color:#ff8a80;font-size:13px;margin-top:8px;">
        ⚠ {{ loadError }}
      </div>

      <!-- Creature feed summary -->
      <div v-if="feedState && creatureName" style="margin-top:18px;">
        <div style="font-size:0.95rem;font-weight:bold;color:#a5d6a7;margin-bottom:10px;">
          {{ creatureName }}
          <span style="font-size:0.78rem;font-weight:normal;color:#666;">
            @{{ creatureAuthor }}/{{ creaturePermlink }}
          </span>
        </div>

        <!-- Health bar -->
        <div style="max-width:320px;margin:0 auto 12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px;">
            <span>Health</span>
            <span>{{ feedState.symbol }} {{ feedState.label }}</span>
          </div>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;height:10px;overflow:hidden;">
            <div :style="{
              width: healthBarWidth,
              height: '100%',
              background: healthBarColor,
              borderRadius: '6px',
              transition: 'width 0.4s ease'
            }"></div>
          </div>
        </div>

        <!-- Feed stats -->
        <div style="font-size:12px;color:#666;margin-bottom:12px;">
          Total feeds: <strong style="color:#aaa;">{{ feedEvents.total }}/20</strong>
          &nbsp;·&nbsp;
          Owner: <strong style="color:#aaa;">{{ feedEvents.ownerFeeds }}</strong>
          &nbsp;·&nbsp;
          Community: <strong style="color:#aaa;">{{ feedEvents.communityFeeds }}</strong>
          <template v-if="feedState.lifespanBonus > 0">
            &nbsp;·&nbsp;
            Lifespan +<strong style="color:#66bb6a;">{{ feedState.lifespanBonus }}d</strong>
          </template>
          <template v-if="feedState.fertilityBoost > 0">
            &nbsp;·&nbsp;
            Fertility +<strong style="color:#f48fb1;">{{ Math.round(feedState.fertilityBoost * 100) }}%</strong>
          </template>
        </div>

        <!-- Food selector -->
        <div style="display:flex;flex-direction:column;gap:6px;max-width:320px;margin:0 auto 10px;">
          <div v-for="opt in foodOptions" :key="opt.value" style="display:flex;align-items:center;gap:8px;cursor:pointer;" @click="foodType = opt.value">
            <div :style="{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid ' + (foodType === opt.value ? '#66bb6a' : '#444'),
              background: foodType === opt.value ? '#2e7d32' : 'transparent',
              flexShrink: 0
            }"></div>
            <span :style="{ fontSize: '13px', color: foodType === opt.value ? '#eee' : '#888' }">{{ opt.label }}</span>
          </div>
        </div>

        <!-- Feed button -->
        <button
          @click="feedCreature"
          :disabled="!canFeed"
          style="background:#1b3a1b;"
        >{{ feedButtonLabel }}</button>

        <p v-if="!username" style="color:#888;font-size:13px;margin:4px 0;">Log in to feed.</p>
        <p v-if="alreadyFedToday" style="color:#555;font-size:12px;margin:4px 0;">Come back tomorrow to feed again.</p>
      </div>
    </div>
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
      genomeA:     null,
      genomeB:     null,
      childGenome: null,
      childName:   null,
      childArt:    null,
      breedInfo:   null,
      publishing:  false,
      customTitle: ""       // pre-filled with default; user may edit before publishing
    };
  },
  computed: {
    sexLabel() {
      if (!this.childGenome) return "";
      return this.childGenome.SX === 0 ? "♂ Male" : "♀ Female";
    },
    parentASex() {
      if (!this.genomeA) return "";
      return this.genomeA.SX === 0 ? "♂ Male" : "♀ Female";
    },
    parentBSex() {
      if (!this.genomeB) return "";
      return this.genomeB.SX === 0 ? "♂ Male" : "♀ Female";
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
      this.genomeA     = null;
      this.genomeB     = null;
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
        // Store parent genomes for sex display before attempting breed
        this.genomeA = resA.genome;
        this.genomeB = resB.genome;

        const { child, mutated, speciated } = breedGenomes(resA.genome, resB.genome);
        this.childGenome = child;
        this.childName   = generateFullName(child);
        this.childArt    = buildUnicodeArt(child, 0);
        this.customTitle = `🧬 ${this.childName} (Offspring)`;
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
        this.breedInfo,
        this.customTitle,
        (response) => {
          this.publishing = false;
          if (response.success) {
            this.$emit("notify", "🧬 " + this.childName + " published to the blockchain!", "success");
            // Reset form
            this.urlA        = "";
            this.urlB        = "";
            this.genomeA     = null;
            this.genomeB     = null;
            this.childGenome = null;
            this.childArt    = null;
            this.breedInfo   = null;
            this.customTitle = "";
          } else {
            this.$emit("notify", "Publish failed: " + (response.message || "Unknown error"), "error");
          }
        }
      );
    }
  },
  template: `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #333;">
      <h3 style="color:#80deea;margin:0 0 4px;">🧬 Breed Creatures</h3>
      <p style="font-size:12px;color:#555;margin:0 0 12px;">Requires one ♂ Male and one ♀ Female of the same genus.</p>

      <div style="display:flex;flex-direction:column;gap:8px;max-width:520px;margin:0 auto;">
        <!-- Parent A -->
        <div style="position:relative;">
          <input
            v-model="urlA"
            type="text"
            placeholder="Parent A — Steem post URL"
            style="font-size:13px;width:100%;padding-right:70px;"
          />
          <span
            v-if="genomeA"
            :style="{
              position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
              fontSize:'12px', fontWeight:'bold',
              color: genomeA.SX === 0 ? '#90caf9' : '#f48fb1',
              pointerEvents:'none'
            }"
          >{{ parentASex }}</span>
        </div>
        <!-- Parent B -->
        <div style="position:relative;">
          <input
            v-model="urlB"
            type="text"
            placeholder="Parent B — Steem post URL"
            style="font-size:13px;width:100%;padding-right:70px;"
          />
          <span
            v-if="genomeB"
            :style="{
              position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
              fontSize:'12px', fontWeight:'bold',
              color: genomeB.SX === 0 ? '#90caf9' : '#f48fb1',
              pointerEvents:'none'
            }"
          >{{ parentBSex }}</span>
        </div>
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

        <!-- Post title — pre-filled, user-editable -->
        <div style="margin-top:12px;max-width:520px;margin-left:auto;margin-right:auto;">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px;">Post title</label>
          <input
            v-model="customTitle"
            type="text"
            maxlength="255"
            style="width:100%;font-size:13px;"
          />
        </div>

        <button
          @click="publishChild"
          :disabled="publishing || !username"
          style="background:#1565c0;margin-top:10px;"
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
