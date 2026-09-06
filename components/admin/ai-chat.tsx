"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Plus, Loader2, ChevronDown } from "lucide-react";
import {
  createConversation,
  getConversation,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/ai-department/chat-actions";
import { getAgentNameMap, listAgentsForAdmin } from "@/lib/ai-department/data-actions";

type ConversationSummary = { id: string; title: string | null; agent_key: string | null; updated_at: string };
type AgentOption = { key: string; name: string; role_title: string };

type DisplayMessage =
  | { kind: "user"; text: string }
  | { kind: "orchestrator"; text: string }
  | { kind: "direct"; agentName: string; text: string }
  | { kind: "specialist"; agentName: string; text: string; actions: string[] }
  | { kind: "notice"; text: string };

type LiveRun = { agentKey: string; text: string; actions: string[] };

function extractDisplayMessages(
  raw: ChatMessage[],
  liveRuns: LiveRun[],
  processing: boolean,
  agentNames: Record<string, string>,
  directAgentKey: string | null,
): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  for (const message of raw) {
    if (message.role === "user" && typeof message.content === "string") {
      out.push({ kind: "user", text: message.content });
    } else if (message.role === "assistant" && Array.isArray(message.content)) {
      const text = message.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      // Reloaded history only has the orchestrator-level transcript — the
      // per-specialist breakdown is live-only (see `live_specialist_runs`),
      // so past turns show just the orchestrator's synthesis.
      if (text) {
        if (directAgentKey) {
          out.push({ kind: "direct", agentName: agentNames[directAgentKey] ?? directAgentKey, text });
        } else {
          out.push({ kind: "orchestrator", text });
        }
      }
    }
  }
  // A non-empty live_specialist_runs means the current turn is either
  // still running (processing=true — each specialist finishing shows up
  // here as it completes) or was cut off before it could finish and fold
  // into `messages` (processing=false — a genuinely stuck/failed turn).
  if (liveRuns.length > 0) {
    for (const run of liveRuns) {
      out.push({
        kind: "specialist",
        agentName: agentNames[run.agentKey] ?? run.agentKey,
        text: run.text,
        actions: run.actions,
      });
    }
    if (!processing) {
      out.push({
        kind: "notice",
        text: "Bu so'rov to'liq tugallanmagan (server uzilib qolgan). Yuqoridagi mutaxassislar ulgurgan ishlar — bazaga saqlangan. Qolganini olish uchun so'rovni qayta yuboring.",
      });
    }
  }
  return out;
}

function SpecialistBubble({ agentName, text, actions }: { agentName: string; text: string; actions: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="max-w-[85%] rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-3">
      <p className="text-xs font-semibold text-amber-400">{agentName}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap break-words text-slate-100">{text}</p>
      {actions.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            {actions.length} ta amal bajardi
          </button>
          {open && (
            <ul className="mt-1 flex flex-col gap-1 border-t border-slate-700 pt-1.5">
              {actions.map((a, i) => (
                <li key={i} className="text-[11px] break-words text-slate-400">
                  · {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function AiChat({ initialConversations }: { initialConversations: ConversationSummary[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const directAgentKey = activeConversation?.agent_key ?? null;

  useEffect(() => {
    getAgentNameMap().then(setAgentNames);
    listAgentsForAdmin().then((rows) =>
      setAgentOptions(rows.filter((r) => r.key !== "orchestrator").map((r) => ({ key: r.key, name: r.name, role_title: r.role_title }))),
    );
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function refreshConversation(id: string, agentKey: string | null) {
    const conv = await getConversation(id);
    const raw = (conv?.messages as unknown as ChatMessage[]) ?? [];
    const liveRuns = (conv?.live_specialist_runs as unknown as LiveRun[]) ?? [];
    const stillProcessing = conv?.processing ?? false;
    setMessages(extractDisplayMessages(raw, liveRuns, stillProcessing, agentNames, agentKey));
    setProcessing(stillProcessing);
    if (!stillProcessing) stopPolling();
    return stillProcessing;
  }

  // A turn can take minutes (real research, several specialists). The
  // server starts it in the background and returns immediately, so the
  // client polls for progress instead of waiting on one long request —
  // that's what was causing "An unexpected response was received from the
  // server": the browser/proxy was giving up on the connection long before
  // the work finished, even though the server kept going.
  function startPolling(id: string, agentKey: string | null) {
    stopPolling();
    pollRef.current = setInterval(() => {
      refreshConversation(id, agentKey);
    }, 3000);
  }

  useEffect(() => {
    if (!activeId) return;
    setLoadingHistory(true);
    stopPolling();
    getConversation(activeId)
      .then((conv) => {
        const raw = (conv?.messages as unknown as ChatMessage[]) ?? [];
        const liveRuns = (conv?.live_specialist_runs as unknown as LiveRun[]) ?? [];
        const stillProcessing = conv?.processing ?? false;
        setMessages(extractDisplayMessages(raw, liveRuns, stillProcessing, agentNames, directAgentKey));
        setProcessing(stillProcessing);
        if (stillProcessing) startPolling(activeId, directAgentKey);
      })
      .finally(() => setLoadingHistory(false));
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, agentNames]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewChat(agentKey: string | null) {
    stopPolling();
    setShowAgentPicker(false);
    const id = await createConversation(agentKey);
    setConversations((prev) => [
      { id, title: null, agent_key: agentKey, updated_at: new Date().toISOString() },
      ...prev,
    ]);
    setActiveId(id);
    setMessages([]);
    setProcessing(false);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    let conversationId = activeId;
    setInput("");
    setMessages((prev) => [...prev, { kind: "user", text }]);

    const agentKey = conversationId ? (conversations.find((c) => c.id === conversationId)?.agent_key ?? null) : null;

    startTransition(async () => {
      if (!conversationId) {
        conversationId = await createConversation();
        setActiveId(conversationId);
        setConversations((prev) => [
          { id: conversationId!, title: null, agent_key: null, updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      try {
        await sendChatMessage(conversationId, text);
        setProcessing(true);
        startPolling(conversationId, agentKey);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { kind: "orchestrator", text: `Xatolik: ${err instanceof Error ? err.message : "noma'lum"}` },
        ]);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Button
            size="sm"
            onClick={() => setShowAgentPicker((v) => !v)}
            className="w-full justify-start gap-2"
          >
            <Plus className="h-4 w-4" /> Yangi suhbat
          </Button>
          {showAgentPicker && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
              <button
                onClick={() => handleNewChat(null)}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                Bosh mutaxassis <span className="text-slate-500">(hammasiga taqsimlaydi)</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              {agentOptions.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleNewChat(a.key)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  {a.name} <span className="text-slate-500">— {a.role_title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                c.id === activeId ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <span className="block truncate">{c.title || "Yangi suhbat"}</span>
              {c.agent_key && (
                <span className="block truncate text-[11px] text-slate-500">
                  {agentNames[c.agent_key] ?? c.agent_key}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[70vh] flex-col rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex-1 overflow-y-auto p-4">
          {loadingHistory ? (
            <p className="text-sm text-slate-500">Yuklanmoqda...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
              <p>Masalan: &quot;Uzum kursi uchun 10 ta Reel g&apos;oya ber&quot;</p>
              <p>&quot;Raqobatchilarni tekshir&quot;</p>
              <p>&quot;Kelasi hafta content plan tuz&quot;</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => {
                if (m.kind === "user") {
                  return (
                    <div
                      key={i}
                      className="ml-auto max-w-[85%] rounded-xl bg-amber-500 px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-slate-950"
                    >
                      {m.text}
                    </div>
                  );
                }
                if (m.kind === "specialist") {
                  return <SpecialistBubble key={i} agentName={m.agentName} text={m.text} actions={m.actions} />;
                }
                if (m.kind === "direct") {
                  return (
                    <div key={i} className="max-w-[85%]">
                      <p className="mb-1 text-[11px] font-medium text-amber-400">{m.agentName}</p>
                      <div className="rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-slate-100">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                if (m.kind === "notice") {
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs break-words text-amber-300"
                    >
                      {m.text}
                    </div>
                  );
                }
                return (
                  <div key={i} className="max-w-[85%]">
                    <p className="mb-1 text-[11px] font-medium text-slate-500">Bosh mutaxassis — xulosa</p>
                    <div className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-slate-100">
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {(isPending || processing) && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mutaxassislar ishlamoqda... (bu bir necha daqiqa
                  davom etishi mumkin — sahifani yopmasangiz ham bo&apos;ladi, natija shu yerda paydo bo&apos;ladi)
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-slate-800 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Xabar yozing..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
          <Button size="icon" onClick={handleSend} disabled={isPending || processing || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
