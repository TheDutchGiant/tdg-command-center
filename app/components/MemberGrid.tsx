type Member = {
  tag: string;
  name: string;
  role: string;
  townHallLevel: number;
  trophies: number;
};

type MemberGridProps = {
  members: Member[];
};

export default function MemberGrid({
  members,
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
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {members.map((member) => {
        const role = roleInfo(member.role);

        return (
          <div
            key={member.tag}
            className="rounded-xl bg-neutral-900 p-4 shadow transition hover:bg-neutral-800"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-base">
                {member.name}
              </div>

              <div className="rounded bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
                TH{member.townHallLevel}
              </div>
            </div>

            <div className={`mt-2 text-sm font-medium ${role.color}`}>
              {role.label}
            </div>

            <div className="mt-2 text-sm">
              🏆 {member.trophies}
            </div>
          </div>
        );
      })}
    </div>
  );
}