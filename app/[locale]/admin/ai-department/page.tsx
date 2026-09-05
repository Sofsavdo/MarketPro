import { listConversations } from "@/lib/ai-department/chat-actions";
import { AiChat } from "@/components/admin/ai-chat";

export default async function AiDepartmentChatPage() {
  const conversations = await listConversations();

  return <AiChat initialConversations={conversations} />;
}
