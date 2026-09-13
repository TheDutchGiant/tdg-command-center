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
    <div
      className="
        rounded-xl
        border border-neutral-800
        bg-neutral-900
        px-3 py-3
        transition
        hover:border-yellow-500
        sm:px-4 sm:py-4
      "
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 text-2xl sm:text-3xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-neutral-400 sm:text-sm">
            {title}
          </div>

          <div className="mt-0.5 break-words text-sm font-bold leading-5 text-yellow-400 sm:text-xl sm:leading-6">
            {value}
          </div>

          {detail && (
            <div className="mt-0.5 text-[10px] leading-4 text-neutral-500 sm:text-xs">
              {detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
