// Live star counts, latest versions and recent activity, read from GitHub when the page loads.
// If GitHub can't be reached the stars stay hidden and the static text in the HTML stays.
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

for (const repo of ["ps5upload", "ava1"]) {
  api(`repos/phantomptr/${repo}`)
    .then((r) => {
      document.getElementById(`stars-${repo}`).textContent = stars(r.stargazers_count);
    })
    .catch(() => {});
  api(`repos/phantomptr/${repo}/releases?per_page=1`)
    .then(([latest]) => {
      if (latest) document.getElementById(`${repo}-version`).textContent = `Latest ${latest.tag_name}`;
    })
    .catch(() => {});
}

// The email address is assembled here so it isn't sitting in the HTML for scrapers.
{
  const el = document.getElementById("email");
  if (el) {
    const address = `${el.dataset.u}@${el.dataset.d}`;
    el.href = `mailto:${address}?subject=${encodeURIComponent("Working together")}`;
    el.title = address;
  }
}

// "Last push: 3 hours ago, to ava1" under the projects.
const ago = (date) => {
  const s = Math.max(1, (Date.now() - date.getTime()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
};
api("users/phantomptr/events/public?per_page=30")
  .then((events) => {
    const push = events.find((e) => e.type === "PushEvent" && e.public);
    if (!push) return;
    const el = document.getElementById("activity");
    el.replaceChildren("Last push: ", ago(new Date(push.created_at)), ", to ");
    const a = document.createElement("a");
    a.href = `https://github.com/${push.repo.name}`;
    a.textContent = push.repo.name.replace(/^phantomptr\//, "");
    el.append(a, ".");
    el.hidden = false;
  })
  .catch(() => {});

// Konami code. You know the one.
{
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  addEventListener("keydown", (e) => {
    pos = e.key === code[pos] ? pos + 1 : e.key === code[0] ? 1 : 0;
    if (pos !== code.length) return;
    pos = 0;
    document.body.classList.remove("party");
    void document.body.offsetWidth; // restart the animation
    document.body.classList.add("party");
    const t = document.getElementById("tagline");
    if (t) {
      t.dataset.locked = "1"; // stops the typing loop below
      t.textContent = "Cheat code accepted. Infinite tokens unlocked. (Not really.)";
    }
  });
}

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
    const locked = () => taglineEl.dataset.locked === "1";
    while (!locked()) {
      const next = TAGLINES[(i = (i + 1) % TAGLINES.length)];
      while (taglineEl.textContent.length && !locked()) {
        taglineEl.textContent = taglineEl.textContent.slice(0, -1);
        await sleep(28);
      }
      for (const ch of next) {
        if (locked()) break;
        taglineEl.textContent += ch;
        await sleep(ch === " " ? 90 : 48);
      }
      await sleep(3600);
    }
  })();
}
