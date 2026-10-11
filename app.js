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
