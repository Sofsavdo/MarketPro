import { getTelegramStatus } from "@/lib/telegram/actions";
import { TelegramPanel } from "@/components/admin/telegram-panel";

export default async function TelegramPage() {
  const status = await getTelegramStatus();
  return <TelegramPanel initialStatus={status} />;
}
