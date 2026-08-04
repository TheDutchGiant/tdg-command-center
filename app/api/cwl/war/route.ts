import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const warTag = searchParams.get("tag");

  if (!warTag) {
    return NextResponse.json(
      {
        success: false,
        message: "Geen warTag opgegeven.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const response = await fetch(
      `https://api.clashofclans.com/v1/clanwarleagues/wars/%23${warTag.replace("#", "")}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "War ophalen mislukt.",
      },
      {
        status: 500,
      }
    );
  }
}