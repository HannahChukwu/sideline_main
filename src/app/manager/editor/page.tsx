"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_POST_LAYOUT, type PostLayout } from "@/lib/editor/defaultLayout";
import { PostCanvas, type PostCopy } from "@/components/editor/PostCanvas";
import { createClient } from "@/lib/supabase/client";
import {
  clearManagerDraft,
  loadManagerDraft,
  saveManagerDraft,
  type ManagerDraftPayload,
} from "@/lib/supabase/managerDraft";

const DEFAULT_COPY: PostCopy = {
  topLabel: "GAME DAY",
  headline: "FRIDAY NIGHT LIGHTS",
  matchLine: "LIONS vs TIGERS",
  dateTime: "Mar 22 • 7:00 PM",
  location: "Home Stadium",
  cta: "BE THERE",
  footer: "Powered by SIDELINE",
};

export default function ManagerEditorPage() {
  const [layout, setLayout] = useState<PostLayout>(DEFAULT_POST_LAYOUT);
  const [copy, setCopy] = useState<PostCopy>(DEFAULT_COPY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPayload, setDraftPayload] = useState<ManagerDraftPayload | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (user) {
        setManagerId(user.id);
        loadManagerDraft(supabase, user.id)
          .then((draft) => {
            if (cancelled || !draft) return;
            const layoutFromDb = draft.editor_layout as PostLayout | null;
            const copyFromDb = draft.editor_copy as PostCopy | null;
            if (layoutFromDb) setLayout(layoutFromDb);
            if (copyFromDb) setCopy(copyFromDb);
            setDraftPayload({
              generationRequest: draft.generation_request,
              compiledImagePrompt: draft.compiled_image_prompt ?? "",
              compiledCaptionPrompt: draft.compiled_caption_prompt ?? "",
              referenceImageIds: Array.isArray(draft.reference_image_ids) ? draft.reference_image_ids : [],
              editorCopy: copyFromDb ?? undefined,
              editorLayout: layoutFromDb ?? undefined,
            });
          })
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const selectedEl = useMemo(
    () => layout.elements.find((e) => e.id === selectedId) ?? null,
    [layout.elements, selectedId]
  );

  const selectedKey = selectedEl?.key ?? null;

  return (
    <div className="min-h-screen px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button asChild variant="outline">
          <Link href="/manager">
            <ArrowLeft className="w-4 h-4" />
            Back to pipeline
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            setLayout(DEFAULT_POST_LAYOUT);
            setCopy(DEFAULT_COPY);
            setSelectedId(null);
            setDraftPayload(null);
            if (managerId) await clearManagerDraft(supabase, managerId);
          }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <PostCanvas
          layout={layout}
          copy={copy}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChangeLayout={(next) => {
            setLayout(next);
            if (managerId && draftPayload) {
              saveManagerDraft(supabase, managerId, {
                ...draftPayload,
                editorCopy: copy,
                editorLayout: next,
              }).then(() => setDraftPayload((p) => (p ? { ...p, editorLayout: next } : null)));
            }
          }}
        />

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit</CardTitle>
              <CardDescription>Click a text element on the canvas to edit it.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {selectedKey ? (
                <>
                  <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                    Selected: <span className="text-foreground/80">{selectedKey}</span>
                  </div>
                  <Input
                    value={copy[selectedKey]}
                    onChange={(e) => {
                      const nextCopy = { ...copy, [selectedKey]: e.target.value };
                      setCopy(nextCopy);
                      if (managerId && draftPayload) {
                        saveManagerDraft(supabase, managerId, {
                          ...draftPayload,
                          editorCopy: nextCopy,
                          editorLayout: layout,
                        }).then(() => setDraftPayload((p) => (p ? { ...p, editorCopy: nextCopy } : null)));
                      }
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                        Font size
                      </div>
                      <Input
                        type="number"
                        value={selectedEl?.fontSize ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setLayout((l) => ({
                            ...l,
                            elements: l.elements.map((el) =>
                              el.id === selectedId ? { ...el, fontSize: Math.max(10, Math.min(160, v)) } : el
                            ),
                          }));
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                        Width
                      </div>
                      <Input
                        type="number"
                        value={selectedEl?.w ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setLayout((l) => ({
                            ...l,
                            elements: l.elements.map((el) =>
                              el.id === selectedId ? { ...el, w: Math.max(120, Math.min(l.width, v)) } : el
                            ),
                          }));
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Nothing selected. Click a text element in the preview.
                </div>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="pb-0">
              <CardTitle>Next</CardTitle>
              <CardDescription>Later, this will support AI “remake” + export.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="button" disabled>
                Export (coming soon)
              </Button>
              <Button type="button" variant="outline" disabled>
                Remake with AI (coming soon)
              </Button>
              <div className={cn("text-xs text-muted-foreground mt-2")}>
                You can already fix wrong names/dates by editing the text fields directly.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

