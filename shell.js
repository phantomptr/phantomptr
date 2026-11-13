// The terminal behind the ">_" button and the "/" key: a small pretend shell over what is on the
// page. Loaded by app.js on first use. It speaks shell, so its own words are English; what it
// prints from the page (about.txt, the project texts) is in the visitor's language.
const PROJECTS = {
  ps5upload: { name: "PS5Upload", url: "https://ps5upload.phantomptr.com/", text: "ps5upload.text" },
  ps5term: { name: "PS5Term", url: "https://ps5term.phantomptr.com/", text: "ps5term.text" },
  ava1: { name: "AVA1", url: "https://github.com/phantomptr/ava1", text: "ava1.text" },
};
const LINKS = {
  github: "https://github.com/phantomptr",
  x: "https://x.com/phantomptr",
  discord: "https://discord.gg/fzK3xddtrM",
  coffee: "https://ko-fi.com/B0B81S0WUA",
};
const mail = ["phantomptr", "gmail.com"].join("@");
const pageText = (selector, fallback) => document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || fallback;

let dialog, out, input, ctx;
const history = [];
let at = 0;

function print(text = "", cls = "") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = text;
  out.append(line);
  return line;
}
function link(label, url) {
  const line = print(`${label}  `);
  const a = document.createElement("a");
  a.href = url;
  a.textContent = url.replace(/^(https?:\/\/|mailto:)/, "").replace(/\/$/, "");
  if (!url.startsWith("mailto:")) a.target = "_blank";
  a.rel = "noopener";
  line.append(a);
}
const num = (n) => new Intl.NumberFormat(ctx.lang).format(n);

const FILES = {
  "about.txt": () => print(pageText(".bio", "Full stack software engineer. Works until it doesn't.")),
  "now.txt": () => print(pageText(".now span", "Shipping.")),
  "contact.txt": () => COMMANDS.contact(),
  ".env": () => print("TOKENS=∞   # nice try", "dim"),
};

const COMMANDS = {
  help() {
    print("Things to try:");
    for (const [cmd, what] of [
      ["whoami", "who runs this place"],
      ["projects", "what I have built"],
      ["open <project>", "go to ps5upload, ps5term or ava1"],
      ["stats", "stars, downloads, releases"],
      ["ls, cat <file>", "look around"],
      ["contact", "hire me, or say hi"],
      ["coffee", "keep the tokens flowing"],
      ["lang <code>", "read the site in another language"],
      ["neofetch", "because every terminal has one"],
      ["clear, exit", "tidy up, leave"],
    ]) print(`  ${cmd.padEnd(16)} ${what}`);
    print("Some commands are not listed. A phantom pointer has to point somewhere.", "dim");
  },
  whoami() {
    print("phantomptr");
    FILES["about.txt"]();
  },
  projects() {
    for (const [id, p] of Object.entries(PROJECTS)) {
      print(`${p.name}`, "hi");
      print(pageText(`[data-i18n="${p.text}"]`, ""));
      print(`  open ${id}`, "dim");
    }
  },
  open(arg) {
    const url = PROJECTS[arg]?.url ?? LINKS[arg];
    if (!url) return print(`open: ${arg || "what?"}: try ${[...Object.keys(PROJECTS), ...Object.keys(LINKS)].join(", ")}`, "err");
    link("→", url);
    window.open(url, "_blank", "noopener");
  },
  stats() {
    const s = ctx.stats;
    if (!s) return print("stats: GitHub is not answering. Works until it doesn't.", "err");
    print(`${num(s.totals.downloads).padStart(12)}  downloads`);
    print(`${num(s.totals.stars).padStart(12)}  GitHub stars`);
    print(`${num(s.totals.releases).padStart(12)}  releases shipped`);
    print(`as of ${new Date(s.generated).toLocaleDateString(ctx.lang)}`, "dim");
  },
  ls(arg) {
    if (arg === "projects" || arg === "projects/") return print(Object.keys(PROJECTS).join("  "));
    if (arg === "-a" || arg === "-la" || arg === "-al") return print(`.env  ${Object.keys(FILES).filter((f) => f[0] !== ".").join("  ")}  projects/`);
    print(`${Object.keys(FILES).filter((f) => f[0] !== ".").join("  ")}  projects/`);
  },
  cat(arg) {
    if (!arg) return print("cat: which file? Try ls.", "err");
    const name = arg.replace(/^projects\//, "");
    if (FILES[arg]) return FILES[arg]();
    if (PROJECTS[name]) return print(pageText(`[data-i18n="${PROJECTS[name].text}"]`, PROJECTS[name].url));
    print(`cat: ${arg}: No such file or directory`, "err");
  },
  contact() {
    print("Hiring, or need something built? A couple of lines is plenty.");
    link("email  ", `mailto:${mail}`);
    link("x      ", LINKS.x);
    link("github ", LINKS.github);
    link("discord", LINKS.discord);
  },
  coffee() {
    print("Everything here is free. Coffee for me, or tokens for the AI:");
    link("☕", LINKS.coffee);
  },
  lang(arg) {
    const code = ctx.langs.find((c) => c.toLowerCase() === (arg || "").toLowerCase());
    if (!code) return print(`lang: one of ${ctx.langs.join(" ")}`, arg ? "err" : "");
    try {
      localStorage.setItem("phantomptr.site.lang", code);
    } catch {
      /* the URL carries it */
    }
    const url = new URL(location.href);
    url.searchParams.set("lang", code);
    location.href = url.href;
  },
  neofetch() {
    const s = ctx.stats;
    const info = [
      "phantomptr@web",
      "--------------",
      "OS       the open web",
      "Shell    phantom-sh 0.1",
      "Uptime   works until it doesn't",
      `Projects ${Object.values(PROJECTS).map((p) => p.name).join(", ")}`,
      s ? `Shipped  ${num(s.totals.releases)} releases, ${num(s.totals.downloads)} downloads` : "Shipped  a lot",
      `Speaks   ${ctx.langs.length} languages`,
    ];
    const ghost = ["  .-''-.  ", " /  o o \\ ", " |   ▽  | ", " |      | ", " |/\\/\\/\\| ", "          ", "          ", "          "];
    info.forEach((line, i) => print(`${ghost[i]} ${line}`, i === 0 ? "hi" : ""));
  },
  konami() {
    dispatchEvent(new Event("phantomptr:party"));
    print("Cheat code accepted.", "hi");
  },
  sudo(arg, all) {
    if (/hire/.test(all)) return COMMANDS.contact();
    print("phantomptr is not in the sudoers file. This incident will be vibe coded.", "err");
  },
  rm() {
    print("rm: refusing. The last time an agent ran that, we had a long talk.", "err");
  },
  vim() {
    print("You are now in vim. Just kidding, you could never leave.", "dim");
  },
  echo: (arg, all) => print(all.replace(/^echo\s*/, "")),
  date: () => print(new Date().toString()),
  pwd: () => print("/home/phantomptr"),
  history: () => history.forEach((h, i) => print(`${String(i + 1).padStart(3)}  ${h}`)),
  clear: () => out.replaceChildren(),
  exit: () => dialog.close(),
};
Object.assign(COMMANDS, { hire: COMMANDS.contact, email: COMMANDS.contact, "?": COMMANDS.help, cd: () => print("There is only here."), emacs: COMMANDS.vim, nano: COMMANDS.vim, quit: COMMANDS.exit });

function run(line) {
  print(`$ ${line}`, "cmd");
  const text = line.trim();
  if (!text) return;
  history.push(text);
  at = history.length;
  const [cmd, ...args] = text.split(/\s+/);
  if (/^(\*+\w*ptr\w*|deref.*|\*phantomptr)$/i.test(text)) {
    print("Segmentation fault (core dumped)", "err");
    print("You dereferenced a phantom pointer. That is how most of my projects start.", "dim");
  } else if (Object.hasOwn(COMMANDS, cmd.toLowerCase())) COMMANDS[cmd.toLowerCase()](args[0], text);
  else print(`phantom-sh: command not found: ${cmd}. Try help.`, "err");
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "shell";
  dialog.setAttribute("aria-label", "Terminal");
  dialog.innerHTML = `
    <div class="shell-bar"><span>phantomptr@web: ~</span><button type="button" class="shell-x" aria-label="Close">×</button></div>
    <div class="shell-out" role="log" aria-live="polite"></div>
    <form class="shell-line" method="dialog"><label for="shell-in">$</label>
      <input id="shell-in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" /></form>`;
  document.body.append(dialog);
  out = dialog.querySelector(".shell-out");
  input = dialog.querySelector("input");
  dialog.querySelector(".shell-x").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close(); // the backdrop
    else if (!getSelection()?.toString() && !e.target.closest("a")) input.focus();
  });
  dialog.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = "";
    run(line);
    out.scrollTop = out.scrollHeight;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      at = Math.max(0, Math.min(history.length, at + (e.key === "ArrowUp" ? -1 : 1)));
      input.value = history[at] ?? "";
    } else if (e.key === "Tab" && input.value.trim()) {
      e.preventDefault();
      const words = input.value.split(/\s+/);
      const pool = words.length === 1 ? Object.keys(COMMANDS) : [...Object.keys(PROJECTS), ...Object.keys(FILES), ...Object.keys(LINKS), ...ctx.langs];
      const hits = pool.filter((w) => w.startsWith(words.at(-1)));
      if (hits.length === 1) input.value = [...words.slice(0, -1), hits[0]].join(" ") + " ";
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      COMMANDS.clear();
    }
  });
  print("phantom-sh 0.1. Type help, or try whoami.", "dim");
}

export function openShell(context) {
  ctx = context;
  if (!dialog) build();
  if (!dialog.open) dialog.showModal();
  input.focus();
}
