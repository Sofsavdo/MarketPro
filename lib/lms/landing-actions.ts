"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { uploadImage } from "@/lib/supabase/storage";
import { LANDING_BLOCK_KEYS, type LandingBlockKey } from "@/lib/landing";
import type { Locale } from "@/i18n/routing";

const LOCALES: Locale[] = ["uz", "ru", "en"];

/**
 * Only these blocks are open-ended lists an admin can grow/shrink —
 * features' 4 items are each bound to a fixed icon by position (see
 * app/[locale]/page.tsx), so adding/removing/reordering one there would
 * silently mismatch icons to text. Editing an existing feature's text is
 * still fine (updateLandingBlockContent handles that), just not the list
 * shape itself.
 */
const RESIZABLE_LIST_BLOCKS: LandingBlockKey[] = ["testimonials", "faq", "gallery"];

function assertValidKey(key: string): asserts key is LandingBlockKey {
  if (!(LANDING_BLOCK_KEYS as readonly string[]).includes(key)) {
    throw new Error("invalid_landing_block");
  }
}

async function getBlockRow(key: LandingBlockKey) {
  const admin = await createAdminClient();
  const { data } = await admin.from("landing_blocks").select("*").eq("key", key).maybeSingle();
  if (!data) throw new Error("landing_block_not_found");
  return data;
}

/**
 * Merges every text field in `formData` (skipping the routing hidden
 * inputs) into content[locale] for a flat block, or into a list block's
 * top-level fields (e.g. testimonials.title/subtitle) — one save per
 * locale-form covers every field on it in a single write.
 */
export async function updateLandingBlockContent(key: string, locale: string, formData: FormData) {
  await requireAdmin();
  assertValidKey(key);
  const admin = await createAdminClient();
  const row = await getBlockRow(key);

  const content = { ...(row.content as Record<string, Record<string, unknown>>) };
  const localeContent = { ...(content[locale] ?? {}) };
  for (const [field, value] of formData.entries()) {
    if (field === "key" || field === "locale") continue;
    localeContent[field] = value;
  }
  content[locale] = localeContent;

  await admin.from("landing_blocks").update({ content }).eq("key", key);
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
  redirect(`/admin/landing?saved=${key}`);
}

/** Same idea as updateLandingBlockContent, but for one item inside a list block. */
export async function updateLandingListItemContent(
  key: string,
  locale: string,
  index: number,
  formData: FormData,
) {
  await requireAdmin();
  assertValidKey(key);
  const admin = await createAdminClient();
  const row = await getBlockRow(key);

  const content = { ...(row.content as Record<string, { items?: Record<string, unknown>[] }>) };
  const localeContent = { ...(content[locale] ?? {}) };
  const items = [...(localeContent.items ?? [])];
  if (!items[index]) throw new Error("item_not_found");

  const updatedItem = { ...items[index] };
  for (const [field, value] of formData.entries()) {
    if (field === "key" || field === "locale" || field === "index") continue;
    updatedItem[field] = value;
  }
  items[index] = updatedItem;
  localeContent.items = items;
  content[locale] = localeContent;

  await admin.from("landing_blocks").update({ content }).eq("key", key);
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
  redirect(`/admin/landing?saved=${key}`);
}

/**
 * Appends a blank item to `items` in all 3 locales at once, so an item's
 * index always means the same thing (the same person's testimonial, the
 * same FAQ question) across every language.
 */
export async function addLandingListItem(key: string, blankItem: Record<string, string>) {
  await requireAdmin();
  assertValidKey(key);
  if (!RESIZABLE_LIST_BLOCKS.includes(key)) throw new Error("block_is_not_resizable");
  const admin = await createAdminClient();
  const row = await getBlockRow(key);

  const content = { ...(row.content as Record<string, { items?: Record<string, unknown>[] }>) };
  for (const locale of LOCALES) {
    const localeContent = { ...(content[locale] ?? {}) };
    localeContent.items = [...(localeContent.items ?? []), { ...blankItem }];
    content[locale] = localeContent;
  }

  await admin.from("landing_blocks").update({ content }).eq("key", key);
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}

export async function removeLandingListItem(key: string, index: number) {
  await requireAdmin();
  assertValidKey(key);
  if (!RESIZABLE_LIST_BLOCKS.includes(key)) throw new Error("block_is_not_resizable");
  const admin = await createAdminClient();
  const row = await getBlockRow(key);

  const content = { ...(row.content as Record<string, { items?: Record<string, unknown>[] }>) };
  for (const locale of LOCALES) {
    const localeContent = { ...(content[locale] ?? {}) };
    localeContent.items = (localeContent.items ?? []).filter((_, i) => i !== index);
    content[locale] = localeContent;
  }

  await admin.from("landing_blocks").update({ content }).eq("key", key);
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}

export async function moveLandingListItem(key: string, index: number, direction: "up" | "down") {
  await requireAdmin();
  assertValidKey(key);
  if (!RESIZABLE_LIST_BLOCKS.includes(key)) throw new Error("block_is_not_resizable");
  const swapWith = direction === "up" ? index - 1 : index + 1;
  const admin = await createAdminClient();
  const row = await getBlockRow(key);

  const content = { ...(row.content as Record<string, { items?: Record<string, unknown>[] }>) };
  for (const locale of LOCALES) {
    const localeContent = { ...(content[locale] ?? {}) };
    const items = [...(localeContent.items ?? [])];
    if (swapWith < 0 || swapWith >= items.length) continue;
    [items[index], items[swapWith]] = [items[swapWith], items[index]];
    localeContent.items = items;
    content[locale] = localeContent;
  }

  await admin.from("landing_blocks").update({ content }).eq("key", key);
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}

export async function toggleLandingBlockVisibility(key: string, nextVisible: boolean) {
  await requireAdmin();
  assertValidKey(key);
  const admin = await createAdminClient();
  await admin.from("landing_blocks").update({ is_visible: nextVisible }).eq("key", key);
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}

/** Swaps this block's order_index with its neighbor in that direction. */
export async function moveLandingBlock(key: string, direction: "up" | "down") {
  await requireAdmin();
  assertValidKey(key);
  const admin = await createAdminClient();
  const { data: blocks } = await admin
    .from("landing_blocks")
    .select("key, order_index")
    .order("order_index", { ascending: true });
  if (!blocks) return;

  const idx = blocks.findIndex((b) => b.key === key);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= blocks.length) return;

  const a = blocks[idx];
  const b = blocks[swapIdx];
  await admin.from("landing_blocks").update({ order_index: b.order_index }).eq("key", a.key);
  await admin.from("landing_blocks").update({ order_index: a.order_index }).eq("key", b.key);

  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}

/** Uploads (or replaces) the hero section's background image — same photo in all 3 locales. */
export async function updateLandingHeroImage(formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();
  const row = await getBlockRow("hero");

  const imageUrl = await uploadImage("landing-images", formData.get("image_file") as File | null);
  if (!imageUrl) return;

  const content = { ...(row.content as Record<string, Record<string, unknown>>) };
  for (const locale of LOCALES) {
    content[locale] = { ...(content[locale] ?? {}), imageUrl };
  }

  await admin.from("landing_blocks").update({ content }).eq("key", "hero");
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}

/**
 * Appends one photo to the gallery block — same image + index across all 3
 * locales (it's the same photo), only the caption can differ per locale.
 */
export async function addLandingGalleryImage(formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();
  const row = await getBlockRow("gallery");

  const imageUrl = await uploadImage("landing-images", formData.get("image_file") as File | null);
  if (!imageUrl) throw new Error("Rasm tanlanmadi");

  const content = { ...(row.content as Record<string, { items?: Record<string, unknown>[] }>) };
  for (const locale of LOCALES) {
    const localeContent = { ...(content[locale] ?? {}) };
    const caption = String(formData.get(`caption_${locale}`) ?? "");
    localeContent.items = [...(localeContent.items ?? []), { imageUrl, caption }];
    content[locale] = localeContent;
  }

  await admin.from("landing_blocks").update({ content }).eq("key", "gallery");
  revalidatePath("/admin/landing");
  revalidatePath("/[locale]", "page");
}
