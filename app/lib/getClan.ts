export default async function getClan(tag: string) {
  const res = await fetch(`http://localhost:3000/api/clan/${tag}`, {
    cache: "no-store",
  });

  const clan = await res.json();

  if (clan.error) {
    throw new Error("Clan niet gevonden.");
  }

  return clan;
}