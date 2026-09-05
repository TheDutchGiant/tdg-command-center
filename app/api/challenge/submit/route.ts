import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  validateChallengeResult,
} from "@/app/lib/challenge/validateResult";
import { recalculateChallengeRanking } from "@/app/lib/challenge/ranking";
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
  /*
   * De screenshot wordt gemaakt op het moment dat
   * de aanval begint.
   *
   * De zichtbare Clash-tijd is daarom de totale
   * duur van de aanval.
   *
   * Voorbeeld:
   * "2M 19S" => 139 seconden
   *
   * OCR kan ook "2:19" opleveren.
   */

  const minuteSecondMatch =
    text.match(
      /(\d{1,2})\s*[mM]\s*(\d{1,2})\s*[sS]?/
    );

  if (minuteSecondMatch) {
    const minutes =
      Number(minuteSecondMatch[1]);

    const seconds =
      Number(minuteSecondMatch[2]);

    if (
      Number.isFinite(minutes) &&
      Number.isFinite(seconds) &&
      minutes >= 0 &&
      seconds >= 0 &&
      seconds <= 59
    ) {
      return (
        minutes * 60 +
        seconds
      );
    }
  }

  const colonMatch =
    text.match(
      /(\d{1,2}):(\d{2})/
    );

  if (colonMatch) {
    const minutes =
      Number(colonMatch[1]);

    const seconds =
      Number(colonMatch[2]);

    if (
      Number.isFinite(minutes) &&
      Number.isFinite(seconds) &&
      minutes >= 0 &&
      seconds >= 0 &&
      seconds <= 59
    ) {
      return (
        minutes * 60 +
        seconds
      );
    }
  }

  return null;
}


function normalizePlayerName(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /[^a-z0-9\u0400-\u04ff]/gi,
      "",
    )
    .toLowerCase();
}

function nameSimilarity(
  a: string,
  b: string,
): number {
  const left = normalizePlayerName(a);
  const right = normalizePlayerName(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= right.length; j += 1) {
      const cost =
        left[i - 1] === right[j - 1] ? 0 : 1;

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  const distance = previous[right.length];
  const longestLength = Math.max(
    left.length,
    right.length,
  );

  return longestLength === 0
    ? 0
    : 1 - distance / longestLength;
}

function namesArePotentiallyTheSameAccount(
  a: string,
  b: string,
): boolean {
  const left = normalizePlayerName(a);
  const right = normalizePlayerName(b);

  if (left.length < 4 || right.length < 4) {
    return false;
  }

  if (left === right) {
    return true;
  }

  if (
    left.includes(right) ||
    right.includes(left)
  ) {
    return true;
  }

  return nameSimilarity(left, right) >= 0.8;
}

function findPlayerNameLines(
  text: string,
): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/\s+/g, " "),
    )
    .filter(
      (line) =>
        line.length >= 2 &&
        line.length <= 32,
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

    const challengeIdValue =
      formData.get("challengeId");

    const difficultyValue =
      formData.get("difficulty");

    const screenshot =
      formData.get("screenshot");

    const challengeId =
      typeof challengeIdValue === "string"
        ? Number(
            challengeIdValue,
          )
        : NaN;

    const difficulty =
      typeof difficultyValue === "string"
        ? difficultyValue.trim()
        : "";

    if (
      !Number.isInteger(
        challengeId,
      ) ||
      challengeId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De Challenge kon niet worden bepaald.",
        },
        { status: 400 }
      );
    }

    if (
      !difficulty
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De gekozen moeilijkheid kon niet worden bepaald.",
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

    const now =
      new Date();

    /*
     * Zoek exact de Challenge die vanuit de
     * pagina is meegestuurd.
     *
     * Niet meer:
     * "pak maar de laatste actieve Challenge".
     */
    const challenge =
      await prisma.randomChallenge.findFirst({
        where: {
          id:
            challengeId,
          status:
            "ACTIVE",
          startsAt: {
            lte: now,
          },
          endsAt: {
            gt: now,
          },
        },
      });

    if (!challenge) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze Challenge is niet meer actief of bestaat niet.",
        },
        { status: 409 }
      );
    }

    /*
     * Zoek exact de gekozen variant binnen
     * deze Challenge.
     */
    const variant =
      await prisma.randomChallengeVariant.findUnique({
        where: {
          challengeId_difficulty: {
            challengeId:
              challenge.id,
            difficulty,
          },
        },
      });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De gekozen army-variant bestaat niet binnen deze Challenge.",
        },
        { status: 400 }
      );
    }

    const imageBuffer =
      Buffer.from(
        await screenshot.arrayBuffer()
      );

    const fs =
      await import("node:fs/promises");

    const path =
      await import("node:path");

    const crypto =
      await import("node:crypto");

    const uploadDirectory =
      path.join(
        process.cwd(),
        "public",
        "uploads",
        "random-challenge",
        String(challenge.id),
      );

    await fs.mkdir(
      uploadDirectory,
      { recursive: true },
    );

    const extension =
      screenshot.type === "image/png"
        ? "png"
        : screenshot.type === "image/webp"
          ? "webp"
          : "jpg";

    const filename =
      `${crypto.randomUUID()}.${extension}`;

    const screenshotFile =
      path.join(
        uploadDirectory,
        filename,
      );

    await fs.writeFile(
      screenshotFile,
      imageBuffer,
    );

    const screenshotPath =
      `/uploads/random-challenge/${challenge.id}/${filename}`;

    const worker =
      await createWorker("eng");

    let ocrText =
      "";

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
      parseStars(
        ocrText
      );

    const destruction =
      parseDestruction(
        ocrText
      );

    const timeSeconds =
      parseTime(
        ocrText
      );

    const clashResultDetected =
      looksLikeClashResult(
        ocrText,
        challenge.townHall
      );

    /*
     * Probeer de spelernaam uit de OCR te koppelen
     * aan de bestaande Player-tabel.
     *
     * We gebruiken daarbij alleen de genormaliseerde
     * letters/cijfers. Accenten, emoji's en leestekens
     * worden genegeerd omdat OCR daar onbetrouwbaar
     * mee kan omgaan.
     */
    const ocrLines =
      findPlayerNameLines(
        ocrText,
      );

    const players =
      await prisma.player.findMany({
        select: {
          playerTag: true,
          currentName: true,
        },
      });

    const playerMatches =
      players.filter(
        (player) => {
          const playerName =
            normalizePlayerName(
              player.currentName,
            );

          if (playerName.length < 2) {
            return false;
          }

          return ocrLines.some((line) => {
            const normalizedLine =
              normalizePlayerName(line);

            if (normalizedLine.length < 2) {
              return false;
            }

            if (normalizedLine === playerName) {
              return true;
            }

            if (
              normalizedLine.length >=
                playerName.length &&
              normalizedLine.includes(playerName)
            ) {
              return true;
            }

            if (
              playerName.length >= 5 &&
              playerName.includes(normalizedLine)
            ) {
              return true;
            }

            return (
              normalizedLine.length >= 5 &&
              playerName.length >= 5 &&
              nameSimilarity(
                normalizedLine,
                playerName,
              ) >= 0.85
            );
          });
        },
      );

    /*
     * Extra veiligheidscontrole voor meerdere accounts
     * met dezelfde of bijna dezelfde naam.
     *
     * Voorbeeld:
     *   Maarten
     *   Maarten2
     *   Maarten_18
     *
     * Phoenix mag hier nooit gokken.
     * In zo'n situatie gaat de inzending naar PENDING
     * zodat een admin de juiste playerTag kan kiezen.
     */
    const possibleNameConflicts =
      players.filter((player) =>
        ocrLines.some((line) =>
          namesArePotentiallyTheSameAccount(
            line,
            player.currentName,
          ),
        ),
      );

    const candidatePlayerTags =
      [
        ...new Set([
          ...playerMatches.map(
            (player) => player.playerTag,
          ),
          ...possibleNameConflicts.map(
            (player) => player.playerTag,
          ),
        ]),
      ];

    const uniquePlayerTags =
      candidatePlayerTags;

    const playerNameMatchStatus =
      uniquePlayerTags.length === 1
        ? possibleNameConflicts.length > 1
          ? "AMBIGUOUS"
          : "UNIQUE"
        : uniquePlayerTags.length > 1
          ? "AMBIGUOUS"
          : "NOT_FOUND";

    const playerNameMatch =
      playerNameMatchStatus === "UNIQUE"
        ? players.find(
            (player) =>
              player.playerTag ===
              uniquePlayerTags[0],
          ) ?? null
        : null;

    const playerNameReviewRequired =
      playerNameMatch === null;

    const matchedPlayerTag =
      playerNameMatch?.playerTag ?? null;

    const matchedPlayerName =
      playerNameMatch?.currentName ??
      ocrLines.find((line) =>
        playerMatches.some(
          (player) =>
            player.currentName ===
            line,
        ),
      ) ??
      ocrLines[0] ??
      null;

    const screenshotDetected =
      clashResultDetected &&
      stars !== null &&
      destruction !== null;

    const validation =
      validateChallengeResult({
        stars:
          stars ?? -1,
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

          playerTag:
            matchedPlayerTag ??
            `OCR:${normalizePlayerName(
              matchedPlayerName ?? "unknown",
            )}`,

          playerName:
            matchedPlayerName ??
            "Onbekende speler",

          difficulty,

          screenshotPath,

          status:
            validation.needsReview ||
            playerNameReviewRequired
              ? "PENDING"
              : "APPROVED",

          ocrResult: {
            text:
              ocrText,

            clashResultDetected,

            stars,

            destruction,

            timeSeconds,

            selectedDifficulty:
              variant.difficulty,

            selectedVariantId:
              variant.id,

            sourceArmyId:
              variant.sourceArmyId,

            sourceArmyName:
              variant.sourceArmyName,

            playerNameMatchStatus,

            playerNameFromDatabase:
              playerNameMatch?.currentName ??
              null,

            playerNameFromScreenshot:
              playerNameMatch?.currentName ??
              null,

            playerNameCandidates:
              playerMatches.map(
                (player) => ({
                  playerTag:
                    player.playerTag,
                  currentName:
                    player.currentName,
                }),
              ),

            validation,
          },

          adminNote:
            playerNameReviewRequired
              ? `${validation.reason} Spelernaam kon niet eenduidig automatisch worden gekoppeld (${playerNameMatchStatus}).`
              : validation.reason,

          reviewedAt:
            validation.needsReview ||
            playerNameReviewRequired
              ? null
              : now,
        },
      });

    if (
      validation.valid &&
      !playerNameReviewRequired
    ) {
      await prisma.randomChallengeResult.create({
        data: {
          entryId:
            entry.id,

          stars:
            stars!,

          destruction:
            destruction!,

          timeSeconds,

          score:
            validation.score,

          randomChallengeId:
            challenge.id,
        },
      });

      await recalculateChallengeRanking(
        challenge.id,
        variant.difficulty,
      );
    }

    const response = NextResponse.json({
      success:
        true,

      status:
        entry.status,

      stars,

      destruction,

      timeSeconds,

      score:
        validation.valid
          ? validation.score
          : null,

      selectedDifficulty:
        variant.difficulty,

      selectedVariantId:
        variant.id,

      needsReview:
        validation.needsReview ||
        playerNameReviewRequired,

      playerNameMatchStatus,

      matchedPlayer:
        playerNameMatch
          ? {
              playerTag:
                playerNameMatch.playerTag,
              currentName:
                playerNameMatch.currentName,
            }
          : null,

      message:
        validation.needsReview ||
        playerNameReviewRequired
          ? "🟡 Inzending ontvangen. Phoenix controleert deze."
          : "🟢 Phoenix heeft je resultaat automatisch gevalideerd!",
    });

    /*
     * Wanneer Phoenix de spelernaam automatisch
     * aan een bestaande Player heeft gekoppeld,
     * onthouden we de playerTag in een cookie.
     *
     * De cookie wordt alleen gebruikt om de eigen
     * positie op het publieke leaderboard te tonen.
     * De ranking zelf komt altijd uit de database.
     */
    if (playerNameMatch?.playerTag) {
      response.cookies.set(
        "tdg_challenge_player_tag",
        playerNameMatch.playerTag,
        {
          httpOnly: true,
          sameSite: "lax",
          secure:
            process.env.NODE_ENV ===
            "production",
          path: "/",
          maxAge:
            60 * 60 * 24 * 30,
        },
      );
    }

    return response;
  } catch (error) {
    console.error(
      "Challenge OCR submission error:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Phoenix kon het screenshot niet verwerken.",
      },
      { status: 500 }
    );
  }
}

