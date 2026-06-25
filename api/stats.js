// ============================================================
//  GET /api/stats  — live profile stats (runs on Vercel, server-side)
//
//  Returns JSON the site reads on load. Because this runs on the
//  server, there are no CORS limits, so the AtCoder scraper works
//  and GitHub can return PRs / stars / contributions in one call.
//
//  Setup on Vercel:
//    1. Set your handles in HANDLES below.
//    2. (Recommended) Add an env var GITHUB_TOKEN — a GitHub personal
//       access token. A read-only / no-scope token is enough for public
//       data; it unlocks the GraphQL API (PRs, stars, contributions) and
//       higher rate limits. Without it, the function falls back to the
//       public REST API (still gets PRs, repos, stars — just rate-limited).
//
//  Responses are CDN-cached for an hour (see Cache-Control below).
// ============================================================

import { fetchUserInfo } from "@qatadaazzeh/atcoder-api";

const HANDLES = {
  github: "shivnshshrma",
  codeforces: "shivnshshrma",
  atcoder: "shivanshshrma",
};

const GH_HEADERS = {
  "User-Agent": "portfolio-stats",
  Accept: "application/vnd.github+json",
};

// --- GitHub via GraphQL (needs a token) — PRs, repos, stars, contributions ---
async function githubGraphQL(login, token) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        followers { totalCount }
        repos: repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
        pullRequests { totalCount }
        contributionsCollection { contributionCalendar { totalContributions } }
        topRepos: repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100,
          orderBy: { field: STARGAZERS, direction: DESC }) {
          nodes { stargazerCount }
        }
      }
    }`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...GH_HEADERS, Authorization: `bearer ${token}` },
    body: JSON.stringify({ query, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);

  const u = data.user;
  const stars = u.topRepos.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  return {
    prs: u.pullRequests.totalCount,
    repos: u.repos.totalCount,
    stars,
    followers: u.followers.totalCount,
    contributions: u.contributionsCollection.contributionCalendar.totalContributions,
  };
}

// --- GitHub via REST (no token) — PRs (search), repos, stars ---
async function githubRest(login) {
  const [userRes, prRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${login}`, { headers: GH_HEADERS }),
    fetch(`https://api.github.com/search/issues?q=type:pr+author:${login}`, { headers: GH_HEADERS }),
    fetch(`https://api.github.com/users/${login}/repos?per_page=100&type=owner`, { headers: GH_HEADERS }),
  ]);
  if (!userRes.ok) throw new Error(`GitHub ${userRes.status}`);
  const user = await userRes.json();
  const prs = prRes.ok ? (await prRes.json()).total_count : null;
  const repos = reposRes.ok ? await reposRes.json() : [];
  const stars = Array.isArray(repos)
    ? repos.reduce((s, r) => s + (r.stargazers_count || 0), 0)
    : null;
  return { prs, repos: user.public_repos, stars, followers: user.followers, contributions: null };
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
  // Confirmed fields from @qatadaazzeh/atcoder-api: userRating, userContests[].
  const u = await fetchUserInfo(handle);
  return {
    rating: u.userRating ?? null,
    contests: Array.isArray(u.userContests) ? u.userContests.length : null,
  };
}

export default async function handler(req, res) {
  const out = { updatedAt: new Date().toISOString(), handles: HANDLES };
  const token = process.env.GITHUB_TOKEN;

  await Promise.all([
    (async () => {
      try {
        out.github = token
          ? await githubGraphQL(HANDLES.github, token)
          : await githubRest(HANDLES.github);
      } catch (e) {
        out.github = { error: e.message };
      }
    })(),
    (async () => {
      try {
        out.codeforces = await codeforces(HANDLES.codeforces);
      } catch (e) {
        out.codeforces = { error: e.message };
      }
    })(),
    (async () => {
      try {
        out.atcoder = await atcoder(HANDLES.atcoder);
      } catch (e) {
        out.atcoder = { error: e.message };
      }
    })(),
  ]);

  // Cache at the edge for an hour; serve stale while refreshing in the background.
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json(out);
}
