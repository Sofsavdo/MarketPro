"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/ai-department/data-actions";
import type { Database } from "@/lib/supabase/types";

type Task = Database["public"]["Tables"]["ai_tasks"]["Row"];
type Status = Task["status"];

const STATUS_ORDER: Status[] = ["backlog", "planned", "in_progress", "review", "approved", "published"];

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  low: "text-slate-500",
  normal: "text-slate-300",
  high: "text-amber-400",
};

export function TaskColumn({
  label,
  status,
  tasks,
  agentNames,
}: {
  label: string;
  status: Status;
  tasks: Task[];
  agentNames: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const currentIndex = STATUS_ORDER.indexOf(status);
  const next = STATUS_ORDER[currentIndex + 1];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
        {label} ({tasks.length})
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</p>
            <p className="mt-1 text-sm font-medium break-words text-white">{task.title}</p>
            {task.description && (
              <p className="mt-1 text-xs whitespace-pre-wrap break-words text-slate-400">{task.description}</p>
            )}
            {task.deadline && <p className="mt-1 text-xs text-slate-500">Muddat: {task.deadline}</p>}
            {task.agent_key && (
              <p className="mt-1 text-xs text-slate-600">{agentNames[task.agent_key] ?? task.agent_key}</p>
            )}
            {next && (
              <button
                disabled={isPending}
                onClick={() => startTransition(() => updateTaskStatus(task.id, next))}
                className="mt-2 text-xs text-amber-400 hover:underline disabled:opacity-50"
              >
                → keyingi bosqichga
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
