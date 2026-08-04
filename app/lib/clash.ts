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