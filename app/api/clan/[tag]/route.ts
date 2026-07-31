import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;

  const res = await fetch(
    `https://api.clashofclans.com/v1/clans/%23${tag}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Clan niet gevonden" },
      { status: res.status }
    );
  }

  const clan = await res.json();

  return NextResponse.json(clan);
}
