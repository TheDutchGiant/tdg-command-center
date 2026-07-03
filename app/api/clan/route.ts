import { NextResponse } from "next/server";

export async function GET() {
  const clanTag = "%232JLLPVGUU";

  const response = await fetch(
    `https://api.clashofclans.com/v1/clans/${clanTag}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    return NextResponse.json(
      {
        status: response.status,
        error: errorText,
      },
      { status: response.status }
    );
  }

  const data = await response.json();

  return NextResponse.json({
    members: data.members,
    name: data.name,
    tag: data.tag,
  });
}