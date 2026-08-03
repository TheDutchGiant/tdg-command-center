import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const CLAN_TAG = "2JLLPVGUU";

export async function GET() {
  try {
    const response = await fetch(
      `https://api.clashofclans.com/v1/clans/%23${CLAN_TAG}/currentwar/leaguegroup`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (data.season) {
      const season = data.season.substring(0, 7);

      await prisma.season.upsert({
        where: {
          season,
        },
        update: {},
        create: {
          season,
        },
      });
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("CWL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Er is iets misgegaan bij het ophalen van de CWL-data.",
      },
      {
        status: 500,
      }
    );
  }
}