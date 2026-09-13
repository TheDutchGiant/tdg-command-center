export async function getCwlWorkingSeason(): Promise<string> {
  return new Date().toISOString().slice(0, 7);
}
