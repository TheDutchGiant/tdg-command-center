import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").trim().toUpperCase();
}

export async function POST(request: Request) {
  const expectedKey = process.env.TDG_BOT_API_KEY;
  const providedKey = request.headers.get("x-tdg-bot-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const discordUserId =
      typeof body.discordUserId === "string"
        ? body.discordUserId.trim()
        : "";

    const discordUsername =
      typeof body.discordUsername === "string"
        ? body.discordUsername.trim()
        : null;

    const discordDisplayName =
      typeof body.discordDisplayName === "string"
        ? body.discordDisplayName.trim()
        : null;

    const playerTag =
      typeof body.playerTag === "string"
        ? normalizeTag(body.playerTag)
        : "";

    if (!discordUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "discordUserId ontbreekt.",
        },
        { status: 400 },
      );
    }

    if (!playerTag) {
      return NextResponse.json(
        {
          success: false,
          error: "playerTag ontbreekt.",
        },
        { status: 400 },
      );
    }

    const player = await prisma.player.findUnique({
      where: {
        playerTag,
      },
      select: {
        playerTag: true,
        currentName: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error: `CoC-account ${playerTag} bestaat niet in Phoenix.`,
        },
        { status: 404 },
      );
    }

    const existingLink =
      await prisma.discordAccountLink.findUnique({
        where: {
          playerTag,
        },
        select: {
          id: true,
          discordUserId: true,
        },
      });

    if (
      existingLink &&
      existingLink.discordUserId !== discordUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `CoC-account ${playerTag} is al gekoppeld aan een andere Discord-gebruiker.`,
        },
        { status: 409 },
      );
    }

    const link =
      await prisma.discordAccountLink.upsert({
        where: {
          discordUserId_playerTag: {
            discordUserId,
            playerTag,
          },
        },
        create: {
          discordUserId,
          discordUsername,
          discordDisplayName,
          playerTag,
        },
        update: {
          discordUsername,
          discordDisplayName,
        },
        select: {
          id: true,
          discordUserId: true,
          discordUsername: true,
          discordDisplayName: true,
          playerTag: true,
          createdAt: true,
          updatedAt: true,
          player: {
            select: {
              currentName: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error) {
    console.error(
      "❌ Discord link API fout:",
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
