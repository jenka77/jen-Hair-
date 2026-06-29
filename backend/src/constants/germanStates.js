const GERMAN_STATE_SLUGS = [
  "baden-wuerttemberg",
  "bayern",
  "berlin",
  "brandenburg",
  "bremen",
  "hamburg",
  "hessen",
  "mecklenburg-vorpommern",
  "niedersachsen",
  "nordrhein-westfalen",
  "rheinland-pfalz",
  "saarland",
  "sachsen",
  "sachsen-anhalt",
  "schleswig-holstein",
  "thueringen",
];

const GERMAN_STATE_SLUG_SET = new Set(GERMAN_STATE_SLUGS);

function estLandAllemandValide(slug) {
  return GERMAN_STATE_SLUG_SET.has(slug);
}

module.exports = { GERMAN_STATE_SLUGS, estLandAllemandValide };
