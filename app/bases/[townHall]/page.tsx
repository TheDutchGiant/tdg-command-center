import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import DeleteBaseButton from "@/app/components/DeleteBaseButton";
import EditDescriptionForm from "@/app/components/EditDescriptionForm";

type Props = {
  params: Promise<{
    townHall: string;
  }>;
};

export default async function TownHallPage({ params }: Props) {
  const { townHall } = await params;

  const match = townHall.match(/^th(\d+)$/i);

  if (!match) {
    notFound();
  }

  const th = Number(match[1]);

  if (th < 11 || th > 18) {
    notFound();
  }

  const bases = await prisma.base.findMany({
    where: {
      townHall: th,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/clan/2JLLPVGUU/bases"
          className="text-yellow-400 hover:underline"
        >
          ← Terug naar Base Library
        </Link>

        <h1 className="mt-4 text-4xl font-bold text-yellow-400">
          🏰 TH{th} Base Library
        </h1>

        <p className="mt-2 text-neutral-400">
          {bases.length} {bases.length === 1 ? "base" : "bases"} beschikbaar
        </p>
      </div>

      {bases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-neutral-400">
          Er zijn nog geen TH{th}-bases toegevoegd.
        </div>
      ) : (
        <div className="grid gap-6">
          {bases.map((base: (typeof bases)[number]) => (
            <div
              key={base.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-6"
            >
              <h2 className="text-2xl font-bold text-yellow-400">
                {base.name}
              </h2>

              <div className="mt-4 space-y-2 text-neutral-300">
                <p>🏆 Categorie: {base.category}</p>
                <p>👤 Toegevoegd door: {base.createdBy}</p>

                {base.description && (
                  <p>📝 {base.description}</p>
                )}
              </div>

              <EditDescriptionForm
                id={base.id}
                description={base.description ?? ""}
              />

              <div className="mt-6 flex gap-3">
                <a
                  href={base.baseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-yellow-500 px-5 py-3 font-bold text-black transition hover:bg-yellow-400"
                >
                  📲 Open in Clash of Clans
                </a>

                <DeleteBaseButton id={base.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}