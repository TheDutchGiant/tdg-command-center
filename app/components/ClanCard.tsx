import Link from "next/link";
import Image from "next/image";

type Props = {
  name: string;
  tag: string;
  members: number;
  image: string;
  glow: string;
};

export default function ClanCard({
  name,
  tag,
  members,
  image,
  glow,
}: Props) {
  const titleColor =
    glow.includes("orange")
      ? "text-orange-400"
      : glow.includes("cyan")
      ? "text-cyan-400"
      : glow.includes("green")
      ? "text-green-400"
      : "text-purple-400";

  return (
    <Link
      href={`/clan/${tag}`}
      scroll={true}
      className={`group block overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl ${glow} transition duration-300 hover:scale-[1.02]`}
>
      <div className="pt-6 pb-3 text-center">
        <h2 className={`text-3xl font-bold ${titleColor}`}>
          {name}
        </h2>
      </div>

      <Image
        src={image}
        alt={name}
        width={700}
        height={500}
        className="w-full transition duration-500 group-hover:scale-105"
      />

      <div className="py-5 text-center">
        <p className="text-3xl font-bold text-white">
          {members} / 50
        </p>

        <p className="mt-2 text-[10px] tracking-[0.3em] uppercase text-neutral-500 transition group-hover:text-neutral-300">
          View Clan →
        </p>
      </div>
    </Link>
  );
}