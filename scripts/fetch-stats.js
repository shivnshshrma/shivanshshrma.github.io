// ============================================================
//  Refresh profile stats  ->  data/stats.json
//
//  Runs in Node (not the browser), so there are no CORS limits —
//  this is the only place the AtCoder scraper can work.
//
//  Setup once:   npm install
//  Refresh:      npm run refresh   (then commit data/stats.json + deploy)
//
//  Requires Node 18+ (for built-in fetch and top-level await).
// ============================================================

import { writeFile, mkdir } from "node:fs/promises";
import { fetchUserInfo } from "@qatadaazzeh/atcoder-api";

// ---- Put your handles here ----
const HANDLES = {
  github: "shivnshshrma",
  codeforces: "shivnshshrma",
  atcoder: "shivanshshrma",
};

async function github(handle) {
  const headers = { "User-Agent": "portfolio-stats", Accept: "application/vnd.github+json" };
  const [userRes, prRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${handle}`, { headers }),
    fetch(`https://api.github.com/search/issues?q=type:pr+author:${handle}`, { headers }),
    fetch(`https://api.github.com/users/${handle}/repos?per_page=100&type=owner`, { headers }),
  ]);
  if (!userRes.ok) throw new Error(`GitHub ${userRes.status}`);
  const user = await userRes.json();
  const prs = prRes.ok ? (await prRes.json()).total_count : null;
  const list = reposRes.ok ? await reposRes.json() : [];
  const stars = Array.isArray(list)
    ? list.reduce((s, r) => s + (r.stargazers_count || 0), 0)
    : null;
  return { prs, repos: user.public_repos, stars, followers: user.followers };
}

async function codeforces(handle) {
  const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
  if (!res.ok) throw new Error(`Codeforces ${res.status}`);
  const u = (await res.json()).result[0];
  return {
    rating: u.rating ?? null,
    max: u.maxRating ?? null,
    rank: u.rank ? u.rank.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
  };
}

async function atcoder(handle) {
  const u = await fetchUserInfo(handle);
  return {
    rating: u.userRating ?? null,
    contests: Array.isArray(u.userContests) ? u.userContests.length : null,
  };
}

// ---- Run each fetch independently; one failure won't block the rest ----
const out = { updatedAt: new Date().toISOString(), handles: HANDLES };

for (const [name, fn] of [
  ["github", github],
  ["codeforces", codeforces],
  ["atcoder", atcoder],
]) {
  try {
    out[name] = await fn(HANDLES[name]);
    console.log(`✓ ${name}`);
  } catch (err) {
    console.warn(`✗ ${name} skipped: ${err.message}`);
  }
}

await mkdir("data", { recursive: true });
await writeFile("data/stats.json", JSON.stringify(out, null, 2) + "\n");
console.log("Wrote data/stats.json");
