export function getCwlDisplaySeason(): string {
  const now = new Date();

  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  /*
   * De selectie is zichtbaar zodra deze FINAL is gemaakt.
   *
   * 1 t/m 10:
   * toon de CWL die op dat moment wordt gespeeld.
   *
   * Vanaf de 11e:
   * die CWL is afgelopen en tonen we de volgende CWL.
   *
   * Voorbeeld:
   * 23 september 2026 -> 2026-10
   * 5 oktober 2026    -> 2026-10
   * 11 oktober 2026   -> 2026-11
   */

  if (now.getDate() > 10) {
    month += 1;

    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}
