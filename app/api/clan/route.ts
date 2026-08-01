import { NextResponse } from "next/server";

const clans = [
  { name: "The Dutch Giant", tag: "%232JLLPVGUU" },
  { name: "TDG II", tag: "%232CVVG00QQ" },
  { name: "TDG Mini", tag: "%232CQ2LGQJ2" },
  { name: "TDG Micro", tag: "%232CP8GPVG8" },
];

export async function GET() {
  try {
    const results = await Promise.all(
      clans.map(async (clan) => {
        const response = await fetch(
          `https://api.clashofclans.com/v1/clans/${clan.tag}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return {
            name: clan.name,
            members: 0,
            error: await response.text(),
          };
        }

        const data = await response.json();

        return {
          name: clan.name,
          members: data.members,
          tag: data.tag,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}