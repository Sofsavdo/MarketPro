import { createAdminClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus, Upload } from "lucide-react";
import {
  updateLandingBlockContent,
  updateLandingListItemContent,
  addLandingListItem,
  removeLandingListItem,
  moveLandingListItem,
  toggleLandingBlockVisibility,
  moveLandingBlock,
  updateLandingHeroImage,
  addLandingGalleryImage,
} from "@/lib/lms/landing-actions";
import type { LandingBlockKey } from "@/lib/landing";
import type { Locale } from "@/i18n/routing";

const LOCALES: Locale[] = ["uz", "ru", "en"];
const LOCALE_LABELS: Record<Locale, string> = { uz: "O'zbekcha", ru: "Ruscha", en: "Inglizcha" };

const BLOCK_LABELS: Record<LandingBlockKey, string> = {
  hero: "Hero banner",
  features: "Xususiyatlar (\"Nega IZDOSH Academy\")",
  courses_carousel: "Kurslar bo'limi sarlavhasi",
  testimonials: "Bitiruvchilar (sharhlar)",
  pricing_teaser: "Narx taklifi bloki",
  guarantee: "Kafolat bloki",
  faq: "Ko'p so'raladigan savollar",
  gallery: "Rasmlar galereyasi (carusel)",
};

type FieldDef = { name: string; label: string; multiline?: boolean };

const FLAT_FIELDS: Partial<Record<LandingBlockKey, FieldDef[]>> = {
  hero: [
    { name: "eyebrow", label: "Kichik sarlavha (badge)" },
    { name: "title", label: "Asosiy sarlavha (H1)" },
    { name: "subtitle", label: "Tavsif", multiline: true },
    { name: "ctaPrimary", label: "Asosiy tugma matni" },
    { name: "ctaSecondary", label: "Ikkinchi tugma matni" },
    { name: "stat1Value", label: "1-statistika raqami" },
    { name: "stat1Label", label: "1-statistika izohi" },
    { name: "stat2Value", label: "2-statistika raqami" },
    { name: "stat2Label", label: "2-statistika izohi" },
    { name: "stat3Value", label: "3-statistika raqami" },
    { name: "stat3Label", label: "3-statistika izohi" },
  ],
  courses_carousel: [
    { name: "title", label: "Sarlavha" },
    { name: "subtitle", label: "Tavsif", multiline: true },
  ],
  pricing_teaser: [
    { name: "title", label: "Sarlavha" },
    { name: "subtitle", label: "Tavsif", multiline: true },
    { name: "cta", label: "Tugma matni" },
  ],
  guarantee: [
    { name: "title", label: "Sarlavha" },
    { name: "desc", label: "Tavsif", multiline: true },
  ],
};

// features/testimonials/faq also have a top-level "title" (and testimonials
// a "subtitle") on top of their items list.
const LIST_TOP_FIELDS: Partial<Record<LandingBlockKey, FieldDef[]>> = {
  features: [{ name: "title", label: "Bo'lim sarlavhasi" }],
  testimonials: [
    { name: "title", label: "Bo'lim sarlavhasi" },
    { name: "subtitle", label: "Bo'lim tavsifi" },
  ],
  faq: [{ name: "title", label: "Bo'lim sarlavhasi" }],
  gallery: [
    { name: "title", label: "Bo'lim sarlavhasi" },
    { name: "subtitle", label: "Bo'lim tavsifi" },
  ],
};

const ITEM_FIELDS: Partial<Record<LandingBlockKey, FieldDef[]>> = {
  features: [
    { name: "title", label: "Sarlavha" },
    { name: "desc", label: "Tavsif", multiline: true },
  ],
  testimonials: [
    { name: "quote", label: "Fikr matni", multiline: true },
    { name: "name", label: "Ism-familiya" },
    { name: "role", label: "Yo'nalish / lavozim" },
  ],
  faq: [
    { name: "q", label: "Savol" },
    { name: "a", label: "Javob", multiline: true },
  ],
  gallery: [{ name: "caption", label: "Izoh (ixtiyoriy)" }],
};

const RESIZABLE: LandingBlockKey[] = ["testimonials", "faq", "gallery"];
/** Gallery items carry an uploaded image, not just text — its "add" flow is a file form, not the generic blank-item button. */
const IMAGE_LIST_BLOCKS: LandingBlockKey[] = ["gallery"];

export default async function AdminLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const admin = await createAdminClient();
  const { data: blocks } = await admin
    .from("landing_blocks")
    .select("*")
    .order("order_index", { ascending: true });

  const rows = blocks ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Landing boshqaruvi</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bosh sahifaning har bir blokini shu yerdan tahrirlang — o&apos;zgarish saqlangach sahifa
        avtomatik yangilanadi.
      </p>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Saqlandi!
        </div>
      )}

      <div className="mt-6 space-y-4">
        {rows.map((row, i) => {
          const key = row.key as LandingBlockKey;
          const label = BLOCK_LABELS[key] ?? row.key;
          const flatFields = FLAT_FIELDS[key];
          const topFields = LIST_TOP_FIELDS[key];
          const itemFields = ITEM_FIELDS[key];
          const isResizable = RESIZABLE.includes(key);

          return (
            <div
              key={row.id}
              className={`rounded-xl border p-4 ${
                row.is_visible ? "border-slate-800 bg-slate-900/40" : "border-slate-800 bg-slate-900/10 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <form action={moveLandingBlock.bind(null, key, "up")}>
                      <button
                        type="submit"
                        disabled={i === 0}
                        aria-label="Yuqoriga"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-20"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <form action={moveLandingBlock.bind(null, key, "down")}>
                      <button
                        type="submit"
                        disabled={i === rows.length - 1}
                        aria-label="Pastga"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-20"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                  <span className="font-semibold text-white">{label}</span>
                  {!row.is_visible && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      Yashirilgan
                    </span>
                  )}
                </div>
                <form action={toggleLandingBlockVisibility.bind(null, key, !row.is_visible)}>
                  <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                    {row.is_visible ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Yashirish
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Ko&apos;rsatish
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm text-amber-400 hover:underline">
                  Tahrirlash
                </summary>

                <div className="mt-4 space-y-6 border-t border-slate-800 pt-4">
                  {key === "hero" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Hero rasmi (ixtiyoriy, barcha tillar uchun bitta rasm)</Label>
                      {(() => {
                        const heroImageUrl = (row.content as Record<string, { imageUrl?: string }>)?.uz
                          ?.imageUrl;
                        return heroImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin preview of a Supabase Storage URL
                          <img
                            src={heroImageUrl}
                            alt=""
                            className="h-32 w-auto rounded-lg border border-slate-800 object-cover"
                          />
                        ) : null;
                      })()}
                      <form action={updateLandingHeroImage} className="flex items-center gap-2">
                        <input
                          type="file"
                          name="image_file"
                          accept="image/jpeg,image/png,image/webp"
                          required
                          className="text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-amber-400"
                        />
                        <Button type="submit" size="sm" variant="outline">
                          Yuklash
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Flat / top-level fields, one card per locale */}
                  {(flatFields || topFields) && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {LOCALES.map((locale) => (
                        <form
                          key={locale}
                          action={updateLandingBlockContent.bind(null, key, locale)}
                          className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                        >
                          <p className="text-xs font-semibold text-slate-500 uppercase">
                            {LOCALE_LABELS[locale]}
                          </p>
                          {(flatFields ?? topFields ?? []).map((f) => (
                            <FieldInput
                              key={f.name}
                              field={f}
                              defaultValue={String(
                                (row.content as Record<string, Record<string, unknown>>)?.[locale]?.[
                                  f.name
                                ] ?? "",
                              )}
                            />
                          ))}
                          <Button type="submit" size="sm" className="w-full">
                            Saqlash
                          </Button>
                        </form>
                      ))}
                    </div>
                  )}

                  {/* List items (features/testimonials/faq) */}
                  {itemFields && (
                    <div className="space-y-4">
                      {(() => {
                        const contentByLocale = row.content as Record<
                          string,
                          { items?: Record<string, unknown>[] }
                        >;
                        const itemCount = contentByLocale?.uz?.items?.length ?? 0;
                        return Array.from({ length: itemCount }).map((_, idx) => (
                          <div key={idx} className="rounded-lg border border-slate-800 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500">#{idx + 1}</span>
                              {isResizable && (
                                <div className="flex items-center gap-1">
                                  <form action={moveLandingListItem.bind(null, key, idx, "up")}>
                                    <button
                                      type="submit"
                                      disabled={idx === 0}
                                      aria-label="Yuqoriga"
                                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-20"
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                  <form action={moveLandingListItem.bind(null, key, idx, "down")}>
                                    <button
                                      type="submit"
                                      disabled={idx === itemCount - 1}
                                      aria-label="Pastga"
                                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-20"
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                  <form action={removeLandingListItem.bind(null, key, idx)}>
                                    <button
                                      type="submit"
                                      aria-label="O'chirish"
                                      className="rounded p-1 text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                            {IMAGE_LIST_BLOCKS.includes(key) &&
                              (() => {
                                const imgUrl = (
                                  (contentByLocale?.uz?.items ?? [])[idx] as
                                    | { imageUrl?: string }
                                    | undefined
                                )?.imageUrl;
                                return imgUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- admin preview of a Supabase Storage URL
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    className="mt-2 h-24 w-40 rounded-lg border border-slate-800 object-cover"
                                  />
                                ) : null;
                              })()}
                            <div className="mt-2 grid gap-3 sm:grid-cols-3">
                              {LOCALES.map((locale) => (
                                <form
                                  key={locale}
                                  action={updateLandingListItemContent.bind(null, key, locale, idx)}
                                  className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                                >
                                  <p className="text-xs font-semibold text-slate-500 uppercase">
                                    {LOCALE_LABELS[locale]}
                                  </p>
                                  {itemFields.map((f) => (
                                    <FieldInput
                                      key={f.name}
                                      field={f}
                                      defaultValue={String(
                                        (
                                          (contentByLocale?.[locale]?.items ?? [])[idx] as
                                            | Record<string, unknown>
                                            | undefined
                                        )?.[f.name] ?? "",
                                      )}
                                    />
                                  ))}
                                  <Button type="submit" size="sm" className="w-full">
                                    Saqlash
                                  </Button>
                                </form>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}

                      {isResizable && IMAGE_LIST_BLOCKS.includes(key) && (
                        <form
                          action={addLandingGalleryImage}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-700 p-3"
                        >
                          <input
                            type="file"
                            name="image_file"
                            accept="image/jpeg,image/png,image/webp"
                            required
                            className="text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-amber-400"
                          />
                          <Input name="caption_uz" placeholder="Izoh (UZ)" className="w-36 text-sm" />
                          <Input name="caption_ru" placeholder="Izoh (RU)" className="w-36 text-sm" />
                          <Input name="caption_en" placeholder="Izoh (EN)" className="w-36 text-sm" />
                          <Button type="submit" size="sm" className="gap-1.5">
                            <Upload className="h-3.5 w-3.5" /> Rasm qo&apos;shish
                          </Button>
                        </form>
                      )}

                      {isResizable && !IMAGE_LIST_BLOCKS.includes(key) && (
                        <form
                          action={addLandingListItem.bind(
                            null,
                            key,
                            Object.fromEntries(itemFields.map((f) => [f.name, ""])),
                          )}
                        >
                          <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Yangi qo&apos;shish
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldInput({ field, defaultValue }: { field: FieldDef; defaultValue: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={field.name} className="text-xs">
        {field.label}
      </Label>
      {field.multiline ? (
        <textarea
          id={field.name}
          name={field.name}
          defaultValue={defaultValue}
          rows={3}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      ) : (
        <Input id={field.name} name={field.name} defaultValue={defaultValue} className="text-sm" />
      )}
    </div>
  );
}
