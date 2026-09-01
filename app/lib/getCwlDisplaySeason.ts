export function getCwlDisplaySeason(): string {
  const now = new Date();

  /*
   * T/m de 10e tonen we de definitieve selectie
   * van de vorige maand.
   *
   * Vanaf de 11e begint de nieuwe actieve cyclus.
   */

  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (now.getDate() <= 10) {
    month -= 1;

    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}
