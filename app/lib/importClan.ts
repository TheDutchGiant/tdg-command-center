import { fetchClash } from "@/app/lib/clash";

export async function importClan(
  tag: string
) {
  try {
    const league = await fetchClash(
      `/clans/%23${tag}/currentwar/leaguegroup`
    );

    return {
      active: true,
      league,
    };

  } catch {
    return {
      active: false,
      league: null,
    };
  }
}