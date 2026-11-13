#!/usr/bin/env node
// data/stats.json: stars, downloads and the latest releases of the projects, read from GitHub
// once (here, by .github/workflows/stats.yml every day) instead of by every visitor: the
// unauthenticated API allows 60 calls an hour per address, and the page used to spend 7 a visit.
//
//   node scripts/stats.mjs      rewrite data/stats.json (GITHUB_TOKEN or GH_TOKEN raises the limit)
import { writeFileSync } from "node:fs";

const OWNER = "phantomptr";
const REPOS = ["ps5upload", "ps5term", "ava1"];
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const api = async (path) => {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "site-stats", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

const repos = {};
const log = [];
for (const name of REPOS) {
  const repo = await api(`repos/${OWNER}/${name}`);
  const releases = [];
  for (let page = 1; ; page++) {
    const batch = await api(`repos/${OWNER}/${name}/releases?per_page=100&page=${page}`);
    releases.push(...batch.filter((r) => !r.draft));
    if (batch.length < 100) break;
  }
  const downloads = releases.reduce((n, r) => n + r.assets.reduce((m, a) => m + a.download_count, 0), 0);
  repos[name] = { stars: repo.stargazers_count, forks: repo.forks_count, downloads, releases: releases.length, latest: releases[0]?.tag_name ?? null };
  // The two newest of each project, so one that ships daily does not fill the list.
  for (const r of releases.slice(0, 2)) log.push({ repo: name, tag: r.tag_name, at: r.published_at, url: r.html_url });
}
log.sort((a, b) => b.at.localeCompare(a.at));

const sum = (key) => Object.values(repos).reduce((n, r) => n + r[key], 0);
const stats = {
  generated: new Date().toISOString(),
  totals: { stars: sum("stars"), downloads: sum("downloads"), releases: sum("releases") },
  repos,
  log: log.slice(0, 6),
};
writeFileSync(new URL("../data/stats.json", import.meta.url), `${JSON.stringify(stats, null, 2)}\n`);
console.log(`stars ${stats.totals.stars}, downloads ${stats.totals.downloads}, releases ${stats.totals.releases}`);
