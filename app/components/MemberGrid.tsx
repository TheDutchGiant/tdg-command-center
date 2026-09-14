import Link from "next/link";

type Member = {
  tag: string;
  name: string;
  role: string;
  townHallLevel: number;
  trophies: number;
};

type MemberGridProps = {
  members: Member[];
  clanTag: string;
};

export default function MemberGrid({
  members,
  clanTag,
}: MemberGridProps) {
  const roleInfo = (role: string) => {
    switch (role) {
      case "leader":
        return {
          label: "👑 Leader",
          color: "text-yellow-400",
        };

      case "coLeader":
        return {
          label: "⭐ Co-Leader",
          color: "text-violet-400",
        };

      case "admin":
        return {
          label: "🛡️ Elder",
          color: "text-sky-400",
        };

      default:
        return {
          label: "👤 Member",
          color: "text-neutral-400",
        };
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
      {members.map((member) => {
        const role = roleInfo(member.role);

        return (
          <Link
            key={member.tag}
            href={`/clan/${clanTag}/members/${encodeURIComponent(member.tag)}`}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 transition hover:border-neutral-700 hover:bg-neutral-800 sm:px-3.5 sm:py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white sm:text-base">
                  {member.name}
                </div>

                <div
                  className={`mt-0.5 truncate text-[10px] font-medium sm:text-xs ${role.color}`}
                >
                  {role.label}
                </div>
              </div>

              <div className="shrink-0 rounded-md bg-yellow-500 px-1.5 py-1 text-[10px] font-bold text-black sm:px-2 sm:text-xs">
                TH{member.townHallLevel}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs font-medium text-neutral-300 sm:text-sm">
              <span>🏆 {member.trophies}</span>
              <span className="text-neutral-600">→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
