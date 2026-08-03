import { NextResponse } from "next/server";

const CLAN_TAG = "2JLLPVGUU";
const WAR_TAGS = [
  "#8GRCVYLYY",
  "#8GRCVY8LQ",
  "#8GRCVY9JC",
  "#8GRCVYY22",
];

export async function GET() {
  try {
    for (const warTag of WAR_TAGS) {
      const response = await fetch(
        `https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(
          warTag
        )}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        data.clan?.tag === `#${CLAN_TAG}` ||
        data.opponent?.tag === `#${CLAN_TAG}`
      ) {
        return NextResponse.json(data);
      }
    }

    return NextResponse.json({
      success: false,
      message: "Geen war gevonden voor The Dutch Giant.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Er ging iets mis tijdens het ophalen van de war.",
      },
      {
        status: 500,
      }
    );
  }
}