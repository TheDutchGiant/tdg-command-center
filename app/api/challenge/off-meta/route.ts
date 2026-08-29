import { NextRequest, NextResponse } from "next/server";
import {
  generateOffMetaArmy,
  type DiscoveryTier,
} from "@/app/lib/discovery/offMetaArmy";

const VALID_TIERS: DiscoveryTier[] = [
  "L1",
  "L2",
  "L3",
];

export async function GET(
  request: NextRequest
) {
  try {
    const requestedTier = (
      request.nextUrl.searchParams.get("tier") ?? "L1"
    ).toUpperCase();

    if (
      !VALID_TIERS.includes(
        requestedTier as DiscoveryTier
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ongeldige tier. Gebruik L1, L2 of L3.",
        },
        { status: 400 }
      );
    }

    const tier =
      requestedTier as DiscoveryTier;

    const army =
      await generateOffMetaArmy(tier);

    return NextResponse.json({
      success: true,
      army,
    });
  } catch (error) {
    console.error(
      "Off-Meta army generation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout tijdens Off-Meta generatie.",
      },
      { status: 500 }
    );
  }
}
