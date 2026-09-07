import fs from "node:fs/promises";

export type VisionChallengeResult = {
  playerName: string | null;
  stars: number | null;
  destruction: number | null;
  timeSeconds: number | null;
};

const FREE_VISION_MODEL =
  "google/gemma-4-26b-a4b-it:free";

function extractJson(
  text: string,
): VisionChallengeResult | null {
  const match =
    text.match(
      /\{[\s\S]*\}/,
    );

  if (!match) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        match[0],
      );

    const stars =
      Number.isInteger(
        parsed.stars,
      ) &&
      parsed.stars >= 0 &&
      parsed.stars <= 3
        ? parsed.stars
        : null;

    const destruction =
      Number.isInteger(
        parsed.destruction,
      ) &&
      parsed.destruction >= 0 &&
      parsed.destruction <= 100
        ? parsed.destruction
        : null;

    const timeSeconds =
      Number.isInteger(
        parsed.timeSeconds,
      ) &&
      parsed.timeSeconds >= 0 &&
      parsed.timeSeconds <= 600
        ? parsed.timeSeconds
        : null;

    const playerName =
      typeof parsed.playerName === "string" &&
      parsed.playerName.trim()
        ? parsed.playerName.trim()
        : null;

    return {
      playerName,
      stars,
      destruction,
      timeSeconds,
    };
  } catch {
    return null;
  }
}

export async function analyzeChallengeScreenshot(
  screenshotFile: string,
): Promise<{
  result: VisionChallengeResult | null;
  raw: string | null;
  model: string;
  error: string | null;
}> {
  const apiKey =
    process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return {
      result: null,
      raw: null,
      model: FREE_VISION_MODEL,
      error:
        "OPENROUTER_API_KEY ontbreekt.",
    };
  }

  try {
    const imageBuffer =
      await fs.readFile(
        screenshotFile,
      );

    const imageBase64 =
      imageBuffer.toString(
        "base64",
      );

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
              FREE_VISION_MODEL,
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

BELANGRIJKE REGELS:

1. Zoek de aanvaller rechtsboven.
2. Zoek de challenge/resultaatregel die bij DIEZELFDE speler hoort.
3. Tel uitsluitend de daadwerkelijk GEVULDE sterren.
4. Een zwarte of lege ster telt NIET mee.
5. Gebruik het percentage NOOIT om het aantal sterren af te leiden.
6. De vaste "0%" rechtsonder van de Clash-interface is GEEN challenge-resultaat.
7. Gebruik alleen informatie die daadwerkelijk visueel zichtbaar is.
8. De zichtbare aanvalstijd moet in seconden worden teruggegeven.
9. "Herhaling eindigt over" is alleen de aanvalstijd wanneer dit daadwerkelijk de zichtbare aanvalstijd is.
10. Bij twijfel over een veld: gebruik null.
11. Antwoord uitsluitend met JSON.
                    `.trim(),
                  },
                  {
                    type:
                      "image_url",
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

    if (!response.ok) {
      return {
        result: null,
        raw: null,
        model: FREE_VISION_MODEL,
        error:
          `OpenRouter HTTP ${response.status}`,
      };
    }

    const data =
      (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

    const raw =
      data.choices?.[0]?.message?.content ??
      null;

    return {
      result:
        raw
          ? extractJson(raw)
          : null,
      raw,
      model:
        FREE_VISION_MODEL,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      raw: null,
      model:
        FREE_VISION_MODEL,
      error:
        error instanceof Error
          ? error.message
          : "Onbekende OpenRouter-fout.",
    };
  }
}
