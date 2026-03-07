// ============================================================
// blockchain.js
// Steem blockchain interactions — pure async helpers.
// Extended with SteemBiota creature publishing.
// No Vue, no DOM dependencies.
// ============================================================

// ---- SteemBiota app URL (used in post bodies to link back to creature pages) ----
const APP_URL = "https://puncakbukit.github.io/steembiota";

// ---- RPC nodes & fallback ----

const RPC_NODES = [
  "https://api.steemit.com",
  "https://api.justyy.com",
  "https://steemd.steemworld.org",
  "https://api.steem.fans"
];

let currentRPCIndex = 0;

function setRPC(index) {
  currentRPCIndex = index;
  steem.api.setOptions({ url: RPC_NODES[index] });
  console.log("Switched RPC to:", RPC_NODES[index]);
}

// Safe API wrapper with automatic RPC fallback on error.
function callWithFallback(apiCall, args, callback, attempt = 0) {
  apiCall(...args, (err, result) => {
    if (!err) return callback(null, result);
    console.warn("RPC error on", RPC_NODES[currentRPCIndex], err);
    const nextIndex = currentRPCIndex + 1;
    if (nextIndex >= RPC_NODES.length) return callback(err, null);
    setRPC(nextIndex);
    callWithFallback(apiCall, args, callback, attempt + 1);
  });
}

// Promise wrapper around callWithFallback.
function callWithFallbackAsync(apiCall, args) {
  return new Promise((resolve, reject) => {
    callWithFallback(apiCall, args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ---- Account helpers ----

// Fetch a single Steem account and extract its profile metadata.
function fetchAccount(username) {
  return new Promise(resolve => {
    if (!username) return resolve(null);
    steem.api.getAccounts([username], (err, result) => {
      if (err || !result || !result.length) return resolve(null);
      const account = result[0];
      let profile = {};
      try {
        profile = JSON.parse(
          account.posting_json_metadata || account.json_metadata
        ).profile || {};
      } catch {}
      resolve({
        username:     account.name,
        profileImage: profile.profile_image || "",
        displayName:  profile.name || account.name,
        about:        profile.about || "",
        coverImage:   profile.cover_image || ""
      });
    });
  });
}

// ---- Post / comment helpers ----

function fetchPost(author, permlink) {
  return callWithFallbackAsync(steem.api.getContent, [author, permlink]);
}

function fetchReplies(author, permlink) {
  return callWithFallbackAsync(steem.api.getContentReplies, [author, permlink]);
}

function fetchAllReplies(author, permlink) {
  return new Promise(resolve => {
    const collected = [];
    function recurse(author, permlink, done) {
      callWithFallback(
        steem.api.getContentReplies,
        [author, permlink],
        (err, replies) => {
          if (err || !replies || replies.length === 0) return done();
          let pending = replies.length;
          replies.forEach(reply => {
            collected.push(reply);
            recurse(reply.author, reply.permlink, () => {
              if (--pending === 0) done();
            });
          });
        }
      );
    }
    recurse(author, permlink, () => resolve(collected));
  });
}

function fetchPostsByTag(tag, limit = 20) {
  return callWithFallbackAsync(
    steem.api.getDiscussionsByCreated,
    [{ tag, limit }]
  );
}

function fetchPostsByUser(username, limit = 50) {
  return callWithFallbackAsync(
    steem.api.getDiscussionsByBlog,
    [{ tag: username, limit }]
  );
}

// ---- Keychain helpers ----

function keychainPost(
  username, title, body,
  parentPermlink, parentAuthor,
  jsonMetadata, permlink, tags,
  callback
) {
  const meta = typeof jsonMetadata === "string"
    ? JSON.parse(jsonMetadata)
    : { ...jsonMetadata };
  if (tags && tags.length) meta.tags = tags;

  steem_keychain.requestPost(
    username, title, body,
    parentPermlink, parentAuthor,
    JSON.stringify(meta),
    permlink, "",
    callback
  );
}

// Request a Keychain signature to verify account ownership (login).
function keychainLogin(username, callback) {
  steem_keychain.requestSignBuffer(
    username,
    "Login to SteemBiota",
    "Posting",
    callback
  );
}

// ---- SteemBiota — publish a creature to the blockchain ----
//
// genome          : object produced by generateGenome()
// unicodeArt      : string produced by buildUnicodeArt()
// creatureName    : string produced by generateFullName()
// age             : number — days since creation (calculateAge)
// lifecycleStage  : string — "Juvenile" | "Fertile Adult" | "Elder" | "Fossil"
// callback        : (response) => { response.success, response.message }
function publishCreature(username, genome, unicodeArt, creatureName, age, lifecycleStage, title, callback) {
  const permlink = buildPermlink(title);
  const sexLabel = genome.SX === 0 ? "Male" : "Female";

  const creaturePageUrl = `${APP_URL}/#/@${username}/${permlink}`;

  const body =
    `## 🧬 ${creatureName}\n\n` +
    `**Sex:** ${sexLabel}  \n` +
    `**Age:** ${age} day${age === 1 ? "" : "s"}  \n` +
    `**Status:** ${lifecycleStage}  \n` +
    `**Genus ID:** ${genome.GEN}  \n` +
    `**Hue:** ${genome.CLR}°  \n` +
    `**Lifespan:** ${genome.LIF} days  \n` +
    `**Fertile:** Day ${genome.FRT_START}–${genome.FRT_END}  \n` +
    `**Mutation:** MUT ${genome.MUT}  \n\n` +
    `\`\`\`\n${unicodeArt}\n\`\`\`\n\n` +
    `\`\`\`genome\n${JSON.stringify(genome, null, 2)}\n\`\`\`\n\n` +
    `---\n🔗 [View on SteemBiota](${creaturePageUrl})\n\n` +
    `*Published via [SteemBiota — Immutable Evolution](${APP_URL})*`;

  const jsonMetadata = {
    app: "steembiota/1.0",
    tags: ["steembiota", "gaming", "evolution"],
    steembiota: {
      version: "1.0",
      genome,
      name: creatureName,
      age,
      lifecycleStage,
      type: "founder"
    }
  };

  keychainPost(
    username, title, body,
    "steembiota", "",
    jsonMetadata, permlink,
    ["steembiota", "gaming", "evolution"],
    callback
  );
}

// ---- SteemBiota — publish a bred offspring to the blockchain ----
//
// breedInfo: { mutated, speciated, parentA: {author,permlink}, parentB: {author,permlink} }
function publishOffspring(username, genome, unicodeArt, creatureName, breedInfo, title, callback) {
  const permlink = buildPermlink(title);
  const sexLabel = genome.SX === 0 ? "Male" : "Female";
  const pA = breedInfo.parentA;
  const pB = breedInfo.parentB;
  const pAUrl = `https://steemit.com/@${pA.author}/${pA.permlink}`;
  const pBUrl = `https://steemit.com/@${pB.author}/${pB.permlink}`;

  const creaturePageUrl = `${APP_URL}/#/@${username}/${permlink}`;

  const mutLine = breedInfo.speciated
    ? "⚡ **Speciation** — new genus emerged!"
    : breedInfo.mutated
      ? "🧬 **Mutation** occurred during breeding"
      : "✔ Clean inheritance";

  const body =
    `## 🧬 ${creatureName}\n\n` +
    `**Sex:** ${sexLabel}  \n` +
    `**Age:** 0 days (newborn)  \n` +
    `**Genus ID:** ${genome.GEN}  \n` +
    `**Lifespan:** ${genome.LIF} days  \n` +
    `**Fertile:** Day ${genome.FRT_START}–${genome.FRT_END}  \n` +
    `**Mutation tendency:** ${genome.MUT}  \n\n` +
    `${mutLine}  \n\n` +
    `**Parents:**  \n` +
    `- Parent A: ${pAUrl}  \n` +
    `- Parent B: ${pBUrl}  \n\n` +
    `\`\`\`\n${unicodeArt}\n\`\`\`\n\n` +
    `\`\`\`genome\n${JSON.stringify(genome, null, 2)}\n\`\`\`\n\n` +
    `---\n🔗 [View on SteemBiota](${creaturePageUrl})\n\n` +
    `*Bred via [SteemBiota — Immutable Evolution](${APP_URL})*`;

  const jsonMetadata = {
    app: "steembiota/1.0",
    tags: ["steembiota", "gaming", "evolution", "breeding"],
    steembiota: {
      version: "1.0",
      genome,
      name: creatureName,
      age: 0,
      lifecycleStage: "Baby",
      type: "offspring",
      parentA: pA,
      parentB: pB,
      mutated:   breedInfo.mutated,
      speciated: breedInfo.speciated
    }
  };

  keychainPost(
    username, title, body,
    "steembiota", "",
    jsonMetadata, permlink,
    ["steembiota", "gaming", "evolution", "breeding"],
    callback
  );
}

// ---- SteemBiota — publish a feeding event as a reply ----
//
// creatureAuthor  : string — author of the creature post
// creaturePermlink: string — permlink of the creature post
// creatureName    : string — display name for the reply body
// foodType        : "nectar" | "fruit" | "crystal"
// callback        : (response) => { response.success, response.message }
function publishFeed(username, creatureAuthor, creaturePermlink, creatureName, foodType, callback) {
  const permlink = buildPermlink("steembiota-feed-" + creatureName.toLowerCase());

  const foodEmoji = { nectar: "🍯", fruit: "🍎", crystal: "💎" }[foodType] || "🍃";
  const foodLabel = { nectar: "Nectar", fruit: "Fruit", crystal: "Crystal" }[foodType] || foodType;

  const creaturePageUrl = `${APP_URL}/#/@${creatureAuthor}/${creaturePermlink}`;

  const body =
    `${foodEmoji} **Feeding Event** — ${foodLabel}\n\n` +
    `@${username} fed **${creatureName}** with ${foodLabel}.\n\n` +
    `\`\`\`\nSTEEMBIOTA_FEED\ncreature: @${creatureAuthor}/${creaturePermlink}\nfood: ${foodType}\nfeeder: ${username}\n\`\`\`\n\n` +
    `🔗 [View ${creatureName} on SteemBiota](${creaturePageUrl})\n\n` +
    `*Recorded via [SteemBiota — Immutable Evolution](${APP_URL})*`;

  const jsonMetadata = {
    app: "steembiota/1.0",
    tags: ["steembiota"],
    steembiota: {
      version: "1.0",
      type: "feed",
      creature: { author: creatureAuthor, permlink: creaturePermlink },
      feeder: username,
      food: foodType,
      ts: new Date().toISOString()
    }
  };

  keychainPost(
    username, "", body,
    creaturePermlink, creatureAuthor,
    jsonMetadata, permlink,
    ["steembiota"],
    callback
  );
}

// ---- SteemBiota — parse feeding events from a flat reply list ----
//
// replies        : array from fetchAllReplies()
// creatureAuthor : string — owner of the creature post
//
// Returns: { total, ownerFeeds, communityFeeds, byFeeder }
// — total      : number of valid (deduplicated) feed events (capped at 20)
// — ownerFeeds : count by the creature owner
// — communityFeeds : count by others
// — byFeeder   : Map<username, count> (used for per-day dedup and display)
//
// Anti-spam rules enforced here (read-side):
//   1. Only replies whose json_metadata.steembiota.type === "feed" are counted
//   2. Each (feeder, UTC-day) pair is counted at most once
//   3. Total cap: 20 feeds maximum
function parseFeedEvents(replies, creatureAuthor) {
  // Track (feeder + UTC-day) pairs already counted
  const seen      = new Set();
  const byFeeder  = {};
  let total       = 0;
  let ownerFeeds  = 0;
  let communityFeeds = 0;

  // Sort ascending by created so earlier feeds take priority under the cap
  const sorted = [...replies].sort((a, b) =>
    new Date(a.created) - new Date(b.created)
  );

  for (const reply of sorted) {
    if (total >= 20) break;

    let meta;
    try {
      meta = JSON.parse(reply.json_metadata || "{}");
    } catch { continue; }

    if (!meta.steembiota || meta.steembiota.type !== "feed") continue;

    const feeder  = reply.author;
    const created = reply.created;
    // UTC day string used as dedup key — e.g. "2025-07-04"
    const utcDay  = (typeof created === "string"
      ? new Date(created.endsWith("Z") ? created : created + "Z")
      : new Date(created)
    ).toISOString().slice(0, 10);

    const key = `${feeder}::${utcDay}`;
    if (seen.has(key)) continue;
    seen.add(key);

    byFeeder[feeder] = (byFeeder[feeder] || 0) + 1;
    total++;
    if (feeder === creatureAuthor) ownerFeeds++;
    else communityFeeds++;
  }

  return { total, ownerFeeds, communityFeeds, byFeeder };
}

// ---- Utility ----

// Build a Steem permlink from an arbitrary title string.
// Lowercases, replaces whitespace/punctuation with hyphens,
// strips non-ASCII, truncates the slug at 200 chars, then
// appends a millisecond timestamp so it is always unique.
function buildPermlink(title) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/, "")
    .slice(0, 200);                       // leave room for -<13-digit timestamp>
  return `${slug}-${Date.now()}`;
}

// Format a Date into a natural-language birth phrase.
// e.g. "born at noon on Tuesday, March 4, 2025"
//      "born at 7 in the morning on Monday, January 3, 2026"
function formatBirthTime(date) {
  if (!(date instanceof Date) || isNaN(date)) date = new Date();

  const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];

  const hour    = date.getUTCHours();
  const weekday = DAYS[date.getUTCDay()];
  const month   = MONTHS[date.getUTCMonth()];
  const day     = date.getUTCDate();
  const year    = date.getUTCFullYear();

  // Convert 0–23 UTC hour to a natural English time-of-day phrase
  const HOUR_PHRASES = [
    "midnight",             // 0
    "1 in the morning",     // 1
    "2 in the morning",     // 2
    "3 in the morning",     // 3
    "4 in the morning",     // 4
    "5 in the morning",     // 5
    "6 in the morning",     // 6
    "7 in the morning",     // 7
    "8 in the morning",     // 8
    "9 in the morning",     // 9
    "10 in the morning",    // 10
    "11 in the morning",    // 11
    "noon",                 // 12
    "1 in the afternoon",   // 13
    "2 in the afternoon",   // 14
    "3 in the afternoon",   // 15
    "4 in the afternoon",   // 16
    "5 in the afternoon",   // 17
    "6 in the evening",     // 18
    "7 in the evening",     // 19
    "8 in the evening",     // 20
    "9 at night",           // 21
    "10 at night",          // 22
    "11 at night",          // 23
  ];

  const timePhrase = HOUR_PHRASES[hour];
  return `born at ${timePhrase} UTC on ${weekday}, ${month} ${day}, ${year}`;
}

// Build the default post title for a creature.
// birthDate : Date object (defaults to now)
function buildDefaultTitle(creatureName, birthDate) {
  const born = formatBirthTime(birthDate instanceof Date ? birthDate : new Date());
  return `${creatureName} — ${born}`;
}

function steemDate(ts) {
  if (!ts) return new Date(NaN);
  if (typeof ts === "string" && !ts.endsWith("Z")) ts += "Z";
  return new Date(ts);
}
