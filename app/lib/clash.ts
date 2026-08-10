const BASE_URL = "https://api.clashofclans.com/v1";

function getToken() {
  const token = process.env.CLASH_API_TOKEN;

  if (!token) {
    throw new Error("CLASH_API_TOKEN ontbreekt in .env");
  }

  return token;
}

export async function fetchClash(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Clash API fout (${response.status}): ${await response.text()}`
    );
  }

  return response.json();
}

function normalizeClanTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

type ClashLocation = {
  id: number;
  name: string;
  isCountry: boolean;
  countryCode?: string;
};

async function findNetherlandsLocation(): Promise<number> {
  let after: string | undefined;

  for (let page = 0; page < 10; page++) {
    const endpoint = after
      ? `/locations?limit=100&after=${encodeURIComponent(after)}`
      : "/locations?limit=100";

    const response = await fetchClash(endpoint);

    const locations: ClashLocation[] = response.items ?? [];

    const netherlands = locations.find(
      (location) =>
        location.isCountry === true &&
        location.countryCode?.toUpperCase() === "NL"
    );

    if (netherlands) {
      return netherlands.id;
    }

    after = response.paging?.cursors?.after;

    if (!after) {
      break;
    }
  }

  throw new Error("Nederland niet gevonden in Clash API locaties.");
}

export async function fetchNetherlandsClanRanking(
  clanTag: string
): Promise<number | null> {
  const netherlandsLocationId = await findNetherlandsLocation();

  const rankings = await fetchClash(
    `/locations/${netherlandsLocationId}/rankings/clans?limit=200`
  );

  const wantedTag = normalizeClanTag(clanTag);

  const clan = rankings.items?.find(
    (item: { tag?: string; rank?: number }) =>
      normalizeClanTag(item.tag ?? "") === wantedTag
  );

  return clan?.rank ?? null;
}

export function parseClashDate(value: string): Date {
  if (!value) {
    throw new Error("Lege Clash datum ontvangen.");
  }

  const iso =
    value.substring(0, 4) +
    "-" +
    value.substring(4, 6) +
    "-" +
    value.substring(6, 8) +
    "T" +
    value.substring(9, 11) +
    ":" +
    value.substring(11, 13) +
    ":" +
    value.substring(13, 15) +
    ".000Z";

  return new Date(iso);
}