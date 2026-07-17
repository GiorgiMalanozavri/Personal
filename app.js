/* =====================================================================
   config / helpers
   ===================================================================== */
const CFG = window.SITE_CONFIG || {};
const SB_ON = Boolean(CFG.supabaseUrl && CFG.supabaseKey);
const SB_URL = (CFG.supabaseUrl || "").replace(/\/$/, "");

function sbHeaders() {
  return {
    "apikey": CFG.supabaseKey,
    "Authorization": "Bearer " + CFG.supabaseKey,
    "Content-Type": "application/json",
  };
}
function parseScore(t) {
  t = (t || "").trim();
  if (t.endsWith("k")) return Math.round(parseFloat(t) * 1000);
  return parseInt(t, 10) || 0;
}
function fmtScore(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* the box is a troll: whatever a visitor types, one of these posts instead */
const MEME_COMMENTS = [
  "brochacho really did that and made it look easy 🗿 aura +1000",
  "chat is this real?? he's literally him 😭",
  "chill bro you're making the rest of us look bad 💀",
  "chef's kiss no notes. he's cooking again 👨‍🍳",
  "chat we found the final boss 🫡",
  "no cap this is peak. certified hood classic 🔥",
  "bro is built different fr fr, mogging everyone in the thread",
  "the aura is unmatched, someone tell the recruiters 📈",
  "W builder. take my energy 🚀",
  "sheeeesh 🤯 he ate and left zero crumbs",
  "casually goated with the sauce, we love to see it 🐐",
  "how is one guy this cracked?? unfair honestly 😩",
  "he's not real he's not real he's not- 😭🙏",
  "sigma behavior, respect the grind 🫡",
  "bro said 'skill issue' to the entire industry 💀🔥",
];
const MEME_USERS = [
  "brochacho_supreme", "aura_farmer_9000", "sigma_grindset", "rizzler3000",
  "certified_yapper", "npc_no_more", "gigachad_dev", "unbothered_moist",
  "based_dept", "cooked_intern", "final_boss_fan", "glaze_lord",
];
const MEME_EMOJI = ["🗿", "🔥", "💀", "😭", "🫡", "📈", "🐐", "🤯", "🙏", "👨‍🍳"];
function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.round(hrs / 24) + "d ago";
}

/* =====================================================================
   votes  (persistent + consistent)

   Displayed score = seed base (from the HTML) + shared delta.
   - shared delta: everyone's votes, stored in Supabase (or localStorage
     in local mode). Already includes this visitor's past votes, so it is
     NOT added a second time.
   - myState (-1 / 0 / 1): this browser's own arrow, remembered in
     localStorage so highlight + toggle stay consistent across reloads.
   ===================================================================== */
async function fetchDeltas() {
  if (!SB_ON) return {};
  try {
    const res = await fetch(SB_URL + "/rest/v1/votes?select=item_id,delta", { headers: sbHeaders() });
    if (!res.ok) throw new Error();
    const rows = await res.json();
    const map = {};
    rows.forEach((r) => { map[r.item_id] = r.delta; });
    return map;
  } catch (e) {
    return {};
  }
}
async function bumpVote(itemId, amount) {
  if (SB_ON) {
    const res = await fetch(SB_URL + "/rest/v1/rpc/bump_vote", {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({ item: itemId, amount }),
    });
    if (!res.ok) throw new Error("vote failed");
    return await res.json(); // new delta (int)
  }
  const k = "vd:" + itemId;
  const v = (parseInt(localStorage.getItem(k) || "0", 10) || 0) + amount;
  localStorage.setItem(k, String(v));
  return v;
}

function bindVote(up, down, scoreEl, itemId, base, deltas) {
  if (!up || !down || !scoreEl) return;
  let myState = parseInt(localStorage.getItem("vs:" + itemId) || "0", 10) || 0;
  let delta = SB_ON
    ? (deltas[itemId] || 0)
    : (parseInt(localStorage.getItem("vd:" + itemId) || "0", 10) || 0);

  function paint() {
    scoreEl.textContent = fmtScore(base + delta);
    up.classList.toggle("active", myState === 1);
    down.classList.toggle("active", myState === -1);
  }
  paint();

  async function apply(target) {
    const newState = myState === target ? 0 : target;
    const amount = newState - myState;
    if (!amount) return;
    myState = newState;
    localStorage.setItem("vs:" + itemId, String(myState));
    delta += amount;          // optimistic
    paint();
    try {
      const server = await bumpVote(itemId, amount);
      if (typeof server === "number") { delta = server; paint(); }
    } catch (e) { /* keep optimistic value */ }
  }
  up.addEventListener("click", () => apply(1));
  down.addEventListener("click", () => apply(-1));
}

/* =====================================================================
   ownership  (which comments THIS browser posted, + delete tokens)
   ===================================================================== */
function newToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
function getMine() { return JSON.parse(localStorage.getItem("myComments") || "{}"); }
function setMine(m) { localStorage.setItem("myComments", JSON.stringify(m)); }
function markMine(id, token) { const m = getMine(); m[id] = token || "local"; setMine(m); }
function unmarkMine(id) { const m = getMine(); delete m[id]; setMine(m); }
function isMine(id) { return Object.prototype.hasOwnProperty.call(getMine(), id); }
function tokenFor(id) { return getMine()[id]; }

/* =====================================================================
   comments storage
   ===================================================================== */
async function loadComments(postId) {
  if (SB_ON) {
    const url = SB_URL + "/rest/v1/comments?post_id=eq." + encodeURIComponent(postId) +
      "&order=created_at.asc&select=id,name,body,created_at";
    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) throw new Error("load failed");
    return res.json();
  }
  return JSON.parse(localStorage.getItem("comments:" + postId) || "[]");
}
async function saveComment(postId, name, body) {
  const token = newToken();
  if (SB_ON) {
    const res = await fetch(SB_URL + "/rest/v1/comments", {
      method: "POST",
      headers: { ...sbHeaders(), "Prefer": "return=representation" },
      body: JSON.stringify({ post_id: postId, name, body, delete_token: token }),
    });
    if (!res.ok) throw new Error("save failed");
    const rows = await res.json();
    return { ...rows[0], _token: token };
  }
  const row = {
    id: "local:" + Date.now() + ":" + Math.random().toString(36).slice(2, 8),
    name, body, created_at: new Date().toISOString(),
  };
  const key = "comments:" + postId;
  const all = JSON.parse(localStorage.getItem(key) || "[]");
  all.push(row);
  localStorage.setItem(key, JSON.stringify(all));
  return { ...row, _token: "local" };
}
async function deleteComment(postId, id) {
  const token = tokenFor(id);
  if (SB_ON) {
    const res = await fetch(SB_URL + "/rest/v1/rpc/delete_comment", {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({ cid: id, token }),
    });
    if (!res.ok) throw new Error("delete failed");
  } else {
    const key = "comments:" + postId;
    const all = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.id !== id);
    localStorage.setItem(key, JSON.stringify(all));
  }
  unmarkMine(id);
}

// build + insert a visitor comment, and wire its (persistent) votes
function addVisitorComment(container, row, deltas, postId) {
  const mine = isMine(row.id);
  const el = document.createElement("div");
  el.className = "comment";
  el.innerHTML =
    '<div class="c-avatar">' + pick(MEME_EMOJI) + "</div>" +
    '<div class="c-main">' +
      '<div class="c-meta"><span class="c-user">u/' + escapeHtml(row.name) + "</span>" +
      "<span>· " + timeAgo(row.created_at) + "</span></div>" +
      '<p class="c-text">' + escapeHtml(row.body) + "</p>" +
      '<div class="c-actions"><span class="cv up">▲</span>' +
      '<span class="c-score">1</span><span class="cv down">▼</span>' +
      '<span class="c-reply">Reply</span>' +
      (mine ? '<span class="c-del">Delete</span>' : "") +
    "</div>" +
    "</div>";
  container.appendChild(el);
  const a = el.querySelector(".c-actions");
  bindVote(a.querySelector(".cv.up"), a.querySelector(".cv.down"),
    a.querySelector(".c-score"), "c:" + row.id, 1, deltas);

  if (mine) {
    const del = el.querySelector(".c-del");
    del.addEventListener("click", async () => {
      del.textContent = "deleting…";
      try {
        await deleteComment(postId, row.id);
        el.remove();
      } catch (e) {
        del.textContent = "Delete";
      }
    });
  }
}

/* =====================================================================
   controls that must never wait on the network (toggles, follow)
   ===================================================================== */
function wireControls() {
  // comment thread toggles
  document.querySelectorAll(".act-comments").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".post-body").querySelector(".comments");
      if (section) section.classList.toggle("open");
    });
  });

  // follow toggle
  document.querySelectorAll("[data-join]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const joined = btn.textContent.trim() === "Following";
      btn.textContent = joined ? "Follow" : "Following";
      btn.classList.toggle("left", joined);
    });
  });
}

/* =====================================================================
   init
   ===================================================================== */
async function init() {
  let deltas = {};
  try { deltas = await fetchDeltas(); } catch (e) { deltas = {}; }

  // post votes
  document.querySelectorAll(".post[data-post-id]").forEach((post) => {
    const id = post.getAttribute("data-post-id");
    const box = post.querySelector(".votes");
    if (box) {
      bindVote(box.querySelector(".up"), box.querySelector(".down"),
        box.querySelector(".score"), "p:" + id, parseScore(box.querySelector(".score").textContent), deltas);
    }
  });

  // seeded comment votes (stable id by post + order)
  document.querySelectorAll(".post[data-post-id]").forEach((post) => {
    const id = post.getAttribute("data-post-id");
    let i = 0;
    post.querySelectorAll(".comments .c-actions").forEach((a) => {
      if (a.closest(".live-comments")) return; // skip visitor comments
      const up = a.querySelector(".cv.up");
      const down = a.querySelector(".cv.down");
      const score = a.querySelector(".c-score");
      bindVote(up, down, score, "s:" + id + ":" + i, parseScore(score.textContent), deltas);
      i++;
    });
  });

  // reply forms + visitor comments
  document.querySelectorAll(".post[data-post-id]").forEach((post) => {
    const postId = post.getAttribute("data-post-id");
    const section = post.querySelector(".comments");
    if (!section) return;

    const live = document.createElement("div");
    live.className = "live-comments";
    section.insertBefore(live, section.firstChild);

    const form = document.createElement("form");
    form.className = "reply-form";
    form.innerHTML =
      '<input class="reply-name" type="text" placeholder="username" maxlength="30" required />' +
      '<textarea class="reply-text" placeholder="add a comment…" maxlength="500" required></textarea>' +
      '<div class="reply-row"><button type="submit" class="reply-submit">Comment</button>' +
      '<span class="reply-status"></span></div>';
    section.insertBefore(form, live);

    const status = form.querySelector(".reply-status");

    loadComments(postId)
      .then((rows) => rows.forEach((r) => addVisitorComment(live, r, deltas, postId)))
      .catch(() => { status.textContent = "couldn't load comments"; });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const typed = form.querySelector(".reply-text").value.trim();
      if (!typed) return; // they still have to type *something*
      // ...but whatever they wrote, a random meme gets posted instead 😌
      const name = form.querySelector(".reply-name").value.trim() || pick(MEME_USERS);
      const body = pick(MEME_COMMENTS);
      const btn = form.querySelector(".reply-submit");
      btn.disabled = true;
      status.textContent = "posting…";
      try {
        const row = await saveComment(postId, name, body);
        markMine(row.id, row._token);
        addVisitorComment(live, row, deltas, postId);
        form.querySelector(".reply-text").value = "";
        status.textContent = SB_ON ? "posted!" : "saved (only visible in your browser)";
      } catch (err) {
        status.textContent = "something went wrong, try again";
      } finally {
        btn.disabled = false;
        setTimeout(() => { status.textContent = ""; }, 4000);
      }
    });
  });
}

wireControls();
init();
