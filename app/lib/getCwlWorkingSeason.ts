export async function getCwlWorkingSeason(): Promise<string> {
  const now = new Date();

  /*
   * De CWL-beheer-/aanmeldcyclus loopt van de 20e
   * van een maand t/m de 19e van de volgende maand.
   *
   * Voorbeelden:
   * 23 september 2026 -> CWL 2026-10
   * 5 oktober 2026    -> CWL 2026-10
   * 19 oktober 2026   -> CWL 2026-10
   * 20 oktober 2026   -> CWL 2026-11
   */

  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (now.getDate() >= 20) {
    month += 1;

    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}
