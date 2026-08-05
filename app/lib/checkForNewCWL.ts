import { fetchClash } from "@/app/lib/clash";
import { PHOENIX } from "./config";

export async function checkForNewCWL() {
  console.log("Zoeken naar een actieve CWL...");

  try {
    const primaryClan = PHOENIX.clans.find(
     (clan) => clan.primary
  );

  if (!primaryClan) {
  throw new Error("Geen primary clan ingesteld.");
  }

  const league = await fetchClash(
    `/clans/%23${primaryClan.tag}/currentwar/leaguegroup`
  );

  console.log(`✅ Actieve CWL gevonden: ${league.season}`);

    return league;
  } catch {
    console.log("😴 Geen actieve CWL gevonden.");

    return null;
  }
}