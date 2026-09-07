"use client";

type Challenge = {
  id: number;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
};

export default function ChallengeSelector({
  challenges,
  selectedId,
}: {
  challenges: Challenge[];
  selectedId: number;
}) {
  return (
    <select
      value={String(selectedId)}
      onChange={(event) => {
        window.location.href =
          `/challenge/leaderboard?challengeId=${event.target.value}`;
      }}
      className="max-w-[240px] rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-bold text-white outline-none"
      aria-label="Challenge kiezen"
    >
      {challenges.map((item) => (
        <option key={item.id} value={String(item.id)}>
          {item.title}
          {item.status === "ACTIVE" ? " — huidige" : ""}
        </option>
      ))}
    </select>
  );
}
