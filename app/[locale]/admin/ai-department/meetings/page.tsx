import { listMeetings } from "@/lib/ai-department/data-actions";
import { MeetingCard } from "@/components/admin/meeting-card";

export default async function MeetingsPage() {
  const meetings = await listMeetings();

  if (meetings.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Hozircha yig&apos;ilish bo&apos;lmagan. Har dushanba barcha mutaxassislar avtomatik &quot;haftalik
        yig&apos;ilish&quot;da o&apos;z fikrini bildiradi va Bosh mutaxassis buni bitta hisobotga birlashtiradi
        (natija Hisobotlar bo&apos;limida ham ko&apos;rinadi).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {meetings.map((m) => (
        <MeetingCard
          key={m.id}
          weekStart={m.week_start}
          summary={m.summary}
          contributions={(m.contributions as { agent_key: string; agent_name: string; text: string }[]) ?? []}
        />
      ))}
    </div>
  );
}
