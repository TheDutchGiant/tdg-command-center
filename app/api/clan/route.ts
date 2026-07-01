import { NextResponse } from "next/server";

export async function GET() {
  const clanTag = "%232JLLPVGUU"; // #2JLLPVGUU (# wordt %23)

  const response = await fetch(
    `https://api.clashofclans.com/v1/clans/${clanTag}`,
    {
      headers: {
        Authorization: `Bearer {eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjU5ZTVkNTI5LTZmZWQtNDExMC1hZGQ5LTBkYzQ4NGJmZjgxZCIsImlhdCI6MTc4MjkzOTIyNSwic3ViIjoiZGV2ZWxvcGVyLzNmYjNlNWRjLTIzMWEtOGNmMy1mOTM0LTNkZmEwZDljM2JjZSIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjc3LjE2Ni4yMTguMjIiXSwidHlwZSI6ImNsaWVudCJ9XX0.nVWX_XXlsGF6k-f4-_hrmGMChEzqOdtvaXcIBFXeeUsFvNSVhfkTY-ACiX3SAdHYMBOM2kmbHE1EPfqnBnPqsA
}`,
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
  return NextResponse.json(data);
}