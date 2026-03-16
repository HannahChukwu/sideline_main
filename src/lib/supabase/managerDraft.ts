import type { PostCopy } from "@/components/editor/PostCanvas";
import type { PostLayout } from "@/lib/editor/defaultLayout";
import type { GenerationRequest } from "@/lib/pipeline/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export type ManagerDraftRow = {
  id: string;
  manager_id: string;
  generation_request: GenerationRequest;
  compiled_image_prompt: string | null;
  compiled_caption_prompt: string | null;
  reference_image_ids: string[];
  editor_copy: PostCopy | null;
  editor_layout: PostLayout | null;
  created_at: string;
  updated_at: string;
};

export type ManagerDraftPayload = {
  generationRequest: GenerationRequest;
  compiledImagePrompt: string;
  compiledCaptionPrompt: string;
  referenceImageIds?: string[];
  editorCopy?: PostCopy | null;
  editorLayout?: PostLayout | null;
};

export async function loadManagerDraft(
  supabase: Client,
  managerId: string
): Promise<ManagerDraftRow | null> {
  const { data, error } = await supabase
    .from("manager_drafts")
    .select("*")
    .eq("manager_id", managerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ManagerDraftRow | null;
}

export async function saveManagerDraft(
  supabase: Client,
  managerId: string,
  payload: ManagerDraftPayload
): Promise<ManagerDraftRow> {
  const row = {
    manager_id: managerId,
    generation_request: payload.generationRequest as unknown as Record<string, unknown>,
    compiled_image_prompt: payload.compiledImagePrompt,
    compiled_caption_prompt: payload.compiledCaptionPrompt,
    reference_image_ids: payload.referenceImageIds ?? [],
    editor_copy: payload.editorCopy as unknown as Record<string, unknown> ?? null,
    editor_layout: payload.editorLayout as unknown as Record<string, unknown> ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("manager_drafts")
    .select("id")
    .eq("manager_id", managerId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("manager_drafts")
      .update(row)
      .eq("id", (existing as { id: string }).id)
      .select()
      .single();

    if (error) throw error;
    return updated as ManagerDraftRow;
  }

  const { data: inserted, error } = await supabase
    .from("manager_drafts")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return inserted as ManagerDraftRow;
}

export async function clearManagerDraft(
  supabase: Client,
  managerId: string
): Promise<void> {
  await supabase.from("manager_drafts").delete().eq("manager_id", managerId);
}
