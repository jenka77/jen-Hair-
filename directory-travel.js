/* Notes de déplacement annuaire — sérialisation, parsing legacy, affichage i18n */

const LEGACY_TRAVEL_LABELS = {
  area: [
    /(?:^|\*|\n)\s*Zone de service\s*:\s*(.+?)(?=\s*(?:\*|\n|$|Frais de déplacement|Anfahrtskosten|Travel fee|Conditions|Bedingungen))/is,
    /(?:^|\*|\n)\s*Servicebereich\s*:\s*(.+?)(?=\s*(?:\*|\n|$|Anfahrtskosten|Frais de déplacement|Travel fee|Bedingungen|Conditions))/is,
    /(?:^|\*|\n)\s*Service area\s*:\s*(.+?)(?=\s*(?:\*|\n|$|Travel fee|Frais de déplacement|Anfahrtskosten|Conditions|Bedingungen))/is,
  ],
  fee: [
    /(?:^|\*|\n)\s*Frais de déplacement\s*:\s*(.+?)(?=\s*(?:\*|\n|$|Conditions|Bedingungen))/is,
    /(?:^|\*|\n)\s*Anfahrtskosten\s*:\s*(.+?)(?=\s*(?:\*|\n|$|Bedingungen|Conditions))/is,
    /(?:^|\*|\n)\s*Travel fee\s*:\s*(.+?)(?=\s*(?:\*|\n|$|Conditions|Bedingungen))/is,
  ],
  conditions: [
    /(?:^|\*|\n)\s*Conditions\s*:\s*(.+?)(?=\s*(?:\*|\n|$))/is,
    /(?:^|\*|\n)\s*Bedingungen\s*:\s*(.+?)(?=\s*(?:\*|\n|$))/is,
  ],
};

function nettoyerValeurNoteDeplacement(valeur) {
  return String(valeur || "")
    .replace(/^\*+\s*/, "")
    .replace(/\*+\s*$/, "")
    .trim();
}

function parserNotesDeplacementJson(raw) {
  if (!raw || !raw.trim().startsWith("{")) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    const area = nettoyerValeurNoteDeplacement(o.area);
    const fee = nettoyerValeurNoteDeplacement(o.fee);
    const conditions = nettoyerValeurNoteDeplacement(o.conditions);
    if (!area && !fee && !conditions) return null;
    return { area, fee, conditions };
  } catch {
    return null;
  }
}

function parserNotesDeplacementLegacy(raw) {
  const texte = String(raw || "").trim();
  if (!texte) return null;

  const result = { area: "", fee: "", conditions: "" };
  for (const [cle, patterns] of Object.entries(LEGACY_TRAVEL_LABELS)) {
    for (const regex of patterns) {
      const match = texte.match(regex);
      if (match?.[1]) {
        result[cle] = nettoyerValeurNoteDeplacement(match[1]);
        break;
      }
    }
  }

  if (result.area || result.fee || result.conditions) return result;
  return null;
}

function parserNotesDeplacement(raw) {
  return parserNotesDeplacementJson(raw) || parserNotesDeplacementLegacy(raw);
}

function serialiserNotesDeplacement(area, fee, conditions) {
  return JSON.stringify({
    area: nettoyerValeurNoteDeplacement(area),
    fee: nettoyerValeurNoteDeplacement(fee),
    conditions: nettoyerValeurNoteDeplacement(conditions),
  });
}

function lireNotesDeplacementDepuisFormulaire(form) {
  const area = form.querySelector('[name="travelNoteArea"]')?.value.trim() || "";
  const fee = form.querySelector('[name="travelNoteFee"]')?.value.trim() || "";
  const conditions = form.querySelector('[name="travelNoteConditions"]')?.value.trim() || "";
  return { area, fee, conditions };
}

function htmlNotesDeplacement(travelAvailable, rawNotes, prefix, echapper) {
  if (!travelAvailable) return "";

  const parsed = parserNotesDeplacement(rawNotes);
  if (parsed) {
    const lignes = [];
    if (parsed.area) {
      lignes.push(
        `<dt>${echapper(typeof t === "function" ? t(`${prefix}.travelNoteArea`) : "Area")}</dt>`,
        `<dd>${echapper(parsed.area)}</dd>`
      );
    }
    if (parsed.fee) {
      lignes.push(
        `<dt>${echapper(typeof t === "function" ? t(`${prefix}.travelNoteFee`) : "Fee")}</dt>`,
        `<dd>${echapper(parsed.fee)}</dd>`
      );
    }
    if (parsed.conditions) {
      lignes.push(
        `<dt>${echapper(typeof t === "function" ? t(`${prefix}.travelNoteConditions`) : "Conditions")}</dt>`,
        `<dd>${echapper(parsed.conditions)}</dd>`
      );
    }
    if (!lignes.length) return "";
    return `<dl class="coiffeuse-travel-notes">${lignes.join("")}</dl>`;
  }

  const notes = String(rawNotes || "").trim();
  if (!notes) return "";
  return `<p class="coiffeuse-travel-notes coiffeuse-travel-notes--legacy">${echapper(notes)}</p>`;
}

function mettreAJourVisibiliteChampsDeplacement(form, detailsId) {
  if (!form) return;
  const bloc = form.querySelector(`#${detailsId}`);
  if (!bloc) return;

  const travelOui = form.querySelector('input[name="travelAvailable"][value="yes"]');
  const visible = !!travelOui?.checked;

  bloc.hidden = !visible;
  bloc.querySelectorAll("input, textarea").forEach((el) => {
    el.required = visible;
    if (!visible) el.setCustomValidity("");
  });
}

function attacherBasculerChampsDeplacement(form, detailsId) {
  if (!form || form.dataset.travelToggleBound === "1") return;
  form.dataset.travelToggleBound = "1";

  form.querySelectorAll('input[name="travelAvailable"]').forEach((radio) => {
    radio.addEventListener("change", () => mettreAJourVisibiliteChampsDeplacement(form, detailsId));
  });

  mettreAJourVisibiliteChampsDeplacement(form, detailsId);
}

function htmlChampsDeplacementAnnuaire(prefix, echapper) {
  return `
    <div id="${prefix}-travel-details" class="coiffeuses-travel-details" hidden>
      <p class="coiffeuses-field-hint">${echapper(typeof t === "function" ? t(`${prefix}.travelNotesIntro`) : "")}</p>
      <label class="field">
        <span>${echapper(typeof t === "function" ? t(`${prefix}.travelNoteArea`) : "Area")} *</span>
        <input class="coiffeuses-input" type="text" name="travelNoteArea" minlength="2" maxlength="160" placeholder="${echapper(typeof t === "function" ? t(`${prefix}.travelNoteAreaHint`) : "")}" />
      </label>
      <label class="field">
        <span>${echapper(typeof t === "function" ? t(`${prefix}.travelNoteFee`) : "Fee")} *</span>
        <input class="coiffeuses-input" type="text" name="travelNoteFee" minlength="2" maxlength="160" placeholder="${echapper(typeof t === "function" ? t(`${prefix}.travelNoteFeeHint`) : "")}" />
      </label>
      <label class="field">
        <span>${echapper(typeof t === "function" ? t(`${prefix}.travelNoteConditions`) : "Conditions")} *</span>
        <input class="coiffeuses-input" type="text" name="travelNoteConditions" minlength="2" maxlength="160" placeholder="${echapper(typeof t === "function" ? t(`${prefix}.travelNoteConditionsHint`) : "")}" />
      </label>
    </div>`;
}

function validerChampsDeplacement(form, prefix) {
  const travelOui = form.querySelector('input[name="travelAvailable"][value="yes"]')?.checked;
  if (!travelOui) return "";

  const { area, fee, conditions } = lireNotesDeplacementDepuisFormulaire(form);
  if (area.length < 2) return typeof t === "function" ? t(`${prefix}.validation.travelNoteArea`) : "";
  if (fee.length < 2) return typeof t === "function" ? t(`${prefix}.validation.travelNoteFee`) : "";
  if (conditions.length < 2) return typeof t === "function" ? t(`${prefix}.validation.travelNoteConditions`) : "";
  return "";
}

window.parserNotesDeplacement = parserNotesDeplacement;
window.serialiserNotesDeplacement = serialiserNotesDeplacement;
window.htmlNotesDeplacement = htmlNotesDeplacement;
window.htmlChampsDeplacementAnnuaire = htmlChampsDeplacementAnnuaire;
window.attacherBasculerChampsDeplacement = attacherBasculerChampsDeplacement;
window.mettreAJourVisibiliteChampsDeplacement = mettreAJourVisibiliteChampsDeplacement;
window.validerChampsDeplacement = validerChampsDeplacement;
window.lireNotesDeplacementDepuisFormulaire = lireNotesDeplacementDepuisFormulaire;
