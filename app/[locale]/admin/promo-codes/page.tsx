import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { createPromoCode, togglePromoCode } from "@/lib/lms/admin-actions";

export default async function AdminPromoCodesPage() {
  const admin = await createAdminClient();
  const { data: promoCodes } = await admin
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Promo-kodlar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kurs va obuna narxlariga chegirma beruvchi kodlar. Bir marta ishlatilgan to&apos;lov
        (status=&quot;paid&quot;) uchun avtomatik hisoblanadi.
      </p>

      <form
        action={createPromoCode}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 p-4"
      >
        <div>
          <label className="block text-xs text-slate-500">Kod</label>
          <input
            name="code"
            required
            placeholder="IZDOSH20"
            className="mt-1 w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Chegirma (%)</label>
          <input
            name="discount_percent"
            type="number"
            min={1}
            max={100}
            required
            className="mt-1 w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Maks. ishlatilish (ixtiyoriy)</label>
          <input
            name="max_uses"
            type="number"
            min={1}
            className="mt-1 w-36 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Muddati (ixtiyoriy)</label>
          <input
            name="expires_at"
            type="date"
            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
        <Button type="submit">Yaratish</Button>
      </form>

      <div className="mt-6 space-y-2">
        {(promoCodes ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-semibold text-amber-400">{p.code}</code>
                <Badge variant={p.active ? "default" : "outline"}>
                  {p.active ? "Faol" : "O'chirilgan"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {p.discount_percent}% chegirma · {p.used_count} marta ishlatilgan
                {p.max_uses ? ` / ${p.max_uses}` : ""}
                {p.expires_at ? ` · ${formatDate(p.expires_at)} gacha` : ""}
              </p>
            </div>
            <form action={togglePromoCode.bind(null, p.id, p.active)}>
              <Button type="submit" variant="outline" size="sm">
                {p.active ? "O'chirish" : "Yoqish"}
              </Button>
            </form>
          </div>
        ))}
        {!promoCodes?.length && (
          <p className="text-sm text-slate-500">Hozircha promo-kodlar yo&apos;q.</p>
        )}
      </div>
    </div>
  );
}
