/* Notes de déplacement annuaire — affichage du texte traduit tel quel */

function htmlNotesDeplacement(travelAvailable, rawNotes, prefix, echapper) {
  if (!travelAvailable) return "";

  const notes = String(rawNotes || "").trim();
  if (!notes) return "";

  return `<p class="coiffeuse-travel-notes">${echapper(notes)}</p>`;
}

function mettreAJourVisibiliteChampsDeplacement(form) {
  if (!form) return;

  const bloc = form.querySelector(".coiffeuses-travel-details");
  if (!bloc) return;

  const travelOui = form.querySelector('input[name="travelAvailable"][value="yes"]');
  const visible = !!travelOui?.checked;
  const champ = bloc.querySelector('[name="travelNotes"]');

  bloc.hidden = !visible;
  if (champ) {
    champ.required = visible;
    if (!visible) champ.setCustomValidity("");
  }
}

function attacherBasculerChampsDeplacement(form) {
  if (!form || form.dataset.travelToggleBound === "1") return;
  form.dataset.travelToggleBound = "1";

  form.querySelectorAll('input[name="travelAvailable"]').forEach((radio) => {
    radio.addEventListener("change", () => mettreAJourVisibiliteChampsDeplacement(form));
  });

  mettreAJourVisibiliteChampsDeplacement(form);
}

function htmlChampsDeplacementAnnuaire(prefix, echapper) {
  return `
    <label class="field coiffeuses-field--large coiffeuses-travel-details" hidden>
      <span>${echapper(typeof t === "function" ? t(`${prefix}.travelNotes`) : "Travel details")} *</span>
      <textarea
        class="coiffeuses-textarea coiffeuses-textarea--xlarge"
        name="travelNotes"
        minlength="2"
        maxlength="500"
        rows="5"
        placeholder="${echapper(typeof t === "function" ? t(`${prefix}.travelNotesHint`) : "")}"
      ></textarea>
    </label>`;
}

window.htmlNotesDeplacement = htmlNotesDeplacement;
window.htmlChampsDeplacementAnnuaire = htmlChampsDeplacementAnnuaire;
window.attacherBasculerChampsDeplacement = attacherBasculerChampsDeplacement;
window.mettreAJourVisibiliteChampsDeplacement = mettreAJourVisibiliteChampsDeplacement;
