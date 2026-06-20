/* ============================================================
   Jen's & Flora — Page avis / commentaires (type n°11)
   ============================================================ */

let noteSelectionnee = 0;
let avisCache = [];

function apiAvis() {
  return typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "http://127.0.0.1:4000";
}

function etoilesHtml(note, interactif = false) {
  const max = 5;
  let html = `<span class="avis-stars${interactif ? " avis-stars--input" : ""}"${interactif ? ' role="radiogroup"' : ""}>`;
  for (let i = 1; i <= max; i += 1) {
    const pleine = i <= note;
    if (interactif) {
      html += `<button type="button" class="avis-star-btn${pleine ? " is-active" : ""}" data-star="${i}" aria-label="${i}/5">★</button>`;
    } else {
      html += `<span class="avis-star${pleine ? " is-active" : ""}" aria-hidden="true">★</span>`;
    }
  }
  html += "</span>";
  return html;
}

function formaterDateAvis(iso) {
  try {
    const loc = langueActuelle === "de" ? "de-DE" : langueActuelle === "en" ? "en-GB" : "fr-FR";
    return new Date(iso).toLocaleDateString(loc, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function masquerRechercheType() {
  const wrap = document.getElementById("type-search-wrap");
  const section = document.querySelector(".type-search-section");
  if (wrap) wrap.hidden = true;
  if (section) section.hidden = true;
}

function formulaireAvisHtml() {
  return `
    <section class="avis-form-card account-card">
      <h2 class="avis-form-title">${t("avis.formTitle")}</h2>
      <p class="avis-form-lead">${t("avis.formLead")}</p>
      <form id="avis-form" class="avis-form" novalidate>
        <label class="field">
          <span>${t("avis.name")}</span>
          <input type="text" id="avis-name" name="authorName" maxlength="80" autocomplete="name" />
        </label>
        <fieldset class="avis-rating-field">
          <legend>${t("avis.rating")}</legend>
          <div id="avis-stars-input">${etoilesHtml(noteSelectionnee, true)}</div>
          <p class="avis-rating-hint" id="avis-rating-hint">${t("avis.ratingHint")}</p>
        </fieldset>
        <label class="field">
          <span>${t("avis.comment")}</span>
          <textarea id="avis-comment" name="comment" rows="5" maxlength="2000" required placeholder="${t("avis.commentPlaceholder")}"></textarea>
        </label>
        <button type="submit" class="btn-order account-submit" id="avis-submit">${t("avis.submit")}</button>
        <p id="avis-form-message" class="account-message" hidden></p>
      </form>
    </section>`;
}

function listeAvisHtml(reviews) {
  if (!reviews.length) {
    return `<p class="account-empty">${t("avis.empty")}</p>`;
  }

  return reviews
    .map(
      (avis) => `
    <article class="avis-card">
      <div class="avis-card-head">
        <div>
          <p class="avis-author">${avis.authorName}</p>
          <p class="avis-date">${formaterDateAvis(avis.createdAt)}</p>
        </div>
        ${etoilesHtml(avis.rating)}
      </div>
      <p class="avis-text">${avis.comment.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    </article>`
    )
    .join("");
}

async function chargerAvisPublics() {
  const reponse = await fetch(`${apiAvis()}/api/reviews`, { cache: "no-store" });
  if (!reponse.ok) throw new Error(t("avis.loadError"));
  const data = await reponse.json();
  return data.reviews || [];
}

async function preremplirNomAvis() {
  const input = document.getElementById("avis-name");
  if (!input) return;

  if (typeof obtenirUtilisateur === "function") {
    const user = await obtenirUtilisateur();
    if (user?.email) {
      const nom =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split("@")[0];
      input.value = nom;
      input.placeholder = nom;
    }
  }
}

function attacherEtoiles() {
  const conteneur = document.getElementById("avis-stars-input");
  if (!conteneur) return;

  conteneur.querySelectorAll(".avis-star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      noteSelectionnee = Number(btn.dataset.star) || 0;
      conteneur.innerHTML = etoilesHtml(noteSelectionnee, true);
      attacherEtoiles();
      const hint = document.getElementById("avis-rating-hint");
      if (hint) hint.textContent = t("avis.ratingSelected", { n: noteSelectionnee });
    });
  });
}

function afficherMessageAvis(texte, type = "info") {
  const el = document.getElementById("avis-form-message");
  if (!el) return;
  el.hidden = !texte;
  el.textContent = texte;
  el.className = `account-message account-message--${type}`;
}

async function soumettreAvis(e) {
  e.preventDefault();
  afficherMessageAvis("");

  const authorName = document.getElementById("avis-name")?.value.trim() || "";
  const comment = document.getElementById("avis-comment")?.value.trim() || "";

  if (noteSelectionnee < 1) {
    afficherMessageAvis(t("avis.ratingRequired"), "error");
    return;
  }
  if (comment.length < 10) {
    afficherMessageAvis(t("avis.commentTooShort"), "error");
    return;
  }

  let userConnecte = null;
  if (typeof obtenirUtilisateur === "function") {
    userConnecte = await obtenirUtilisateur();
  }
  if (!userConnecte && authorName.length < 2) {
    afficherMessageAvis(t("avis.nameRequired"), "error");
    return;
  }

  const submitBtn = document.getElementById("avis-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = t("avis.sending");
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (typeof obtenirTokenAuth === "function") {
      const token = await obtenirTokenAuth();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const reponse = await fetch(`${apiAvis()}/api/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        authorName: authorName || undefined,
        rating: noteSelectionnee,
        comment,
      }),
    });

    const data = await reponse.json().catch(() => ({}));
    if (!reponse.ok) throw new Error(data.error || t("avis.submitError"));

    avisCache = [data.review, ...avisCache];
    document.getElementById("avis-form")?.reset();
    noteSelectionnee = 0;
    const stars = document.getElementById("avis-stars-input");
    if (stars) stars.innerHTML = etoilesHtml(0, true);
    attacherEtoiles();
    const hint = document.getElementById("avis-rating-hint");
    if (hint) hint.textContent = t("avis.ratingHint");

    const liste = document.getElementById("avis-list");
    if (liste) liste.innerHTML = listeAvisHtml(avisCache);

    afficherMessageAvis(t("avis.thanks"), "success");
    if (typeof afficherToast === "function") afficherToast(t("avis.thanks"));
  } catch (err) {
    afficherMessageAvis(err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t("avis.submit");
    }
  }
}

async function rendrePageCommentaires() {
  masquerRechercheType();
  const grille = document.getElementById("type-grid");
  if (!grille) return;

  grille.className = "avis-page";
  grille.innerHTML = `
    ${formulaireAvisHtml()}
    <section class="avis-list-section">
      <h2 class="avis-list-title">${t("avis.listTitle")}</h2>
      <div id="avis-list" class="avis-list">
        <p class="account-loading">${t("avis.loading")}</p>
      </div>
    </section>`;

  attacherEtoiles();
  document.getElementById("avis-form")?.addEventListener("submit", soumettreAvis);
  await preremplirNomAvis();

  const liste = document.getElementById("avis-list");
  try {
    avisCache = await chargerAvisPublics();
    if (liste) liste.innerHTML = listeAvisHtml(avisCache);
  } catch (err) {
    if (liste) liste.innerHTML = `<p class="account-empty">${err.message}</p>`;
  }
}

window.rendrePageCommentaires = rendrePageCommentaires;

document.addEventListener("langchange", () => {
  if (typeof etatType !== "undefined" && etatType.commentaires) {
    rendrePageCommentaires();
  }
});
