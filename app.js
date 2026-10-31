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
const stars = (n) => `★ ${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}`;

ready.then(() => {
for (const repo of ["ps5upload", "ava1"]) {
  api(`repos/phantomptr/${repo}`)
    .then((r) => {
      const el = $(`stars-${repo}`);
      if (el) el.textContent = stars(r.stargazers_count);
    })
    .catch(() => {});
  api(`repos/phantomptr/${repo}/releases?per_page=1`)
    .then(([latest]) => {
      const el = $(`${repo}-version`);
      if (latest && el) el.textContent = t("projects.latest", "Latest {tag}", { tag: latest.tag_name });
    })
    .catch(() => {});
}
});

// The email address is assembled here so it isn't sitting in the HTML for scrapers.
{
  const el = $("email");
  if (el) {
    const address = `${el.dataset.u}@${el.dataset.d}`;
    el.href = `mailto:${address}?subject=${encodeURIComponent(t("connect.subject", "Working together"))}`;
    el.title = address;
  }
}

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
ready.then(() => {
if ($("activity")) {
  api("users/phantomptr/events/public?per_page=30")
    .then((events) => {
      const push = events.find((e) => e.type === "PushEvent" && e.public);
      if (!push) return;
      const el = $("activity");
      const a = document.createElement("a");
      a.href = `https://github.com/${push.repo.name}`;
      a.textContent = push.repo.name.replace(/^phantomptr\//, "");
      // "Last push: {when}, to {repo}." with the repo as a link.
      const [before, after] = t("activity.push", "Last push: {when}, to {repo}.", { when: ago(new Date(push.created_at)) }).split("{repo}");
      el.replaceChildren(before, a, after ?? "");
      el.hidden = false;
    })
    .catch(() => {});
}
});

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
    const el = $("tagline");
    if (el) {
      el.dataset.locked = "1"; // stops the typing loop below
      el.textContent = t("konami", "Cheat code accepted. Infinite tokens unlocked. (Not really.)");
    }
  });
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
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
