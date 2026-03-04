// ----------------------
// CONFIG
// ----------------------

steem.api.setOptions({ url: 'https://api.steemit.com' });

let currentUser = null;
let currentGenome = null;

// ----------------------
// LOGIN
// ----------------------

function login() {
  const username = document.getElementById("username").value;
  if (!username) return alert("Enter username");

  if (!window.steem_keychain) {
    return alert("Install Steem Keychain extension.");
  }

  currentUser = username;
  alert("Logged in as " + username);
}

// ----------------------
// GENOME GENERATION
// ----------------------

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function generateGenome() {
  return {
    GEN: randomInt(1000),
    SX: randomInt(2), // 0 male, 1 female
    MOR: randomInt(9999),
    APP: randomInt(9999),
    ORN: randomInt(9999),
    CLR: randomInt(360),
    LIF: 80 + randomInt(80),
    FRT_START: 20,
    FRT_END: 60
  };
}

// ----------------------
// CANVAS RENDER
// ----------------------

function renderCanvas(genome) {
  const canvas = document.getElementById("creatureCanvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 300, 300);

  const baseHue = (genome.GEN * 137.508) % 360;
  const hue = (baseHue + genome.CLR) % 360;

  ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
  ctx.strokeStyle = `hsl(${hue}, 70%, 30%)`;
  ctx.lineWidth = 3;

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

// ----------------------
// UNICODE RENDER
// ----------------------

function renderUnicode(genome) {
  const rune = ["✶", "▲", "▣", "⊕", "☼", "✜", "⟁", "❂"][genome.GEN % 8];

  let grid = "";

  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 25; x++) {
      const dx = x - 12;
      const dy = y - 7;
      const body = (dx*dx)/60 + (dy*dy)/20 < 1;

      if (body) {
        if (y === 6 && (x === 9 || x === 15)) {
          grid += "◉";
        } else {
          grid += rune;
        }
      } else {
        grid += " ";
      }
    }
    grid += "\n";
  }

  document.getElementById("unicodeRender").textContent = grid;
  return grid;
}

// ----------------------
// CREATE FOUNDER
// ----------------------

function createFounder() {
  currentGenome = generateGenome();
  renderCanvas(currentGenome);
  renderUnicode(currentGenome);
}

// ----------------------
// PUBLISH TO STEEM
// ----------------------

function publishCreature() {
  if (!currentUser) return alert("Login first.");
  if (!currentGenome) return alert("Create creature first.");

  const permlink = "steembiota-" + Date.now();

  const title = "SteemBiota Founder Creature";
  const body = document.getElementById("unicodeRender").textContent;

  const jsonMetadata = {
    steembiota: {
      version: "1.0",
      genome: currentGenome,
      type: "founder"
    }
  };

  window.steem_keychain.requestPost(
    currentUser,
    title,
    body,
    permlink,
    "",
    JSON.stringify(jsonMetadata),
    function(response) {
      if (response.success) {
        alert("Creature published!");
      } else {
        alert("Error publishing.");
      }
    }
  );
}
