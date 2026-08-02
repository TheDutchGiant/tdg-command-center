import AddBaseButton from "@/app/components/AddBaseButton";
import BaseCard from "@/app/components/BaseCard";

export default function BasesPage() {
  const townHalls = [18, 17, 16, 15, 14, 13];

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {townHalls.map((th) => (
          <BaseCard
            key={th}
            townHall={th}
            amount={0}
          />
        ))}
      </div>
    </>
  );
}