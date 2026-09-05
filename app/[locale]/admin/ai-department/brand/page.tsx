import { getBrandMemory } from "@/lib/ai-department/data-actions";
import { BrandMemoryForm } from "@/components/admin/brand-memory-form";
import {
  EMPTY_PERSON,
  EMPTY_AMALIY_BIZNES,
  EMPTY_IZDOSH,
  EMPTY_VOICE_RULES,
  type PersonMemory,
  type AmaliyBiznesMemory,
  type IzdoshMemory,
  type VoiceRulesMemory,
} from "@/lib/ai-department/brand-types";

export default async function BrandMemoryPage() {
  const memory = await getBrandMemory();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">
        Bu ma&apos;lumot AI&apos;ning har bir javobiga asos bo&apos;ladi. O&apos;zgartirsangiz, keyingi
        xabardan boshlab kuchga kiradi — kodni qayta joylashtirish shart emas.
      </p>
      <BrandMemoryForm
        person={{ ...EMPTY_PERSON, ...(memory?.person as Partial<PersonMemory>) }}
        brandAmaliyBiznes={{ ...EMPTY_AMALIY_BIZNES, ...(memory?.brand_amaliy_biznes as Partial<AmaliyBiznesMemory>) }}
        brandIzdosh={{ ...EMPTY_IZDOSH, ...(memory?.brand_izdosh as Partial<IzdoshMemory>) }}
        voiceRules={{ ...EMPTY_VOICE_RULES, ...(memory?.voice_rules as Partial<VoiceRulesMemory>) }}
      />
    </div>
  );
}
