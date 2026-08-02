import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;

  try {
    const response = await fetch(
      `https://api.clashofclans.com/v1/clans/%23${tag}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Clan niet gevonden." },
        { status: response.status }
      );
    }

    const clan = await response.json();

    return NextResponse.json(clan);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Server error",
        details: String(error),
      },
      { status: 500 }
    );
  }
}