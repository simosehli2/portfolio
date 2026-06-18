/* ─────────────────────────────────────────
   TYPING EFFECT
───────────────────────────────────────── */
const phrases = [
  "Développeur Web Frontend",
  "Trilingue AR / FR / EN",
  "React & JavaScript",
  "Disponible immédiatement"
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typedEl = document.getElementById("typed");

function type() {
  const current = phrases[phraseIndex];
  if (isDeleting) {
    typedEl.textContent = current.slice(0, --charIndex);
  } else {
    typedEl.textContent = current.slice(0, ++charIndex);
  }

  if (!isDeleting && charIndex === current.length) {
    isDeleting = true;
    setTimeout(type, 1800);
    return;
  }
  if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    setTimeout(type, 400);
    return;
  }
  setTimeout(type, isDeleting ? 40 : 65);
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(type, 800);
});

/* ─────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────── */
const revealEls = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("visible"), i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
revealEls.forEach(el => observer.observe(el));

/* ─────────────────────────────────────────
   NAV SCROLL STYLE
───────────────────────────────────────── */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("nav--scrolled", window.scrollY > 40);
});

/* ─────────────────────────────────────────
   MOBILE MENU
───────────────────────────────────────── */
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");

burger.addEventListener("click", () => {
  mobileMenu.classList.toggle("open");
});

document.querySelectorAll(".mobile-link").forEach(link => {
  link.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
  });
});

/* ─────────────────────────────────────────
   SMOOTH ACTIVE NAV LINK
───────────────────────────────────────── */
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav__links a");

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 100) {
      current = section.getAttribute("id");
    }
  });
  navLinks.forEach(link => {
    link.style.color = link.getAttribute("href") === `#${current}` ? "var(--accent)" : "";
  });
});
