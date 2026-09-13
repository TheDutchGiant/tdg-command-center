export async function getCwlWorkingSeason(): Promise<string> {
  const now = new Date();

  let year = now.getFullYear();
  let month = now.getMonth() + 2;

  if (month === 13) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}
