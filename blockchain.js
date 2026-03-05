// ============================================================
// blockchain.js
// Steem blockchain interactions — pure async helpers.
// Extended with SteemBiota creature publishing.
// No Vue, no DOM dependencies.
// ============================================================

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
function publishCreature(username, genome, unicodeArt, creatureName, age, lifecycleStage, callback) {
  const permlink = buildPermlink("steembiota-" + creatureName.toLowerCase());
  const title    = `❇ ${creatureName} (Founder)`;
  const sexLabel = genome.SX === 0 ? "Male" : "Female";

  const body =
    `## ❇ ${creatureName}\n\n` +
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
    `*Published via [SteemBiota — Immutable Evolution]*`;

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
function publishOffspring(username, genome, unicodeArt, creatureName, breedInfo, callback) {
  const permlink = buildPermlink("steembiota-offspring-" + creatureName.toLowerCase());
  const title    = `🧬 ${creatureName} (Offspring)`;
  const sexLabel = genome.SX === 0 ? "Male" : "Female";
  const pA = breedInfo.parentA;
  const pB = breedInfo.parentB;
  const pAUrl = `https://steemit.com/@${pA.author}/${pA.permlink}`;
  const pBUrl = `https://steemit.com/@${pB.author}/${pB.permlink}`;

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
    `*Bred via [SteemBiota — Immutable Evolution]*`;

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

// ---- Utility ----

function buildPermlink(title) {
  const slug = title
    .toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 241);
  return `${slug}-${Date.now()}`;
}

function steemDate(ts) {
  if (!ts) return new Date(NaN);
  if (typeof ts === "string" && !ts.endsWith("Z")) ts += "Z";
  return new Date(ts);
}
