// --- vote buttons ---
function parseScore(t) {
  t = t.trim();
  if (t.endsWith("k")) return Math.round(parseFloat(t) * 1000);
  return parseInt(t, 10) || 0;
}
function fmtScore(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

document.querySelectorAll(".votes").forEach((box) => {
  const up = box.querySelector(".up");
  const down = box.querySelector(".down");
  const scoreEl = box.querySelector(".score");
  const base = parseScore(scoreEl.textContent);
  let state = 0; // -1, 0, 1

  function render() {
    scoreEl.textContent = fmtScore(base + state);
    up.classList.toggle("active", state === 1);
    down.classList.toggle("active", state === -1);
  }
  up.addEventListener("click", () => { state = state === 1 ? 0 : 1; render(); });
  down.addEventListener("click", () => { state = state === -1 ? 0 : -1; render(); });
});

// --- comment vote buttons ---
document.querySelectorAll(".c-actions").forEach((box) => {
  const up = box.querySelector(".cv.up");
  const down = box.querySelector(".cv.down");
  const scoreEl = box.querySelector(".c-score");
  if (!up || !down || !scoreEl) return;
  const base = parseScore(scoreEl.textContent);
  let state = 0;
  function render() {
    scoreEl.textContent = fmtScore(base + state);
    up.classList.toggle("active", state === 1);
    down.classList.toggle("active", state === -1);
  }
  up.addEventListener("click", () => { state = state === 1 ? 0 : 1; render(); });
  down.addEventListener("click", () => { state = state === -1 ? 0 : -1; render(); });
});

// --- toggle comment threads ---
document.querySelectorAll(".act-comments").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.closest(".post-body").querySelector(".comments");
    if (section) section.classList.toggle("open");
  });
});

// --- join / follow toggle ---
document.querySelectorAll("[data-join]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const joined = btn.textContent.trim() === "Following";
    btn.textContent = joined ? "Follow" : "Following";
    btn.classList.toggle("left", joined);
  });
});
