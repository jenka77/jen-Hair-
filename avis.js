/* ============================================================
   Jen's & Floran — Page avis / commentaires (type n°12)
   ============================================================ */

let noteSelectionnee = 0;
let avisCache = [];
let fichiersPhotosAvis = [];

const AVIS_PHOTOS_MAX = 2;
const AVIS_PHOTO_TAILLE_MAX = 5 * 1024 * 1024;
const AVIS_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function apiAvis() {
  if (typeof API_BASE_URL !== "undefined") return API_BASE_URL;
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }
  return "https://jen-hair-api.onrender.com";
}

function messageErreurAvis(reponse, data, fallback) {
  if (reponse?.status === 404) {
    return t("avis.apiUnavailable");
  }
  return data?.error || fallback;
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
        <fieldset class="avis-photos-field">
          <legend>${t("avis.photos")}</legend>
          <p class="avis-photos-hint">${t("avis.photosHint")}</p>
          <p class="avis-photos-login" id="avis-photos-login" hidden>${t("avis.photosLoginRequired")}</p>
          <input type="file" id="avis-photos" class="avis-photos-input" accept="image/jpeg,image/png,image/webp" multiple disabled />
          <p class="avis-photos-count" id="avis-photos-count" hidden></p>
          <div class="avis-photos-preview" id="avis-photos-preview"></div>
        </fieldset>
        <button type="submit" class="btn-order account-submit" id="avis-submit">${t("avis.submit")}</button>
        <p id="avis-form-message" class="account-message" hidden></p>
      </form>
    </section>`;
}

function echapperTexteAvis(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function echapperAttributAvis(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

function blocPhotosAvis(avis) {
  const urls = Array.isArray(avis.imageUrls) ? avis.imageUrls.filter(Boolean) : [];
  if (!urls.length) return "";

  const vignettes = urls
    .map(
      (url) =>
        `<a href="${echapperAttributAvis(url)}" class="avis-photo-link" target="_blank" rel="noopener noreferrer">
          <img src="${echapperAttributAvis(url)}" alt="" loading="lazy" class="avis-photo" />
        </a>`
    )
    .join("");

  return `<div class="avis-photos">${vignettes}</div>`;
}

function extensionPhotoAvis(fichier) {
  const ext = String(fichier.name || "").split(".").pop()?.toLowerCase() || "jpg";
  if (ext === "jpeg" || ext === "jpg") return "jpg";
  if (ext === "png") return "png";
  if (ext === "webp") return "webp";
  return "jpg";
}

function validerFichiersPhotosAvis(fichiers) {
  if (!fichiers.length) return [];

  if (fichiers.length > AVIS_PHOTOS_MAX) {
    throw new Error(t("avis.photosTooMany"));
  }

  fichiers.forEach((fichier) => {
    if (!AVIS_PHOTO_TYPES.includes(fichier.type)) {
      throw new Error(t("avis.photosInvalidType"));
    }
    if (fichier.size > AVIS_PHOTO_TAILLE_MAX) {
      throw new Error(t("avis.photosTooLarge"));
    }
  });

  return fichiers.slice(0, AVIS_PHOTOS_MAX);
}

function rendreApercuPhotosAvis() {
  const preview = document.getElementById("avis-photos-preview");
  const countEl = document.getElementById("avis-photos-count");
  if (!preview) return;

  preview.querySelectorAll("img[src^='blob:']").forEach((img) => {
    URL.revokeObjectURL(img.src);
  });

  if (!fichiersPhotosAvis.length) {
    preview.innerHTML = "";
    if (countEl) countEl.hidden = true;
    return;
  }

  preview.innerHTML = fichiersPhotosAvis
    .map(
      (fichier, index) =>
        `<figure class="avis-photo-preview">
          <img src="${URL.createObjectURL(fichier)}" alt="" />
          <button type="button" class="avis-photo-remove" data-photo-index="${index}" aria-label="${t("avis.photosRemove")}">×</button>
        </figure>`
    )
    .join("");

  if (countEl) {
    countEl.hidden = false;
    countEl.textContent = t("avis.photosSelected", { n: fichiersPhotosAvis.length, max: AVIS_PHOTOS_MAX });
  }
}

function reinitialiserPhotosAvis() {
  fichiersPhotosAvis = [];
  const input = document.getElementById("avis-photos");
  if (input) input.value = "";
  rendreApercuPhotosAvis();
}

async function uploaderPhotosAvis(fichiers, userId) {
  const client = typeof window.clientSupabase !== "undefined" ? window.clientSupabase : null;
  if (!client) throw new Error(t("avis.photosUnavailable"));

  const urls = [];
  for (const fichier of fichiers) {
    const ext = extensionPhotoAvis(fichier);
    const chemin = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { error } = await client.storage.from("review-images").upload(chemin, fichier, {
      cacheControl: "3600",
      upsert: false,
      contentType: fichier.type,
    });
    if (error) throw new Error(error.message);

    const { data } = client.storage.from("review-images").getPublicUrl(chemin);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  return urls;
}

function mettreAJourSectionPhotosAvis(user) {
  const loginMsg = document.getElementById("avis-photos-login");
  const input = document.getElementById("avis-photos");
  if (!loginMsg || !input) return;

  if (user) {
    loginMsg.hidden = true;
    input.disabled = false;
  } else {
    loginMsg.hidden = false;
    input.disabled = true;
    reinitialiserPhotosAvis();
  }
}

function attacherUploadPhotosAvis() {
  const input = document.getElementById("avis-photos");
  const preview = document.getElementById("avis-photos-preview");
  if (!input) return;

  input.addEventListener("change", () => {
    afficherMessageAvis("");
    try {
      const fichiers = validerFichiersPhotosAvis([...input.files]);
      fichiersPhotosAvis = fichiers;
      rendreApercuPhotosAvis();
    } catch (err) {
      reinitialiserPhotosAvis();
      afficherMessageAvis(err.message, "error");
    }
  });

  preview?.addEventListener("click", (e) => {
    const btn = e.target.closest(".avis-photo-remove");
    if (!btn) return;
    const index = Number(btn.dataset.photoIndex);
    if (Number.isNaN(index)) return;
    fichiersPhotosAvis = fichiersPhotosAvis.filter((_, i) => i !== index);
    input.value = "";
    rendreApercuPhotosAvis();
  });
}

function blocReponseAvis(avis) {
  if (!avis.adminReply) return "";
  return `
    <div class="avis-reply">
      <p class="avis-reply-label">${t("avis.replyFrom")}</p>
      <p class="avis-reply-text">${echapperTexteAvis(avis.adminReply)}</p>
      ${avis.repliedAt ? `<p class="avis-reply-date">${formaterDateAvis(avis.repliedAt)}</p>` : ""}
    </div>`;
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
          <p class="avis-author">${echapperTexteAvis(avis.authorName)}</p>
          <p class="avis-date">${formaterDateAvis(avis.createdAt)}</p>
        </div>
        ${etoilesHtml(avis.rating)}
      </div>
      <p class="avis-text">${echapperTexteAvis(avis.comment)}</p>
      ${blocPhotosAvis(avis)}
      ${blocReponseAvis(avis)}
    </article>`
    )
    .join("");
}

async function chargerAvisPublics() {
  const reponse = await fetch(`${apiAvis()}/api/reviews`, { cache: "no-store" });
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(messageErreurAvis(reponse, data, t("avis.loadError")));
  return data.reviews || [];
}

async function preremplirNomAvis() {
  const input = document.getElementById("avis-name");
  let user = null;

  if (typeof obtenirUtilisateur === "function") {
    user = await obtenirUtilisateur();
  }

  mettreAJourSectionPhotosAvis(user);

  if (!input || !user?.email) return;

  const nom =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email.split("@")[0];
  input.value = nom;
  input.placeholder = nom;
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
    let imageUrls = [];
    if (fichiersPhotosAvis.length) {
      if (!userConnecte) {
        afficherMessageAvis(t("avis.photosLoginRequired"), "error");
        return;
      }
      if (submitBtn) submitBtn.textContent = t("avis.uploadingPhotos");
      imageUrls = await uploaderPhotosAvis(fichiersPhotosAvis, userConnecte.id);
    }

    const headers = { "Content-Type": "application/json" };
    if (typeof obtenirTokenAuth === "function") {
      const token = await obtenirTokenAuth();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const payload = {
      authorName: authorName || undefined,
      rating: noteSelectionnee,
      comment,
    };
    if (imageUrls.length) payload.imageUrls = imageUrls;

    const reponse = await fetch(`${apiAvis()}/api/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await reponse.json().catch(() => ({}));
    if (!reponse.ok) throw new Error(messageErreurAvis(reponse, data, t("avis.submitError")));

    avisCache = [data.review, ...avisCache];
    document.getElementById("avis-form")?.reset();
    reinitialiserPhotosAvis();
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
  attacherUploadPhotosAvis();
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
