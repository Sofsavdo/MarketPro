"use client";

/**
 * Wraps a destructive server action form with a native confirm() guard —
 * mirrors DeleteVideoButton's pattern, generalized so every "delete" button
 * in the admin (module, lesson, material, quiz question, live session,
 * review) gets the same one-click-away-from-permanent-loss protection
 * instead of only the video upload flow having it.
 */
export function ConfirmDeleteForm({
  action,
  message,
  children,
}: {
  action: () => void | Promise<void>;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
