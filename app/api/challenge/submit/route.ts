import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  validateChallengeResult,
} from "@/app/lib/challenge/validateResult";
import { createWorker } from "tesseract.js";

function parseStars(
  text: string
): number | null {
  const matches =
    text.match(/(?:^|\s)([0-3])(?:\s|$)/g);

  if (!matches?.length) {
    return null;
  }

  const values = matches
    .map((value) =>
      Number(value.trim())
    )
    .filter(
      (value) =>
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 3
    );

  return values.length
    ? Math.max(...values)
    : null;
}

function parseDestruction(
  text: string
): number | null {
  const matches =
    text.match(
      /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/g
    );

  if (!matches?.length) {
    return null;
  }

  const values = matches
    .map((value) =>
      Number(
        value
          .replace("%", "")
          .replace(",", ".")
      )
    )
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
    );

  return values.length
    ? Math.max(...values)
    : null;
}

function parseTime(
  text: string
): number | null {
  const match =
    text.match(
      /(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  const minutes =
    Number(match[1]);

  const seconds =
    Number(match[2]);

  if (
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    seconds > 59
  ) {
    return null;
  }

  return (
    minutes * 60 +
    seconds
  );
}

function looksLikeClashResult(
  text: string,
  townHall: number
): boolean {
  const normalized =
    text.toLowerCase();

  const indicators = [
    "stars",
    "star",
    "victory",
    "defeat",
    "percentage",
    "damage",
    "destruction",
    "%",
  ];

  const matches =
    indicators.filter(
      (indicator) =>
        normalized.includes(indicator)
    );

  const townHallDetected =
    normalized.includes(
      `th${townHall}`
    ) ||
    normalized.includes(
      `town hall ${townHall}`
    ) ||
    normalized.includes(
      `townhall ${townHall}`
    );

  return (
    matches.length >= 2 ||
    (
      townHallDetected &&
      matches.length >= 1
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const playerTagValue =
      formData.get("playerTag");

    const playerNameValue =
      formData.get("playerName");

    const screenshot =
      formData.get("screenshot");

    const playerTag =
      typeof playerTagValue === "string"
        ? playerTagValue
            .trim()
            .toUpperCase()
        : "";

    const playerName =
      typeof playerNameValue === "string"
        ? playerNameValue.trim()
        : "";

    if (
      !playerTag ||
      !playerName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Spelergegevens ontbreken.",
        },
        { status: 400 }
      );
    }

    if (
      !screenshot ||
      !(screenshot instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een screenshot is verplicht.",
        },
        { status: 400 }
      );
    }

    if (
      !screenshot.type.startsWith(
        "image/"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het bestand moet een afbeelding zijn.",
        },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE =
      10 * 1024 * 1024;

    if (
      screenshot.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het screenshot mag maximaal 10 MB zijn.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const challenge =
      await prisma.randomChallenge.findFirst({
        where: {
          status: "ACTIVE",
          startsAt: {
            lte: now,
          },
          OR: [
            {
              endsAt: {
                gt: new Date(),
              },
            },
            {
              endsAt: {
                gte: now,
              },
            },
          ],
        },
        orderBy: {
          startsAt: "desc",
        },
      });

    if (!challenge) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Er is momenteel geen actieve Challenge.",
        },
        { status: 409 }
      );
    }

    const existing =
      await prisma.randomChallengeEntry.findUnique({
        where: {
          challengeId_playerTag: {
            challengeId:
              challenge.id,
            playerTag,
          },
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Je hebt al een resultaat voor deze Challenge ingediend.",
        },
        { status: 409 }
      );
    }

    const imageBuffer =
      Buffer.from(
        await screenshot.arrayBuffer()
      );

    const worker =
      await createWorker("eng");

    let ocrText = "";

    try {
      const result =
        await worker.recognize(
          imageBuffer
        );

      ocrText =
        result.data.text;
    } finally {
      await worker.terminate();
    }

    const stars =
      parseStars(ocrText);

    const destruction =
      parseDestruction(ocrText);

    const timeSeconds =
      parseTime(ocrText);

    const clashResultDetected =
      looksLikeClashResult(
        ocrText,
        challenge.townHall
      );

    const screenshotDetected =
      clashResultDetected &&
      stars !== null &&
      destruction !== null;

    const validation =
      validateChallengeResult({
        stars: stars ?? -1,
        destruction:
          destruction ?? -1,
        timeSeconds,
        screenshotDetected,
      });

    const entry =
      await prisma.randomChallengeEntry.create({
        data: {
          challengeId:
            challenge.id,

          playerTag,

          playerName,

          status:
            validation.needsReview
              ? "PENDING"
              : "APPROVED",

          ocrResult: {
            text: ocrText,
            clashResultDetected,
            stars,
            destruction,
            timeSeconds,
            validation,
          },

          adminNote:
            validation.reason,

          reviewedAt:
            validation.needsReview
              ? null
              : now,
        },
      });

    if (
      validation.valid
    ) {
      await prisma.randomChallengeResult.create({
        data: {
          entryId: entry.id,
          stars: stars!,
          destruction:
            destruction!,
          timeSeconds,
          score:
            validation.score,
        },
      });
    }

    return NextResponse.json({
      success: true,

      status:
        entry.status,

      stars,

      destruction,

      timeSeconds,

      score:
        validation.valid
          ? validation.score
          : null,

      needsReview:
        validation.needsReview,

      message:
        validation.needsReview
          ? "🟡 Phoenix kon het screenshot niet volledig automatisch valideren. De inzending staat klaar voor controle."
          : "🟢 Phoenix heeft je resultaat automatisch gevalideerd!",
    });
  } catch (error) {
    console.error(
      "Challenge OCR submission error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Phoenix kon het screenshot niet verwerken.",
      },
      { status: 500 }
    );
  }
}
