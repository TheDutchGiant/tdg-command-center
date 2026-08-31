import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import DeleteBaseButton from "@/app/components/DeleteBaseButton";
import EditDescriptionForm from "@/app/components/EditDescriptionForm";
import BaseForm from "@/app/components/BaseForm";

type Props = {
  params: Promise<{
    townHall: string;
  }>;
};

export default async function TownHallPage({
  params,
}: Props) {
  const { townHall } =
    await params;

  const match =
    townHall.match(
      /^th(\d+)$/i,
    );

  if (!match) {
    notFound();
  }

  const th =
    Number(match[1]);

  if (
    th < 11 ||
    th > 18
  ) {
    notFound();
  }

  const now =
    new Date();

  const bases =
    await prisma.base.findMany({
      where: {
        townHall: th,
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

  const activeBase =
    bases.find(
      (base) =>
        base.isActive &&
        (
          !base.expiresAt ||
          base.expiresAt > now
        ),
    );

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
          {bases.length}{" "}
          {bases.length === 1
            ? "base"
            : "bases"} beschikbaar
        </p>
      </div>

      {activeBase && (
        <section className="overflow-hidden rounded-2xl border border-yellow-400/25 bg-yellow-500/[0.05]">
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400/60">
              🏆 Base van de Week
            </p>

            <h2 className="mt-1 text-3xl font-black text-yellow-300">
              {activeBase.name}
            </h2>

            <p className="mt-2 text-sm text-neutral-400">
              TH18 · ClashKing
            </p>
          </div>

          {activeBase.imageUrl && (
            <div className="bg-black">
              <img
                src={activeBase.imageUrl}
                alt={`TDG Base van de Week - ${activeBase.name}`}
                className="block w-full"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center">
            <a
              href={activeBase.baseLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-yellow-500 px-5 py-3 text-center font-bold text-black transition hover:bg-yellow-400"
            >
              📲 Open in Clash of Clans
            </a>

            {activeBase.expiresAt && (
              <span className="text-sm text-neutral-400">
                Actief tot{" "}
                {activeBase.expiresAt.toLocaleString(
                  "nl-NL",
                )}
              </span>
            )}
          </div>
        </section>
      )}

      {bases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-neutral-400">
          Er zijn nog geen TH{th}-bases toegevoegd.
        </div>
      ) : (
        <div className="grid gap-6">
          {bases
            .filter(
              (base) =>
                base.id !==
                activeBase?.id,
            )
            .map((base) => (
              <div
                key={base.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-6"
              >
                {base.imageUrl && (
                  <img
                    src={base.imageUrl}
                    alt={base.name}
                    className="mb-5 w-full rounded-xl"
                  />
                )}

                <h2 className="text-2xl font-bold text-yellow-400">
                  {base.name}
                </h2>

                <div className="mt-4 space-y-2 text-neutral-300">
                  <p>
                    👤 Toegevoegd door:{" "}
                    {base.createdBy}
                  </p>

                  {base.description && (
                    <p>
                      📝{" "}
                      {base.description}
                    </p>
                  )}
                </div>

                <EditDescriptionForm
                  id={base.id}
                  description={
                    base.description ??
                    ""
                  }
                />

                <div className="mt-6 flex gap-3">
                  <a
                    href={base.baseLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-yellow-500 px-5 py-3 font-bold text-black transition hover:bg-yellow-400"
                  >
                    📲 Open in Clash
                  </a>

                  <DeleteBaseButton
                    id={base.id}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-xl font-bold text-yellow-400">
          🏰 Nieuwe Base van de Week
        </h2>

        <BaseForm />
      </div>
    </div>
  );
}
