export function parseClashDate(date: string): Date {
  const year = Number(date.substring(0, 4));
  const month = Number(date.substring(4, 6)) - 1;
  const day = Number(date.substring(6, 8));

  const hour = Number(date.substring(9, 11));
  const minute = Number(date.substring(11, 13));
  const second = Number(date.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}