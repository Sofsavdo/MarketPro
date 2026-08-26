import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse } from "@/lib/lms/admin-actions";

export default function AdminNewCoursePage() {
  return (
    <div>
      <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
        ← Kurslar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Yangi kurs qo&apos;shish</h1>

      <form action={createCourse} className="mt-8 max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nomi (UZ)" name="title_uz" required />
          <Field label="Nomi (RU)" name="title_ru" />
          <Field label="Nomi (EN)" name="title_en" />
        </div>
        <p className="text-xs text-slate-500">
          Tavsif ixtiyoriy — kerak bo&apos;lmasa bo&apos;sh qoldirishingiz mumkin, keyinroq
          qo&apos;shib qo&apos;ysangiz ham bo&apos;ladi.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tavsif (UZ)" name="description_uz" textarea />
          <Field label="Tavsif (RU)" name="description_ru" textarea />
          <Field label="Tavsif (EN)" name="description_en" textarea />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cover_file">Cover rasm (JPG/PNG/WEBP, 5 MB gacha)</Label>
          <input
            id="cover_file"
            name="cover_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-amber-400"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Muddat (oy)" name="duration_months" type="number" defaultValue="1" />
          <Field
            label="Narxi (VIP, umrbod kirish — 2 000 000 – 8 000 000)"
            name="price"
            type="number"
            defaultValue="0"
          />
        </div>
        <Button type="submit">Kursni yaratish</Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  textarea = false,
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          rows={3}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
