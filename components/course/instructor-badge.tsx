import { Link } from "@/i18n/navigation";

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
    <Link
      href="/about"
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 transition-colors hover:border-amber-500/40"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-400">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span>
        <span className="block text-xs text-slate-500">{label}</span>
        <span className="block text-sm font-semibold text-white">{name}</span>
      </span>
    </Link>
  );
}
