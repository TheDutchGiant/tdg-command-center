import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/app/lib/auth/session";

export async function POST() {
  try {
    await destroyCurrentSession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Uitloggen is mislukt.",
      },
      { status: 500 }
    );
  }
}
