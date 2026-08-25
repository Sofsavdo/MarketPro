export function InstructorBadge({
  name,
  avatarUrl,
  label,
}: {
  name: string;
  avatarUrl?: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-semibold text-amber-400">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span>
        {label}: {name}
      </span>
    </div>
  );
}
