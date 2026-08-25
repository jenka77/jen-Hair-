/* Bandeau d'annonce doré — défilement horizontal sous la navbar */
(function () {
  "use strict";

  function varianteAnnonce() {
    const mode = document.body.dataset.announce;
    if (mode === "account") return "account";
    if (/compte\.html/i.test(window.location.pathname)) return "account";
    return "home";
  }

  function cleTexte() {
    return varianteAnnonce() === "account" ? "announce.account" : "announce.home";
  }

  function libelleAccessibilite() {
    return typeof t === "function" ? t("announce.a11y") : "Annonces";
  }

  function texteAnnonce() {
    const cle = cleTexte();
    return typeof t === "function" ? t(cle) : cle;
  }

  function creerBandeau() {
    const nav = document.querySelector("header.navbar");
    if (!nav || document.querySelector(".announce-bar")) return null;

    const bar = document.createElement("aside");
    bar.className = "announce-bar";
    bar.dataset.variant = varianteAnnonce();
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", libelleAccessibilite());
    bar.innerHTML = `
      <div class="announce-bar__shine" aria-hidden="true"></div>
      <div class="announce-bar__viewport">
        <div class="announce-bar__track">
          <p class="announce-bar__text"></p>
          <span class="announce-bar__sep" aria-hidden="true">◆</span>
          <p class="announce-bar__text announce-bar__text--clone" aria-hidden="true"></p>
          <span class="announce-bar__sep" aria-hidden="true">◆</span>
        </div>
      </div>`;

    nav.insertAdjacentElement("afterend", bar);
    document.body.classList.add("has-announce-bar");
    return bar;
  }

  function ajusterDureeDefilement(bar) {
    const track = bar.querySelector(".announce-bar__track");
    if (!track) return;

    const moitie = track.scrollWidth / 2;
    const vitesse = bar.dataset.variant === "account" ? 42 : 58;
    const duree = Math.max(28, Math.min(100, moitie / vitesse));
    track.style.setProperty("--announce-duration", `${duree}s`);
  }

  function mettreAJourTexte() {
    const bar = document.querySelector(".announce-bar");
    if (!bar) return;

    const message = texteAnnonce();
    bar.dataset.variant = varianteAnnonce();
    bar.setAttribute("aria-label", libelleAccessibilite());

    bar.querySelectorAll(".announce-bar__text").forEach((el) => {
      el.textContent = message;
    });

    requestAnimationFrame(() => ajusterDureeDefilement(bar));
  }

  function initialiser() {
    if (document.body.classList.contains("admin-body")) return;
    creerBandeau();
    mettreAJourTexte();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiser);
  } else {
    initialiser();
  }

  document.addEventListener("langchange", mettreAJourTexte);
})();
