export function getCwlDisplaySeason(): string {
  const now = new Date();

  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  /*
   * 1 t/m 10:
   * toon de selectie van de zojuist afgelopen CWL-maand.
   *
   * Vanaf de 11e:
   * toon de selectie voor de volgende CWL.
   *
   * Voorbeeld:
   * 15 september 2026 -> 2026-10
   * 5 september 2026  -> 2026-08
   */

  if (now.getDate() <= 10) {
    month -= 1;

    if (month === 0) {
      month = 12;
      year -= 1;
    }
  } else {
    month += 1;

    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}
