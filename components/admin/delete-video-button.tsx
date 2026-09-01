"use client";

/** Confirms before submitting — deleting a lesson's video is permanent (removed from Bunny too). */
export function DeleteVideoButton({ action }: { action: () => void | Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Videoni butunlay o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-400 hover:underline">
        Videoni o&apos;chirish va boshqasini yuklash
      </button>
    </form>
  );
}
