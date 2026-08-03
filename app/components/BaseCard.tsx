import Link from "next/link";

type BaseCardProps = {
  townHall: number;
  amount: number;
};

export default function BaseCard({
  townHall,
  amount,
}: BaseCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-yellow-500">
      <h2 className="text-2xl font-bold text-yellow-400">
        TH{townHall}
      </h2>

      <p className="mt-2 text-neutral-400">
        {amount} base{amount === 1 ? "" : "s"} beschikbaar
      </p>

      <Link
        href={`/bases/th${townHall}`}
        className="mt-5 block w-full rounded-lg bg-yellow-500 px-4 py-2 text-center font-bold text-black transition hover:bg-yellow-400"
      >
        Open Base Library
      </Link>
    </div>
  );
}