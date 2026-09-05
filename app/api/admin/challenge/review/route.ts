import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";
import { recalculateChallengeRanking } from "@/app/lib/challenge/ranking";

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]/gi, "")
    .toLowerCase();
}

function similarity(a: string, b: string) {
  const left = normalizeName(a);
  const right = normalizeName(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= right.length; j += 1) {
      const cost =
        left[i - 1] === right[j - 1]
          ? 0
          : 1;

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
  const longest = Math.max(
    left.length,
    right.length,
  );

  return longest === 0
    ? 0
    : 1 - distance / longest;
}

function getCandidateScore(
  ocrName: string,
  playerName: string,
) {
  const left = normalizeName(ocrName);
  const right = normalizeName(playerName);

  if (!left || !right) return 0;

  if (left === right) return 1;

  if (
    left.includes(right) ||
    right.includes(left)
  ) {
    return 0.95;
  }

  return similarity(left, right);
}

export async function GET() {
  try {
    await requireAdmin();

    const pendingEntries =
      await prisma.randomChallengeEntry.findMany({
        where: {
          status: "PENDING",
        },
        orderBy: {
          submittedAt: "asc",
        },
        select: {
          id: true,
          challengeId: true,
          playerTag: true,
          playerName: true,
          difficulty: true,
          screenshotPath: true,
          ocrResult: true,
          adminNote: true,
          submittedAt: true,
          challenge: {
            select: {
              id: true,
              title: true,
              startsAt: true,
              endsAt: true,
              status: true,
            },
          },
          result: {
            select: {
              id: true,
            },
          },
        },
      });

    const players =
      await prisma.player.findMany({
        select: {
          playerTag: true,
          currentName: true,
        },
        orderBy: {
          currentName: "asc",
        },
      });

    const entries =
      pendingEntries.map((entry) => {
        const ocrName =
          entry.playerName ||
          "";

        const candidates =
          players
            .map((player) => ({
              playerTag: player.playerTag,
              currentName:
                player.currentName,
              score:
                getCandidateScore(
                  ocrName,
                  player.currentName,
                ),
            }))
            .filter(
              (player) =>
                player.score >= 0.55,
            )
            .sort(
              (a, b) =>
                b.score -
                a.score,
            )
            .slice(0, 10);

        return {
          id: entry.id,
          challengeId:
            entry.challengeId,
          playerName:
            entry.playerName,
          difficulty:
            entry.difficulty,
          screenshotPath:
            entry.screenshotPath,
          ocrResult:
            entry.ocrResult,
          adminNote:
            entry.adminNote,
          submittedAt:
            entry.submittedAt,
          challenge:
            entry.challenge,
          candidates,
        };
      });

    return NextResponse.json({
      success: true,
      entries,
    });
  } catch (error) {
    console.error(
      "Admin Challenge review lookup failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Onbekende fout.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message ===
          "ADMIN_UNAUTHORIZED"
            ? 401
            : 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const currentAdmin =
      await requireAdmin();

    const body =
      await request.json();

    const entryId =
      Number(body?.entryId);

    const action =
      body?.action;

    const playerTag =
      typeof body?.playerTag ===
      "string"
        ? body.playerTag.trim()
        : "";

    if (
      !Number.isInteger(entryId) ||
      entryId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ongeldige inzending.",
        },
        { status: 400 },
      );
    }

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ongeldige actie.",
        },
        { status: 400 },
      );
    }

    const entry =
      await prisma.randomChallengeEntry.findUnique(
        {
          where: {
            id: entryId,
          },
          include: {
            challenge: true,
            result: true,
          },
        },
      );

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Inzending niet gevonden.",
        },
        { status: 404 },
      );
    }

    if (
      entry.status !== "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze inzending is al verwerkt.",
        },
        { status: 409 },
      );
    }

    if (
      action === "REJECT"
    ) {
      await prisma.randomChallengeEntry.update(
        {
          where: {
            id: entry.id,
          },
          data: {
            status: "REJECTED",
            reviewedBy:
              String(
                currentAdmin.admin.id,
              ),
            reviewedAt:
              new Date(),
          },
        },
      );

      return NextResponse.json({
        success: true,
        message:
          "Inzending afgewezen.",
      });
    }

    if (!playerTag) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kies eerst de juiste speler.",
        },
        { status: 400 },
      );
    }

    const player =
      await prisma.player.findUnique(
        {
          where: {
            playerTag,
          },
          select: {
            playerTag: true,
            currentName: true,
          },
        },
      );

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gekozen speler bestaat niet.",
        },
        { status: 404 },
      );
    }

    const duplicate =
      await prisma.randomChallengeEntry.findFirst(
        {
          where: {
            challengeId:
              entry.challengeId,
            playerTag:
              player.playerTag,
            difficulty:
              entry.difficulty,
            id: {
              not: entry.id,
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze speler heeft voor deze moeilijkheid al een inzending.",
        },
        { status: 409 },
      );
    }

    const ocr =
      entry.ocrResult &&
      typeof entry.ocrResult ===
        "object"
        ? entry.ocrResult as {
            stars?: number | null;
            destruction?: number | null;
            timeSeconds?: number | null;
            clashResultDetected?: boolean;
          }
        : {};

    const stars =
      typeof ocr.stars ===
      "number"
        ? ocr.stars
        : null;

    const destruction =
      typeof ocr.destruction ===
      "number"
        ? ocr.destruction
        : null;

    const timeSeconds =
      typeof ocr.timeSeconds ===
      "number"
        ? ocr.timeSeconds
        : null;

    const screenshotDetected =
      ocr.clashResultDetected ===
      true;

    if (
      stars === null ||
      destruction === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De OCR heeft geen bruikbaar resultaat gevonden. Deze inzending moet handmatig verder worden gecontroleerd.",
        },
        { status: 400 },
      );
    }

    await prisma.randomChallengeEntry.update(
      {
        where: {
          id: entry.id,
        },
        data: {
          playerTag:
            player.playerTag,
          playerName:
            player.currentName,
          status:
            "APPROVED",
          reviewedBy:
            String(
              currentAdmin.admin.id,
            ),
          reviewedAt:
            new Date(),
          adminNote:
            `Handmatig gekoppeld aan ${player.currentName} (${player.playerTag}).`,
        },
      },
    );

    if (!entry.result) {
      await prisma.randomChallengeResult.create({
        data: {
          entryId:
            entry.id,
          stars,
          destruction,
          timeSeconds,
          score:
            stars * 100 +
            destruction +
            Math.max(
              0,
              100 -
                (timeSeconds ??
                  0) /
                  10,
            ),
          randomChallengeId:
            entry.challengeId,
        },
      });
    }

    await recalculateChallengeRanking(
      entry.challengeId,
      entry.difficulty,
    );

    return NextResponse.json({
      success: true,
      message:
        "Inzending goedgekeurd en aan de gekozen speler gekoppeld.",
    });
  } catch (error) {
    console.error(
      "Admin Challenge review action failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Onbekende fout.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message ===
          "ADMIN_UNAUTHORIZED"
            ? 401
            : 500,
      },
    );
  }
}
