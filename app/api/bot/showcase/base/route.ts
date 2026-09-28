import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type ShowcaseMode = "inspect" | "standalone";

function getBaseFingerprint(baseLink: string): string {
  let decoded = baseLink.trim();

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Gebruik de originele link.
  }

  const match = decoded.match(/[?&]id=([^&\s]+)/i);

  if (match?.[1]) {
    return match[1].trim().toUpperCase();
  }

  return decoded.trim().toLowerCase();
}

async function loadShowcase(id: number) {
  return prisma.showcaseBase.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: { createdAt: "asc" },
        take: 25,
        select: {
          id: true,
          discordUserId: true,
          discordDisplayName: true,
          screenshotMessageId: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function POST(request: Request) {
  const expectedKey = process.env.TDG_BOT_API_KEY;
  const providedKey = request.headers.get("x-tdg-bot-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const mode =
      body.mode === "standalone"
        ? "standalone"
        : "inspect" satisfies ShowcaseMode;

    const baseLink =
      typeof body.baseLink === "string"
        ? body.baseLink.trim()
        : "";

    const townHall =
      typeof body.townHall === "number"
        ? body.townHall
        : 0;

    const type =
      typeof body.type === "string"
        ? body.type.trim().toUpperCase()
        : "UNKNOWN";

    const discordUserId =
      typeof body.discordUserId === "string"
        ? body.discordUserId.trim()
        : "";

    const discordDisplayName =
      typeof body.discordDisplayName === "string"
        ? body.discordDisplayName.trim()
        : "";

    const channelId =
      typeof body.channelId === "string"
        ? body.channelId.trim()
        : "";

    const sourceMessageId =
      typeof body.sourceMessageId === "string"
        ? body.sourceMessageId.trim()
        : null;

    if (
      !baseLink ||
      !discordUserId ||
      !discordDisplayName ||
      !channelId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Verplichte Showcase-gegevens ontbreken.",
        },
        { status: 400 },
      );
    }

    const baseFingerprint =
      getBaseFingerprint(baseLink);

    if (mode === "inspect") {
      const existing =
        await prisma.showcaseBase.findFirst({
          where: { baseFingerprint },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

      if (existing) {
        const showcase =
          await loadShowcase(existing.id);

        if (!showcase) {
          throw new Error(
            "Bestaande showcase kon niet worden geladen.",
          );
        }

        return NextResponse.json({
          success: true,
          status: "EXISTING",
          showcase,
        });
      }
    }

    const showcase =
      await prisma.showcaseBase.create({
        data: {
          baseFingerprint,
          baseLink,
          townHall,
          type,
          createdByDiscordUserId: discordUserId,
          createdByDisplayName: discordDisplayName,
          channelId,
          sourceMessageId,
        },
      });

    return NextResponse.json({
      success: true,
      status: mode === "standalone"
        ? "STANDALONE"
        : "NEW",
      showcase: await loadShowcase(showcase.id),
    });
  } catch (error) {
    console.error(
      "❌ Showcase base API fout:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      { status: 500 },
    );
  }
}
