# Portfolio

A static portfolio site (HTML / CSS / JS, no build step) with a small Vercel
serverless function that pulls live stats from GitHub, Codeforces, and AtCoder.

```
.
├── index.html              # the page
├── styles.css              # all styling + light/dark theme tokens
├── script.js               # theme toggle, reveal animations, stats loader
├── api/stats.js            # Vercel function → GET /api/stats (live data)
├── data/stats.json         # offline fallback (optional, see below)
├── scripts/fetch-stats.js  # optional: write stats.json locally
├── package.json
└── .gitignore
```

## What you need to fill in

1. **Your name** — replace every `Your Name` in `index.html` (and the `<title>`).
2. **Email** — replace `hello@example.com` in the contact section.
3. **Profile links** — the `href="#"` placeholders (project links + socials).
4. **Handles** — set these in `api/stats.js` (the `HANDLES` object):

   ```js
   const HANDLES = {
     github: "your-github-username",
     codeforces: "your-cf-handle",
     atcoder: "your-atcoder-id",
   };
   ```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Go to vercel.com → **Add New → Project** → import the repo.
3. Framework preset: **Other** (it's a static site). No build command needed.
4. Click **Deploy**. Vercel serves the static files and turns `api/stats.js`
   into the endpoint `/api/stats` automatically — no extra config.

### Add a GitHub token (recommended)

The GitHub card shows **PRs, repos, and stars**. To fetch those in one request
(and avoid rate limits), the function uses GitHub's GraphQL API, which needs a
token:

1. github.com → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. No scopes are required for public data — read-only is enough. (A classic
   token with no scopes also works.)
3. In Vercel → your project → **Settings → Environment Variables**, add:
   - Name: `GITHUB_TOKEN`
   - Value: the token
   - Environments: Production (and Preview if you want)
4. **Redeploy** so the new variable is picked up.

Without the token it still works — it falls back to GitHub's public REST API and
shows the same numbers, just rate-limited.

## How the data loads

The site tries three sources in order, so it always renders:

1. `GET /api/stats` — live, on Vercel (all three platforms, incl. AtCoder).
2. `data/stats.json` — a prebuilt file, if present.
3. Browser fetches — GitHub + Codeforces live; AtCoder from the manual values
   in `script.js`.

Responses from the function are edge-cached for an hour.

## Optional: refresh stats into a file

If you ever host somewhere without serverless functions, you can generate the
fallback file locally:

```
npm install
npm run refresh   # sets handles in scripts/fetch-stats.js first
```

This writes `data/stats.json`. Commit it and the site will read it.

## Theme

Light is the default. The header toggle switches to dark and remembers the
choice. To make the toggle follow the visitor's system setting on first visit,
adjust the small script in the `<head>` of `index.html`.

## Notes

- AtCoder data comes from the unofficial `@qatadaazzeh/atcoder-api` scraper, so
  treat it as best-effort; a failed fetch just leaves that card on its fallback.
- The GitHub function also returns `followers` and `contributions` — swap either
  in for one of the displayed figures by changing the `data-stat` attribute on
  the GitHub card in `index.html`.
