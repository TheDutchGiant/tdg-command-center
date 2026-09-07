import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const entryId = 7;

const entry = await prisma.randomChallengeEntry.findUnique({
  where: { id: entryId },
});

if (!entry) {
  throw new Error("Entry #7 bestaat niet.");
}

if (!entry.screenshotPath) {
  throw new Error("Entry #7 heeft geen screenshot.");
}

const apiKey =
  process.env.OPENROUTER_API_KEY?.trim();

if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY ontbreekt in .env"
  );
}

const screenshotFile = path.join(
  process.cwd(),
  "public",
  entry.screenshotPath,
);

console.log("========================================");
console.log("VISION REPROCESS ENTRY #7");
console.log("Screenshot:", screenshotFile);
console.log("========================================");

const imageBase64 =
  (
    await fs.readFile(
      screenshotFile,
    )
  ).toString("base64");

const response =
  await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${apiKey}`,
        "Content-Type":
          "application/json",
        "HTTP-Referer":
          "https://www.thedutchgiants.nl",
        "X-Title":
          "TDG Phoenix Challenge OCR",
      },
      body: JSON.stringify({
        model:
          "openrouter/free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
Analyseer deze Clash of Clans screenshot.

Geef uitsluitend geldige JSON terug:
{
  "playerName": string|null,
  "stars": integer|null,
  "destruction": integer|null,
  "timeSeconds": integer|null
}

BELANGRIJK:

1. Zoek de aanvaller rechtsboven.
2. Zoek de challenge/resultaatregel die bij dezezelfde speler hoort.
3. Tel uitsluitend de daadwerkelijk GEVULDE sterren.
4. Een zwarte of lege ster telt NIET mee.
5. Gebruik het vernietigingspercentage NOOIT om het aantal sterren af te leiden.
6. De vaste "0%" rechtsonder van het aanvalsscherm is GEEN challenge-resultaat.
7. Gebruik uitsluitend visueel zichtbare informatie.
8. De tijd moet worden omgerekend naar seconden.
9. Bij twijfel over een veld: null.
10. Antwoord alleen met JSON.
                `.trim(),
              },
              {
                type: "image_url",
                image_url: {
                  url:
                    `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    },
  );

const data =
  await response.json();

if (!response.ok) {
  throw new Error(
    `OpenRouter HTTP ${response.status}: ${JSON.stringify(data)}`
  );
}

const raw =
  data.choices?.[0]?.message?.content ??
  null;

console.log("\n========== MODEL ==========");
console.log(
  data.model ?? "onbekend"
);

console.log("\n========== RAW ==========");
console.log(raw ?? "(geen antwoord)");

let result = null;

if (raw) {
  const match =
    raw.match(/\{[\s\S]*\}/);

  if (match) {
    try {
      result =
        JSON.parse(match[0]);
    } catch {
      result = null;
    }
  }
}

console.log("\n========== JSON ==========");
console.log(
  JSON.stringify(
    result,
    null,
    2,
  )
);

const currentOcr =
  entry.ocrResult &&
  typeof entry.ocrResult === "object"
    ? entry.ocrResult
    : {};

await prisma.randomChallengeEntry.update({
  where: {
    id: entryId,
  },
  data: {
    ocrResult: {
      ...currentOcr,
      visionReprocess: {
        model:
          data.model ??
          "openrouter/free",
        result,
        raw,
        testedAt:
          new Date().toISOString(),
      },
    },
  },
});

console.log(
  "\n✅ Vision-resultaat opgeslagen bij entry #7."
);

await prisma.$disconnect();
