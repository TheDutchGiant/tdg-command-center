type StatusCardProps = {
  title: string;
  value: string;
  icon: string;
  detail?: string;
};

export default function StatusCard({
  title,
  value,
  icon,
  detail,
}: StatusCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-yellow-500">
      <div className="text-3xl">{icon}</div>

      <div className="mt-3 text-sm text-neutral-400">
        {title}
      </div>

      <div className="mt-1 text-xl font-bold text-yellow-400">
        {value}
      </div>

      {detail && (
        <div className="mt-1 text-xs text-neutral-500">
          {detail}
        </div>
      )}
    </div>
  );
}