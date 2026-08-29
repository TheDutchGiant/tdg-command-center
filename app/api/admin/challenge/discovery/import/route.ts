import { NextResponse } from "next/server";
import { importDiscoveryArmies } from "@/app/lib/discovery/importDiscoveryArmies";

export async function POST() {
  try {
    const result = await importDiscoveryArmies();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Discovery army import failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout tijdens Discovery army import.",
      },
      { status: 500 }
    );
  }
}
