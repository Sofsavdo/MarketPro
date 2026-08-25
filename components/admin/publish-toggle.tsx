"use client";

import { useTransition } from "react";
import { toggleCoursePublished } from "@/lib/lms/admin-actions";
import { Button } from "@/components/ui/button";

export function PublishToggle({
  courseId,
  isPublished,
}: {
  courseId: string;
  isPublished: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => toggleCoursePublished(courseId, !isPublished))}
    >
      {isPublished ? "Yashirish" : "Chop etish"}
    </Button>
  );
}
