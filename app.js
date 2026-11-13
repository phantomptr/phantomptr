// Live star counts, latest versions and recent activity, read from GitHub when the page loads.
// If GitHub can't be reached the stars stay hidden and the static text in the HTML stays.
// The words come in the visitor's language: English is in the HTML, the others in
// i18n/<code>.json (scripts/site-i18n.mjs checks them). The same mechanism and the same
// languages as ps5upload.phantomptr.com; index.html's <head> picks the language before paint.
"use strict";

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

// ── Language ───────────────────────────────────────────────────────────────

/** The languages, in the same order as the PS5Upload app and site. */
const LANGS = [
  ["en", "English"],
  ["zh-CN", "简体中文"],
  ["zh-TW", "繁體中文"],
  ["hi", "हिन्दी"],
  ["es", "Español"],
  ["ar", "العربية"],
  ["bn", "বাংলা"],
  ["pl", "Polski"],
  ["pt-BR", "Português (Brasil)"],
  ["ru", "Русский"],
  ["ja", "日本語"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["ko", "한국어"],
  ["tr", "Türkçe"],
  ["vi", "Tiếng Việt"],
  ["id", "Bahasa Indonesia"],
  ["it", "Italiano"],
  ["th", "ไทย"],
  ["hu", "Magyar"],
  ["fa", "فارسی"],
];
const lang = LANGS.some(([c]) => c === root.lang) ? root.lang : "en";
let words = {};

/** A string in the visitor's language, `en` when it has no translation; {name} takes vars.name. */
function t(key, en, vars = {}) {
  let s = words[key] ?? en;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

async function loadWords() {
  if (lang === "en") return;
  try {
    const res = await fetch(`/i18n/${lang}.json`);
    if (res.ok) words = await res.json();
  } catch {
    /* stays English */
  }
}

/** Puts the translations into the page: data-i18n is an element's content (which may hold
 *  <strong>, <code>, <a> and <span>), data-i18n-attr is "attribute:key" pairs split by ";". */
function translatePage() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const s = words[el.dataset.i18n];
    if (s !== undefined) el.innerHTML = s;
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":");
      if (words[key] !== undefined) el.setAttribute(attr, words[key]);
    }
  });
}

const select = $("lang");
if (select) {
  select.innerHTML = LANGS.map(([c, label]) => `<option value="${c}" lang="${c}">${label}</option>`).join("");
  select.value = lang;
  select.addEventListener("change", () => {
    try {
      localStorage.setItem("phantomptr.site.lang", select.value);
    } catch {
      /* private mode: the URL carries it */
    }
    const url = new URL(location.href);
    url.searchParams.set("lang", select.value);
    location.href = url.href;
  });
}

// ── The page ───────────────────────────────────────────────────────────────

/** Resolves once the page has its words; everything below that shows text waits for it. */
const ready = loadWords().then(() => {
  translatePage();
  root.classList.remove("i18n-wait");
});

if ($("year")) $("year").textContent = String(new Date().getFullYear());

// Where PS5Upload's own site lives.

const PS5UPLOAD_SITE = "https://ps5upload.phantomptr.com/";
document.querySelectorAll('[data-site="ps5upload"]').forEach((a) => (a.href = PS5UPLOAD_SITE));

const api = (path) =>
  fetch(`https://api.github.com/${path}`, { headers: { Accept: "application/vnd.github+json" } }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
  );
/** 1066285 → "1.1M", in the visitor's language. */
const compact = (n) => new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const stars = (n) => `★ ${compact(n)}`;
const REPOS = { ps5upload: "PS5Upload", ps5term: "PS5Term", ava1: "AVA1" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts a figure up to its value once, the first time it is on screen. */
function countUp(el, value) {
  if (reduceMotion || !("IntersectionObserver" in window)) return void (el.textContent = compact(value));
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 900);
      el.textContent = compact(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  io.observe(el);
}

// Stars, downloads, versions and the latest releases come from data/stats.json, which
// scripts/stats.mjs rewrites every day (.github/workflows/stats.yml): one same-origin file
// instead of six GitHub API calls a visit. If the file is missing or more than a week old,
// the stars and versions are asked from GitHub as before.
const statsFile = fetch("/data/stats.json")
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

function showRepo(repo, { stars: n, latest, downloads }) {
  const s = $(`stars-${repo}`);
  if (s && n >= 10) s.textContent = stars(n); // a handful of stars says nothing yet
  const v = $(`${repo}-version`);
  if (v && latest) v.textContent = t("projects.latest", "Latest {tag}", { tag: latest });
  const d = $(`downloads-${repo}`);
  if (d && downloads >= 1000) d.textContent = `↓ ${compact(downloads)}`;
}

ready.then(async () => {
  if (!$("projects-title")) return;
  const stats = await statsFile;
  const fresh = stats && Date.now() - Date.parse(stats.generated) < 7 * 86400e3;
  if (stats) {
    for (const [repo, r] of Object.entries(stats.repos)) showRepo(repo, r);
    for (const key of ["downloads", "stars", "releases"]) {
      const el = $(`stat-${key}`);
      if (el && stats.totals[key]) countUp(el, stats.totals[key]);
    }
    const list = $("log-list");
    if (list && stats.log.length) {
      for (const r of stats.log) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = r.url;
        a.textContent = `${REPOS[r.repo] ?? r.repo} ${r.tag}`;
        const time = document.createElement("time");
        time.dateTime = r.at;
        time.textContent = ago(new Date(r.at));
        li.append(a, time);
        list.append(li);
      }
      $("log").hidden = false;
    }
  }
  if (fresh) return;
  for (const repo of Object.keys(REPOS)) {
    api(`repos/phantomptr/${repo}`)
      .then((r) => showRepo(repo, { stars: r.stargazers_count }))
      .catch(() => {});
    api(`repos/phantomptr/${repo}/releases?per_page=1`)
      .then(([latest]) => latest && showRepo(repo, { latest: latest.tag_name }))
      .catch(() => {});
  }
});

// "cargo add ava1": one click copies it.
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
    } catch {
      return; // no clipboard here: the text is on the page to select
    }
    const state = btn.querySelector(".snippet-state");
    state.textContent = t("copied", "Copied");
    setTimeout(() => (state.textContent = t("copy", "Copy")), 1600);
  });
});

// The email address is assembled here so it isn't sitting in the HTML for scrapers.
// (After the words are in, so the subject line is in the visitor's language too.)
ready.then(() => {
  const el = $("email");
  if (el) {
    const address = `${el.dataset.u}@${el.dataset.d}`;
    el.href = `mailto:${address}?subject=${encodeURIComponent(t("connect.subject", "Working together"))}`;
    el.title = address;
  }
});

// "Last push: 3 hours ago, to ava1" under the projects, the time in the visitor's language.
const ago = (date) => {
  const s = Math.max(1, (Date.now() - date.getTime()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "always" });
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return rtf.format(-n, name);
  }
  return rtf.format(-1, "minute");
};
/** The newest public push, asked from GitHub at most once every ten minutes per tab. */
async function lastPush() {
  const KEY = "phantomptr.site.push";
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved && Date.now() - saved.at < 600e3) return saved.push;
  } catch {
    /* no storage: ask */
  }
  const events = await api("users/phantomptr/events/public?per_page=30");
  const e = events.find((x) => x.type === "PushEvent" && x.public);
  const push = e ? { repo: e.repo.name, when: e.created_at } : null;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), push }));
  } catch {
    /* fine */
  }
  return push;
}
ready.then(() => {
  const el = $("activity");
  if (!el) return;
  lastPush()
    .then((push) => {
      if (!push) return;
      const a = document.createElement("a");
      a.href = `https://github.com/${push.repo}`;
      a.textContent = push.repo.replace(/^phantomptr\//, "");
      // "Last push: {when}, to {repo}." with the repo as a link.
      const [before, after] = t("activity.push", "Last push: {when}, to {repo}.", { when: ago(new Date(push.when)) }).split("{repo}");
      el.replaceChildren(before, a, after ?? "");
      el.hidden = false;
    })
    .catch(() => {});
});

// The terminal: a button in the corner, or "/" anywhere. Its code (shell.js) loads on first use.
{
  const open = async () => {
    try {
      (await import("/shell.js")).openShell({ lang, langs: LANGS.map(([c]) => c), stats: await statsFile });
    } catch {
      /* offline: no terminal */
    }
  };
  ready.then(() => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shell-fab";
    btn.textContent = ">_";
    btn.title = t("shell.open", "Open the terminal");
    btn.setAttribute("aria-label", btn.title);
    btn.addEventListener("click", open);
    document.body.append(btn);
  });
  addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, select, textarea, dialog, [contenteditable]")) return;
    e.preventDefault();
    open();
  });
}

// 404: the address that was asked for, in the crash line.
if ($("crash-path")) {
  let path = location.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* a malformed address: shown as it came */
  }
  $("crash-path").textContent = path.slice(0, 60);
}

// Konami code. You know the one.
{
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  const party = () => {
    document.body.classList.remove("party");
    void document.body.offsetWidth; // restart the animation
    document.body.classList.add("party");
    const el = $("tagline");
    if (el) {
      el.dataset.locked = "1"; // stops the typing loop below
      el.textContent = t("konami", "Cheat code accepted. Infinite tokens unlocked. (Not really.)");
    }
  };
  addEventListener("keydown", (e) => {
    pos = e.key === code[pos] ? pos + 1 : e.key === code[0] ? 1 : 0;
    if (pos !== code.length) return;
    pos = 0;
    party();
  });
  addEventListener("phantomptr:party", party); // the terminal's "konami"
}

// Taglines that type themselves out, one at a time.
const taglines = () => [
  t("tagline.0", "Works until it doesn't."),
  t("tagline.1", "Full stack. Full send."),
  t("tagline.2", "Prompt, build, break, fix, ship, repeat."),
  t("tagline.3", "It works on my machine. And my agent's."),
  t("tagline.4", "Turning caffeine into commits since forever."),
  t("tagline.5", "Vibe coding: 10% typing, 90% 'hmm, interesting'."),
];
const taglineEl = $("tagline");
if (taglineEl && !reduceMotion) {
  let i = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    await ready;
    await sleep(2800);
    const TAGLINES = taglines();
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
