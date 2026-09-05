import { listAgentsForAdmin } from "@/lib/ai-department/data-actions";
import { AgentCard } from "@/components/admin/agent-card";

export default async function AgentsPage() {
  const agents = await listAgentsForAdmin();
  const orchestrator = agents.find((a) => a.key === "orchestrator");
  const specialists = agents.filter((a) => a.key !== "orchestrator");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-400">
        Har bir mutaxassisning &quot;shaxsiyati&quot; (vazifasi, tool&apos;lardan foydalanish qoidasi) shu yerda
        tahrirlanadi. O&apos;zgartirish keyingi chat xabaridan boshlab kuchga kiradi.
      </p>
      {orchestrator && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-amber-400">Boshqaruvchi</h2>
          <AgentCard agent={orchestrator} />
        </div>
      )}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-amber-400">Mutaxassislar</h2>
        <div className="flex flex-col gap-3">
          {specialists.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
