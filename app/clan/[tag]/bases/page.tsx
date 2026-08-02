import AddBaseButton from "@/app/components/AddBaseButton";
import BaseCard from "@/app/components/BaseCard";
import { PrismaClient } from "@/app/generated/prisma/client";

const prisma = new PrismaClient();

export default async function BasesPage() {
  const bases = await prisma.base.findMany({
    orderBy: {
      townHall: "desc",
    },
  });

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            🏰 TDG Base Library
          </h1>

          <p className="mt-2 text-neutral-400">
            Beheer alle TDG-bases op één centrale plek.
          </p>
        </div>

        <AddBaseButton />
      </div>

      {bases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-8 text-center text-neutral-400">
          Er zijn nog geen bases toegevoegd.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bases.map((base) => (
            <BaseCard
              key={base.id}
              townHall={base.townHall}
              amount={1}
            />
          ))}
        </div>
      )}
    </>
  );
}