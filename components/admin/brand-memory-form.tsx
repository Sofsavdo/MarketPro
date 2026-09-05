"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBrandMemory } from "@/lib/ai-department/data-actions";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import type {
  PersonMemory,
  AmaliyBiznesMemory,
  IzdoshMemory,
  VoiceRulesMemory,
} from "@/lib/ai-department/brand-types";

const textareaClass =
  "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={textareaClass} />
    </div>
  );
}

/** A string[] edited as one item per line — far more readable than a JSON array for a non-technical admin. */
function ListField({
  label,
  hint,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        {label} <span className="font-normal text-slate-500">(har bir qatorda bitta)</span>
      </Label>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      <textarea
        value={value.join("\n")}
        onChange={(e) => onChange(linesToArray(e.target.value))}
        rows={rows}
        className={textareaClass}
      />
    </div>
  );
}

function ProjectsField({
  value,
  onChange,
}: {
  value: { name: string; desc: string }[];
  onChange: (v: { name: string; desc: string }[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs">Loyihalar</Label>
      {value.map((project, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_2fr]">
            <Input
              placeholder="Nomi"
              value={project.name}
              onChange={(e) => {
                const next = [...value];
                next[i] = { ...next[i], name: e.target.value };
                onChange(next);
              }}
            />
            <Input
              placeholder="Tavsifi"
              value={project.desc}
              onChange={(e) => {
                const next = [...value];
                next[i] = { ...next[i], desc: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="mt-2 text-slate-500 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit gap-1.5"
        onClick={() => onChange([...value, { name: "", desc: "" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Loyiha qo&apos;shish
      </Button>
    </div>
  );
}

export function BrandMemoryForm(props: {
  person: PersonMemory;
  brandAmaliyBiznes: AmaliyBiznesMemory;
  brandIzdosh: IzdoshMemory;
  voiceRules: VoiceRulesMemory;
}) {
  const [person, setPerson] = useState(props.person);
  const [amaliyBiznes, setAmaliyBiznes] = useState(props.brandAmaliyBiznes);
  const [izdosh, setIzdosh] = useState(props.brandIzdosh);
  const [voiceRules, setVoiceRules] = useState(props.voiceRules);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateBrandMemory({
          person,
          brand_amaliy_biznes: amaliyBiznes,
          brand_izdosh: izdosh,
          voice_rules: voiceRules,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-amber-400">G&apos;ayratjon haqida</h2>
        <TextField label="Ism" value={person.name} onChange={(v) => setPerson({ ...person, name: v })} />
        <TextAreaField label="Bio" value={person.bio} onChange={(v) => setPerson({ ...person, bio: v })} rows={3} />
        <TextAreaField
          label="Pozitsiya"
          value={person.positioning}
          onChange={(v) => setPerson({ ...person, positioning: v })}
          rows={3}
        />
        <TextField
          label="Uzum Market tajribasi"
          value={person.marketplace_experience.uzum}
          onChange={(v) =>
            setPerson({ ...person, marketplace_experience: { ...person.marketplace_experience, uzum: v } })
          }
        />
        <ListField
          label="Boshqa marketpleyslar"
          value={person.marketplace_experience.other_platforms}
          onChange={(v) =>
            setPerson({
              ...person,
              marketplace_experience: { ...person.marketplace_experience, other_platforms: v },
            })
          }
          rows={2}
        />
        <ListField
          label="Marketplace ko'nikmalari"
          value={person.marketplace_experience.skills}
          onChange={(v) =>
            setPerson({ ...person, marketplace_experience: { ...person.marketplace_experience, skills: v } })
          }
          rows={4}
        />
        <TextField
          label="Vibe coding tajribasi (muddat)"
          value={person.vibe_coding_experience.duration}
          onChange={(v) =>
            setPerson({ ...person, vibe_coding_experience: { ...person.vibe_coding_experience, duration: v } })
          }
        />
        <TextField
          label="Vibe coding jarayoni"
          value={person.vibe_coding_experience.flow}
          onChange={(v) =>
            setPerson({ ...person, vibe_coding_experience: { ...person.vibe_coding_experience, flow: v } })
          }
        />
        <ListField
          label="Texnologiyalar"
          value={person.vibe_coding_experience.stack}
          onChange={(v) =>
            setPerson({ ...person, vibe_coding_experience: { ...person.vibe_coding_experience, stack: v } })
          }
          rows={2}
        />
        <ProjectsField value={person.projects} onChange={(v) => setPerson({ ...person, projects: v })} />
        <TextAreaField
          label="Hikoya yo'nalishi (story arc)"
          value={person.story_arc}
          onChange={(v) => setPerson({ ...person, story_arc: v })}
          rows={3}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold text-amber-400">@amaliy.biznes</h2>
        <TextField label="Handle" value={amaliyBiznes.handle} onChange={(v) => setAmaliyBiznes({ ...amaliyBiznes, handle: v })} />
        <TextAreaField
          label="Maqsad"
          value={amaliyBiznes.goal}
          onChange={(v) => setAmaliyBiznes({ ...amaliyBiznes, goal: v })}
          rows={3}
        />
        <ListField
          label="Mavzular"
          value={amaliyBiznes.topics}
          onChange={(v) => setAmaliyBiznes({ ...amaliyBiznes, topics: v })}
        />
        <ListField
          label="Content pillars"
          value={amaliyBiznes.content_pillars}
          onChange={(v) => setAmaliyBiznes({ ...amaliyBiznes, content_pillars: v })}
          rows={5}
        />
        <ListField
          label="Content seriyalar"
          value={amaliyBiznes.content_series}
          onChange={(v) => setAmaliyBiznes({ ...amaliyBiznes, content_series: v })}
          rows={5}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold text-amber-400">@izdosh.academy</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Handle" value={izdosh.handle} onChange={(v) => setIzdosh({ ...izdosh, handle: v })} />
          <TextField label="Veb-sayt" value={izdosh.website} onChange={(v) => setIzdosh({ ...izdosh, website: v })} />
        </div>
        <TextAreaField
          label="Asosiy prinsip"
          value={izdosh.principle}
          onChange={(v) => setIzdosh({ ...izdosh, principle: v })}
          rows={2}
        />
        <ListField
          label="Joriy kurslar"
          value={izdosh.current_courses}
          onChange={(v) => setIzdosh({ ...izdosh, current_courses: v })}
          rows={2}
        />
        <ListField
          label="Kelajakdagi kurslar"
          value={izdosh.upcoming_courses}
          onChange={(v) => setIzdosh({ ...izdosh, upcoming_courses: v })}
          rows={3}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <ListField
            label="START tarifi"
            value={izdosh.tariffs_structure.START}
            onChange={(v) => setIzdosh({ ...izdosh, tariffs_structure: { ...izdosh.tariffs_structure, START: v } })}
          />
          <ListField
            label="STANDARD tarifi"
            value={izdosh.tariffs_structure.STANDARD}
            onChange={(v) =>
              setIzdosh({ ...izdosh, tariffs_structure: { ...izdosh.tariffs_structure, STANDARD: v } })
            }
          />
          <ListField
            label="PRO tarifi"
            value={izdosh.tariffs_structure.PRO}
            onChange={(v) => setIzdosh({ ...izdosh, tariffs_structure: { ...izdosh.tariffs_structure, PRO: v } })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Oylik obuna narxi (so&apos;m)</Label>
          <Input
            type="number"
            value={izdosh.monthly_subscription_som}
            onChange={(e) => setIzdosh({ ...izdosh, monthly_subscription_som: Number(e.target.value) })}
          />
        </div>
        <ListField
          label="To'lov usullari"
          value={izdosh.payment_options}
          onChange={(v) => setIzdosh({ ...izdosh, payment_options: v })}
          rows={2}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={izdosh.no_income_guarantee}
            onChange={(e) => setIzdosh({ ...izdosh, no_income_guarantee: e.target.checked })}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
          />
          Daromad kafolati berilmaydi (majburiy qoida)
        </label>
        <ListField
          label="Content pillars"
          value={izdosh.content_pillars}
          onChange={(v) => setIzdosh({ ...izdosh, content_pillars: v })}
          rows={5}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold text-amber-400">Ohang qoidalari</h2>
        <TextAreaField
          label="Falsafa"
          value={voiceRules.philosophy}
          onChange={(v) => setVoiceRules({ ...voiceRules, philosophy: v })}
          rows={2}
        />
        <ListField
          label="Ohang"
          value={voiceRules.tone}
          onChange={(v) => setVoiceRules({ ...voiceRules, tone: v })}
          rows={2}
        />
        <TextAreaField
          label="Ovoz uslubi"
          value={voiceRules.voice_persona}
          onChange={(v) => setVoiceRules({ ...voiceRules, voice_persona: v })}
          rows={2}
        />
        <TextAreaField
          label="Til qoidalari"
          value={voiceRules.language}
          onChange={(v) => setVoiceRules({ ...voiceRules, language: v })}
          rows={2}
        />
        <TextAreaField
          label="Kontekst"
          value={voiceRules.context}
          onChange={(v) => setVoiceRules({ ...voiceRules, context: v })}
          rows={2}
        />
        <ListField
          label="Hech qachon qilinmasin"
          value={voiceRules.never_rules}
          onChange={(v) => setVoiceRules({ ...voiceRules, never_rules: v })}
          rows={5}
        />
        <ListField
          label="Kontent tekshirish savollari"
          value={voiceRules.content_check_questions}
          onChange={(v) => setVoiceRules({ ...voiceRules, content_check_questions: v })}
          rows={5}
        />
        <ListField
          label="Tasdiq talab qiladigan mavzular"
          value={voiceRules.approval_required_for}
          onChange={(v) => setVoiceRules({ ...voiceRules, approval_required_for: v })}
          rows={3}
        />
      </section>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/95 p-3 backdrop-blur">
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
