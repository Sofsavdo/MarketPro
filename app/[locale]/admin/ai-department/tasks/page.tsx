import { listTasks, getAgentNameMap } from "@/lib/ai-department/data-actions";
import { TaskColumn } from "@/components/admin/task-column";
import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Tables"]["ai_tasks"]["Row"]["status"];

const COLUMNS: { status: Status; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "planned", label: "Rejalashtirilgan" },
  { status: "in_progress", label: "Jarayonda" },
  { status: "review", label: "Ko'rib chiqilmoqda" },
  { status: "approved", label: "Tasdiqlangan" },
  { status: "published", label: "Bajarilgan" },
];

export default async function TasksPage() {
  const [tasks, agentNames] = await Promise.all([listTasks(), getAgentNameMap()]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <TaskColumn
          key={col.status}
          label={col.label}
          status={col.status}
          tasks={tasks.filter((t) => t.status === col.status)}
          agentNames={agentNames}
        />
      ))}
    </div>
  );
}
