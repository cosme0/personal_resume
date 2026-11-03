/* ============================================================
   Shared site behaviour: mobile nav, header state, scroll reveals,
   copy email, contact form and the back-to-top button.
   ============================================================ */

import { initAvatar } from "./avatar.js";
import { initRouter } from "./router.js";

initAvatar();
initRouter();

/* ------------------------------ Header ---------------------------- */

const header = document.getElementById("site-header");
const nav = document.getElementById("site-nav");
const navToggle = document.getElementById("nav-toggle");

function onScroll() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* --------------------------- Mobile nav --------------------------- */

function setNav(open) {
  if (!nav || !navToggle) return;
  nav.classList.toggle("is-open", open);
  navToggle.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

navToggle?.addEventListener("click", () => {
  setNav(!nav?.classList.contains("is-open"));
});

nav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setNav(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setNav(false);
});

document.addEventListener("click", (event) => {
  if (!nav?.classList.contains("is-open")) return;
  if (!event.target.closest(".site-header")) setNav(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 860) setNav(false);
});

window.addEventListener("route:change", () => setNav(false));

/* -------------------------- Scroll reveals ------------------------ */

const revealElements = [...document.querySelectorAll(".reveal")];

if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealElements.forEach((el) => observer.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add("is-visible"));
}

/* ---------------------------- Footer ------------------------------ */

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

document.querySelectorAll("[data-back-top]").forEach((button) => {
  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });
});

/* -------------------------- Copy email ---------------------------- */

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for browsers without the async clipboard API.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await copyText(button.dataset.copy);
      const original = button.textContent;
      button.textContent = "Copied!";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1600);
    } catch (error) {
      console.warn("[copy] Could not copy email.", error);
    }
  });
});

/* ------------------------- Contact form --------------------------- */

const contactForm = document.getElementById("contact-form");
const contactEmailEl = document.querySelector("[data-contact-email]");
const CONTACT_EMAIL =
  contactEmailEl?.dataset.contactEmail || "kenkevincabanalan0@gmail.com";

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!contactForm.reportValidity()) return;

  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();

  const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
  const body = encodeURIComponent(
    `${message}\n\n— ${name}\n${email}`
  );

  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
});
