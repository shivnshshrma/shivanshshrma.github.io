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
const GH_HANDLE = "shivnshshrma";
const CF_HANDLE = "shivnshshrma";
const AC_HANDLE = "shivanshshrma";

// --- Helper: write into CP cards (Codeforces / AtCoder) ---
function set(platform, stat, value) {
  const el = document.querySelector(
    `[data-platform="${platform}"] [data-stat="${stat}"]`
  );
  if (el && value !== undefined && value !== null) el.textContent = value;
}

// --- GitHub dashboard ---
function setGH(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = value;
}

async function loadGitHubDashboard(handle) {
  const headers = { "User-Agent": "portfolio-stats", Accept: "application/vnd.github+json" };

  // Fetch user info, PRs, merged PRs, repos (for stars) in parallel
  const [userRes, prRes, mergedRes, reposRes] = await Promise.allSettled([
    fetch(`https://api.github.com/users/${handle}`, { headers }),
    fetch(`https://api.github.com/search/issues?q=type:pr+author:${handle}`, { headers }),
    fetch(`https://api.github.com/search/issues?q=type:pr+author:${handle}+is:merged`, { headers }),
    fetch(`https://api.github.com/users/${handle}/repos?per_page=100&type=owner`, { headers }),
  ]);

  // User info → repos, followers
  if (userRes.status === "fulfilled" && userRes.value.ok) {
    const u = await userRes.value.json();
    setGH("gh-repos", u.public_repos);
    setGH("gh-followers", u.followers);
  }

  // PRs
  if (prRes.status === "fulfilled" && prRes.value.ok) {
    const d = await prRes.value.json();
    setGH("gh-prs", d.total_count);
  }

  // Merged PRs
  if (mergedRes.status === "fulfilled" && mergedRes.value.ok) {
    const d = await mergedRes.value.json();
    setGH("gh-merged", d.total_count);
  }

  // Stars (sum from repos)
  if (reposRes.status === "fulfilled" && reposRes.value.ok) {
    const repos = await reposRes.value.json();
    if (Array.isArray(repos)) {
      const stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
      setGH("gh-stars", stars);
    }
  }
}

// --- GitHub Recent Activity ---
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function describeEvent(ev) {
  const repo = ev.repo?.name?.split("/").pop() || ev.repo?.name || "";
  switch (ev.type) {
    case "PushEvent": {
      const n = ev.payload?.commits?.length || 0;
      return `Pushed <strong>${n} commit${n !== 1 ? "s" : ""}</strong> in ${repo}`;
    }
    case "PullRequestEvent":
      return `${ev.payload?.action === "opened" ? "Created" : "Updated"} <strong>pull request</strong> in ${repo}`;
    case "CreateEvent":
      return `Created <strong>${ev.payload?.ref_type || "repo"}</strong>${ev.payload?.ref ? " " + ev.payload.ref : ""} in ${repo}`;
    case "IssuesEvent":
      return `${ev.payload?.action} <strong>issue</strong> in ${repo}`;
    case "WatchEvent":
      return `Starred <strong>${repo}</strong>`;
    case "ForkEvent":
      return `Forked <strong>${repo}</strong>`;
    case "DeleteEvent":
      return `Deleted <strong>${ev.payload?.ref_type}</strong> ${ev.payload?.ref || ""} in ${repo}`;
    case "IssueCommentEvent":
      return `Commented on <strong>issue</strong> in ${repo}`;
    case "PullRequestReviewEvent":
      return `Reviewed <strong>pull request</strong> in ${repo}`;
    default:
      return `${ev.type.replace("Event", "")} in <strong>${repo}</strong>`;
  }
}

async function loadGitHubActivity(handle) {
  const list = document.getElementById("gh-activity-list");
  if (!list) return;
  try {
    const res = await fetch(`https://api.github.com/users/${handle}/events/public?per_page=5`, {
      headers: { "User-Agent": "portfolio-stats" },
    });
    if (!res.ok) throw new Error("events");
    const events = await res.json();
    if (!events.length) {
      list.innerHTML = '<p class="gh-activity-loading">No recent activity.</p>';
      return;
    }
    list.innerHTML = events
      .map(
        (ev) => `
      <div class="gh-event">
        <span class="gh-event-dot"></span>
        <div class="gh-event-body">
          <p class="gh-event-text">${describeEvent(ev)}</p>
          <p class="gh-event-time">${timeAgo(ev.created_at)}</p>
        </div>
      </div>`
      )
      .join("");
  } catch (_) {
    list.innerHTML = '<p class="gh-activity-loading">Could not load activity.</p>';
  }
}

// --- Apply pre-fetched stats from data/stats.json or /api/stats ---
function applyStats(data) {
  const g = data.github || {};
  if (g.repos != null) setGH("gh-repos", g.repos);
  if (g.stars != null) setGH("gh-stars", g.stars);
  if (g.prs != null) setGH("gh-prs", g.prs);
  if (g.merged != null) setGH("gh-merged", g.merged);
  if (g.followers != null) setGH("gh-followers", g.followers);
  if (g.contributions != null) setGH("gh-contributions", g.contributions);

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

// AtCoder rating colour tier
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

function hasAnyValue(d) {
  return [d.github?.prs, d.github?.repos, d.codeforces?.rating, d.atcoder?.rating]
    .some((v) => v != null);
}

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

// --- Codeforces live fetch ---
async function loadCodeforces(handle) {
  const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
  if (!res.ok) throw new Error("codeforces");
  const { result } = await res.json();
  const u = result[0];
  set("codeforces", "rating", u.rating ?? "unrated");
  set("codeforces", "max", u.maxRating ?? "—");
  if (u.rank) set("codeforces", "rank", u.rank.replace(/\b\w/g, (c) => c.toUpperCase()));
}

// --- AtCoder from pre-fetched data ---
function loadAtCoder(rating, contests) {
  set("atcoder", "rating", rating);
  if (contests != null) set("atcoder", "contests", contests);
  set("atcoder", "tier", atcoderTier(rating));
}

// --- Main init ---
async function initStats() {
  // Always load activity feed (it's independent)
  loadGitHubActivity(GH_HANDLE);

  // Try pre-fetched sources first
  if (await tryLoad("/api/stats")) return;
  if (await tryLoad("data/stats.json")) {
    // data/stats.json may not have merged PRs — supplement with live fetch
    loadGitHubDashboard(GH_HANDLE).catch(() => {});
    return;
  }

  // Fallback: live fetch everything
  loadGitHubDashboard(GH_HANDLE).catch(() => {});
  loadCodeforces(CF_HANDLE).catch(() => {});
  loadAtCoder(0, 0);
}

initStats();
