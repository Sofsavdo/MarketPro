import { getBrandMemory } from "@/lib/ai-department/data-actions";
import { BrandMemoryForm } from "@/components/admin/brand-memory-form";

export default async function BrandMemoryPage() {
  const memory = await getBrandMemory();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">
        Bu ma&apos;lumot AI&apos;ning har bir javobiga asos bo&apos;ladi (JSON formatda). O&apos;zgartirsangiz,
        keyingi xabardan boshlab kuchga kiradi — kodni qayta joylashtirish shart emas.
      </p>
      <BrandMemoryForm
        person={JSON.stringify(memory?.person ?? {}, null, 2)}
        brandAmaliyBiznes={JSON.stringify(memory?.brand_amaliy_biznes ?? {}, null, 2)}
        brandIzdosh={JSON.stringify(memory?.brand_izdosh ?? {}, null, 2)}
        voiceRules={JSON.stringify(memory?.voice_rules ?? {}, null, 2)}
      />
    </div>
  );
}
