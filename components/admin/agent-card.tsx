"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAgentPrompt } from "@/lib/ai-department/data-actions";
import { CheckCircle2, ChevronDown } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Agent = Database["public"]["Tables"]["ai_agents"]["Row"];

export function AgentCard({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(agent.name);
  const [roleTitle, setRoleTitle] = useState(agent.role_title);
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateAgentPrompt(agent.key, { name, role_title: roleTitle, system_prompt: systemPrompt });
      setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">{agent.name}</p>
          <p className="text-xs text-slate-500">{agent.role_title}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-slate-800 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Nomi</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Lavozimi</Label>
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Vazifasi (system prompt)</Label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              Saqlash
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Saqlandi
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
