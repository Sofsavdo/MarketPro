"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateBrandMemory } from "@/lib/ai-department/data-actions";
import { CheckCircle2 } from "lucide-react";

const FIELDS = [
  { key: "person", label: "G'ayratjon haqida (bio, tajriba, loyihalar)" },
  { key: "brandAmaliyBiznes", label: "@amaliy.biznes (pozitsiya, content pillars)" },
  { key: "brandIzdosh", label: "@izdosh.academy (kurslar, tariflar, principle)" },
  { key: "voiceRules", label: "Ohang qoidalari (voice_rules)" },
] as const;

export function BrandMemoryForm(props: {
  person: string;
  brandAmaliyBiznes: string;
  brandIzdosh: string;
  voiceRules: string;
}) {
  const [values, setValues] = useState(props);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateBrandMemory({
          person: values.person,
          brand_amaliy_biznes: values.brandAmaliyBiznes,
          brand_izdosh: values.brandIzdosh,
          voice_rules: values.voiceRules,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <Label className="text-xs">{field.label}</Label>
          <textarea
            value={values[field.key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            rows={10}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          Saqlash
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Saqlandi
          </span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
