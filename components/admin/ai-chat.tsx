"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Plus, Loader2 } from "lucide-react";
import {
  createConversation,
  getConversation,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/ai-department/chat-actions";

type ConversationSummary = { id: string; title: string | null; updated_at: string };
type DisplayMessage = { role: "user" | "assistant"; text: string };

function extractDisplayMessages(raw: ChatMessage[]): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  for (const message of raw) {
    if (message.role === "user" && typeof message.content === "string") {
      out.push({ role: "user", text: message.content });
    } else if (message.role === "assistant" && Array.isArray(message.content)) {
      const text = message.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (text) out.push({ role: "assistant", text });
    }
  }
  return out;
}

export function AiChat({ initialConversations }: { initialConversations: ConversationSummary[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) return;
    setLoadingHistory(true);
    getConversation(activeId)
      .then((conv) => {
        const raw = (conv?.messages as unknown as ChatMessage[]) ?? [];
        setMessages(extractDisplayMessages(raw));
      })
      .finally(() => setLoadingHistory(false));
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewChat() {
    const id = await createConversation();
    setConversations((prev) => [{ id, title: null, updated_at: new Date().toISOString() }, ...prev]);
    setActiveId(id);
    setMessages([]);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    let conversationId = activeId;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);

    startTransition(async () => {
      if (!conversationId) {
        conversationId = await createConversation();
        setActiveId(conversationId);
        setConversations((prev) => [
          { id: conversationId!, title: null, updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      try {
        const reply = await sendChatMessage(conversationId, text);
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Xatolik: ${err instanceof Error ? err.message : "noma'lum"}` },
        ]);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={handleNewChat} className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" /> Yangi suhbat
        </Button>
        <div className="flex flex-col gap-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                c.id === activeId ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {c.title || "Yangi suhbat"}
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
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "ml-auto bg-amber-500 text-slate-950"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {isPending && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yozmoqda...
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
          <Button size="icon" onClick={handleSend} disabled={isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
