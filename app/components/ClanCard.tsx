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
    <>
      <Link
        href={`/clan/${tag}`}
        scroll={true}
        className={`group block overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl ${glow} transition duration-300 hover:scale-[1.02] md:rounded-3xl`}
      >
        <div className="clan-card-title text-center">
          <h2 className={`font-bold ${titleColor}`}>
            {name}
          </h2>
        </div>

        <Image
          src={image}
          alt={name}
          width={700}
          height={500}
          className="clan-card-image w-full transition duration-500 group-hover:scale-105"
        />

        <div className="clan-card-footer text-center">
          <p className="clan-card-members font-bold text-white">
            {members} / 50
          </p>

          <p className="clan-card-view uppercase text-neutral-600 transition group-hover:text-neutral-300">
            View Clan →
          </p>
        </div>
      </Link>

      <style jsx>{`
        /* MOBILE */
        .clan-card-title {
          height: 54px;
          padding-top: 8px;
          padding-bottom: 4px;
        }

        .clan-card-title h2 {
          font-size: 12px;
          line-height: 1.1;
        }

        .clan-card-image {
          aspect-ratio: 1 / 1;
          object-fit: cover;
        }

        .clan-card-footer {
          padding-top: 8px;
          padding-bottom: 8px;
        }

        .clan-card-members {
          font-size: 14px;
          line-height: 1.2;
        }

        .clan-card-view {
          margin-top: 2px;
          font-size: 5px;
          line-height: 1;
          letter-spacing: 0.08em;
        }

        /* DESKTOP */
        @media (min-width: 768px) {
          .clan-card-title {
            height: auto;
            padding-top: 24px;
            padding-bottom: 12px;
          }

          .clan-card-title h2 {
            font-size: 30px;
            line-height: 1.2;
          }

          .clan-card-image {
            aspect-ratio: auto;
            object-fit: initial;
          }

          .clan-card-footer {
            padding-top: 20px;
            padding-bottom: 20px;
          }

          .clan-card-members {
            font-size: 30px;
            line-height: 1.2;
          }

          .clan-card-view {
            margin-top: 8px;
            font-size: 10px;
            line-height: normal;
            letter-spacing: 0.3em;
          }
        }
      `}</style>
    </>
  );
}