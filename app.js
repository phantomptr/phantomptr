// Live star counts and PS5Upload's latest version, read from GitHub when the page loads.
// The numbers in the HTML stay if GitHub can't be reached.
"use strict";

document.getElementById("year").textContent = String(new Date().getFullYear());

// Where PS5Upload's own site lives.

const PS5UPLOAD_SITE = "https://ps5upload.phantomptr.com/";
document.querySelectorAll('[data-site="ps5upload"]').forEach((a) => (a.href = PS5UPLOAD_SITE));

const api = (path) =>
  fetch(`https://api.github.com/${path}`, { headers: { Accept: "application/vnd.github+json" } }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
  );
const stars = (n) => `★ ${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}`;

for (const repo of ["ps5upload"]) {
  api(`repos/phantomptr/${repo}`)
    .then((r) => {
      document.getElementById(`stars-${repo}`).textContent = stars(r.stargazers_count);
    })
    .catch(() => {});
}

api("repos/phantomptr/ps5upload/releases?per_page=1")
  .then(([latest]) => {
    if (latest) document.getElementById("ps5upload-version").textContent = `Latest ${latest.tag_name}`;
  })
  .catch(() => {});

// Taglines that type themselves out, one at a time.
const TAGLINES = [
  "Works until it doesn't.",
  "Full stack. Full send.",
  "Prompt, build, break, fix, ship, repeat.",
  "It works on my machine. And my agent's.",
  "Turning caffeine into commits since forever.",
  "Vibe coding: 10% typing, 90% 'hmm, interesting'.",
];
const taglineEl = document.getElementById("tagline");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (taglineEl && !reduceMotion) {
  let i = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    await sleep(2800);
    for (;;) {
      const next = TAGLINES[(i = (i + 1) % TAGLINES.length)];
      while (taglineEl.textContent.length) {
        taglineEl.textContent = taglineEl.textContent.slice(0, -1);
        await sleep(28);
      }
      for (const ch of next) {
        taglineEl.textContent += ch;
        await sleep(ch === " " ? 90 : 48);
      }
      await sleep(3600);
    }
  })();
}
