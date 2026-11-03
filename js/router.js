/* ============================================================
   Hash router with page-like transitions.
   Routes: #/ (home), #/projects, #/about, #/contact
   The avatar stays mounted between routes, so its wave animation
   never resets when you navigate.
   ============================================================ */

const META = {
  home: {
    nav: "Home",
    title: "Ken Kevin Cabanalan — Third-Year Student Developer",
    description:
      "Portfolio of Ken Kevin Cabanalan, a third-year student developer building web and mobile projects with HTML, CSS, JavaScript, C++, C#, Dart, Python, PHP and SQL.",
  },
  projects: {
    nav: "Projects",
    title: "Projects — Ken Kevin Cabanalan",
    description:
      "Student projects by Ken Kevin Cabanalan: Flutter apps, PHP systems, Python experiments and web interfaces.",
  },
  about: {
    nav: "About",
    title: "About — Ken Kevin Cabanalan",
    description:
      "Third-year student developer learning by building web, mobile and data-driven projects.",
  },
  contact: {
    nav: "Contact",
    title: "Contact — Ken Kevin Cabanalan",
    description:
      "Get in touch with Ken Kevin Cabanalan about internships, collaborations and student projects.",
  },
};

const BUBBLES = {
  home: "Welcome back 👋",
  projects: "Check out my projects 👋",
  about: "A bit about me…",
  contact: "Let's connect 👋",
};

const pages = new Map(
  [...document.querySelectorAll(".page")].map((el) => [el.dataset.page, el])
);
const navLinks = [...document.querySelectorAll("[data-nav]")];
const announcer = document.getElementById("route-announcer");
const descriptionTag = document.querySelector('meta[name="description"]');
const ogTitle = document.querySelector('meta[property="og:title"]');
const ogDescription = document.querySelector('meta[property="og:description"]');
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let current = null;
let busy = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function routeFromHash(hash = window.location.hash) {
  if (!hash || hash === "#" || hash === "#/") return "home";
  if (!hash.startsWith("#/")) return null; // e.g. #main (skip link) — let the browser handle it
  const name = hash.slice(2).replace(/\/+$/, "").toLowerCase();
  return pages.has(name) ? name : null;
}

function updateMeta(page) {
  const meta = META[page];
  if (!meta) return;

  document.title = meta.title;
  if (descriptionTag) descriptionTag.setAttribute("content", meta.description);
  if (ogTitle) ogTitle.setAttribute("content", meta.title);
  if (ogDescription) ogDescription.setAttribute("content", meta.description);

  navLinks.forEach((link) => {
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function showInstant(page) {
  pages.forEach((el, name) => {
    el.classList.toggle("is-active", name === page);
    el.classList.remove("is-leaving");
  });
  current = page;
  updateMeta(page);
  window.scrollTo(0, 0);
}

function announce(message) {
  if (!announcer) return;
  announcer.textContent = "";
  window.requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

function focusHeading(pageEl) {
  const heading = pageEl.querySelector("h1");
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

export async function navigate(page, { updateUrl = true, focus = true } = {}) {
  if (busy || page === current || !pages.has(page)) return;

  busy = true;

  const fromEl = pages.get(current);
  const toEl = pages.get(page);
  const reduce = reduceMotion.matches;

  if (updateUrl) {
    const url = page === "home" ? "#/" : `#/${page}`;
    window.history.pushState({ page }, "", url);
  }

  if (!reduce) {
    // The avatar starts waving while the old page fades out.
    window.dispatchEvent(
      new CustomEvent("avatar:wave", { detail: { message: BUBBLES[page] } })
    );
    fromEl.classList.remove("is-active");
    fromEl.classList.add("is-leaving");
    await sleep(230);
  } else {
    fromEl.classList.remove("is-active");
  }

  fromEl.classList.remove("is-leaving");
  toEl.classList.add("is-active");

  current = page;
  updateMeta(page);
  window.scrollTo(0, 0);

  busy = false;
  window.dispatchEvent(new CustomEvent("route:change", { detail: { page } }));
  announce(`${META[page].nav} page`);

  if (focus) focusHeading(toEl);
}

export function initRouter() {
  if (!pages.size) return;

  const initial = routeFromHash() ?? "home";
  showInstant(initial);

  // Normalise empty or unknown hash routes to a clean URL.
  const hash = window.location.hash;
  if (!hash || (hash.startsWith("#/") && routeFromHash() === null)) {
    window.history.replaceState(
      { page: initial },
      "",
      initial === "home" ? "#/" : `#/${initial}`
    );
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest("[data-route]");
    if (!link) return;

    event.preventDefault();
    navigate(link.dataset.route);
  });

  window.addEventListener("popstate", () => {
    const page = routeFromHash() ?? "home";
    if (page !== current) navigate(page, { updateUrl: false, focus: false });
  });

  window.addEventListener("hashchange", () => {
    const page = routeFromHash();
    if (page === null) return; // in-page anchor such as #main
    if (page !== current && !busy) {
      navigate(page, { updateUrl: false, focus: false });
    }
  });
}
