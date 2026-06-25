// ============================================================
//  Portfolio scripts — kept intentionally small.
//    1. Reveal sections as they scroll into view
//    2. Mobile menu toggle
//    3. Auto-update footer year
// ============================================================

// ---------- 1. Reveal on scroll ----------
const revealEls = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target); // animate once, then stop watching
      }
    });
  },
  { threshold: 0.12 }
);

revealEls.forEach((el) => observer.observe(el));

// ---------- 2. Mobile menu ----------
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

toggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

// Close the menu after tapping a link
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
});

// ---------- 3. Theme toggle ----------
(function () {
  const root = document.documentElement;
  const btn = document.querySelector(".theme-toggle");

  function syncLabel() {
    const isDark = root.getAttribute("data-theme") === "dark";
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  syncLabel(); // the saved theme was already applied by the inline <head> script

  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* storage unavailable — choice just won't persist across reloads */
    }
    syncLabel();
  });
})();

// ---------- 4. Footer year ----------
document.getElementById("year").textContent = new Date().getFullYear();

// ---------- 5. Profile stats ----------
// On Vercel, the live source is /api/stats (set your handles in api/stats.js).
// The values below are only the fallback used if that function is unreachable.
const STATS = {
  github: { handle: "shivnshshrma" },
  codeforces: { handle: "shivnshshrma" },
  atcoder: { handle: "shivanshshrma", rating: 0, contests: 0 },
};

// Helper: write a value into a card, e.g. set("github", "repos", 24)
function set(platform, stat, value) {
  const el = document.querySelector(
    `[data-platform="${platform}"] [data-stat="${stat}"]`
  );
  if (el && value !== undefined && value !== null) el.textContent = value;
}

// Update the profile link + visible handle for each card
function applyHandles(handles) {
  const links = {
    github: (h) => `https://github.com/${h}`,
    codeforces: (h) => `https://codeforces.com/profile/${h}`,
    atcoder: (h) => `https://atcoder.jp/users/${h}`,
  };
  Object.entries(handles).forEach(([platform, handle]) => {
    if (!handle || handle === "your-handle") return;
    set(platform, "handle", handle);
    const card = document.querySelector(`[data-platform="${platform}"]`);
    if (card) card.href = links[platform](handle);
  });
}

// AtCoder rating colour tier (computed, since there's no public API)
function atcoderTier(r) {
  if (r >= 2800) return "Red";
  if (r >= 2400) return "Orange";
  if (r >= 2000) return "Yellow";
  if (r >= 1600) return "Blue";
  if (r >= 1200) return "Cyan";
  if (r >= 800) return "Green";
  if (r >= 400) return "Brown";
  return "Gray";
}

async function loadGitHub(handle) {
  const res = await fetch(`https://api.github.com/users/${handle}`);
  if (!res.ok) throw new Error("github");
  const d = await res.json();
  set("github", "repos", d.public_repos);
  // best-effort PR count (unauthenticated search is rate-limited; stars need a token)
  try {
    const pr = await fetch(`https://api.github.com/search/issues?q=type:pr+author:${handle}`);
    if (pr.ok) set("github", "prs", (await pr.json()).total_count);
  } catch (_) {}
}

async function loadCodeforces(handle) {
  const res = await fetch(
    `https://codeforces.com/api/user.info?handles=${handle}`
  );
  if (!res.ok) throw new Error("codeforces");
  const { result } = await res.json();
  const u = result[0];
  set("codeforces", "rating", u.rating ?? "unrated");
  set("codeforces", "max", u.maxRating ?? "—");
  if (u.rank) set("codeforces", "rank", u.rank.replace(/\b\w/g, (c) => c.toUpperCase()));
}

function loadAtCoder(cfg) {
  set("atcoder", "rating", cfg.rating);
  if (cfg.contests != null) set("atcoder", "contests", cfg.contests);
  set("atcoder", "tier", atcoderTier(cfg.rating));
}

// Write whatever fields are present in a stats payload into the cards.
function applyStats(data) {
  if (data.handles) applyHandles(data.handles);

  const g = data.github || {};
  if (g.prs != null) set("github", "prs", g.prs);
  if (g.repos != null) set("github", "repos", g.repos);
  if (g.stars != null) set("github", "stars", g.stars);

  const c = data.codeforces || {};
  if (c.rating != null) {
    set("codeforces", "rating", c.rating);
    set("codeforces", "max", c.max);
    if (c.rank) set("codeforces", "rank", c.rank);
  }

  const a = data.atcoder || {};
  if (a.rating != null) {
    set("atcoder", "rating", a.rating);
    set("atcoder", "tier", atcoderTier(a.rating));
  }
  if (a.contests != null) set("atcoder", "contests", a.contests);
}

function hasAnyValue(d) {
  return [d.github?.prs, d.github?.repos, d.codeforces?.rating, d.atcoder?.rating]
    .some((v) => v != null);
}

// Try a JSON endpoint; returns true only if it had real values.
async function tryLoad(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    applyStats(data);
    return hasAnyValue(data);
  } catch (_) {
    return false;
  }
}

// Load order:
//   1. /api/stats        — live Vercel function (all platforms, incl. AtCoder + PRs)
//   2. data/stats.json   — prebuilt file (offline / static hosting)
//   3. browser fetches   — GitHub + Codeforces live; AtCoder from manual STATS
async function initStats() {
  if (await tryLoad("/api/stats")) return;
  if (await tryLoad("data/stats.json")) return;

  const handles = {
    github: STATS.github.handle,
    codeforces: STATS.codeforces.handle,
    atcoder: STATS.atcoder.handle,
  };
  applyHandles(handles);
  if (handles.github !== "your-handle") loadGitHub(handles.github).catch(() => {});
  if (handles.codeforces !== "your-handle") loadCodeforces(handles.codeforces).catch(() => {});
  loadAtCoder(STATS.atcoder);
}

initStats();
