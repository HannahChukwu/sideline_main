"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CanvasTextElement, PostLayout } from "@/lib/editor/defaultLayout";

export type PostCopy = Record<CanvasTextElement["key"], string>;

type Props = {
  layout: PostLayout;
  copy: PostCopy;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeLayout: (next: PostLayout) => void;
};

function trackingClass(t?: CanvasTextElement["tracking"]) {
  if (t === "widest") return "tracking-[0.35em]";
  if (t === "wide") return "tracking-[0.2em]";
  return "tracking-[-0.03em]";
}

export function PostCanvas({
  layout,
  copy,
  selectedId,
  onSelect,
  onChangeLayout,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const selected = useMemo(
    () => layout.elements.find((e) => e.id === selectedId) ?? null,
    [layout.elements, selectedId]
  );

  function pxToCanvas(dx: number, dy: number) {
    const el = containerRef.current;
    if (!el) return { dx: 0, dy: 0 };
    const rect = el.getBoundingClientRect();
    const scaleX = layout.width / rect.width;
    const scaleY = layout.height / rect.height;
    return { dx: dx * scaleX, dy: dy * scaleY };
  }

  function onPointerDown(e: React.PointerEvent, element: CanvasTextElement) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(element.id);
    setDrag({
      id: element.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: element.x,
      originY: element.y,
    });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const { dx, dy } = pxToCanvas(e.clientX - drag.startX, e.clientY - drag.startY);
    onChangeLayout({
      ...layout,
      elements: layout.elements.map((el) =>
        el.id === drag.id
          ? { ...el, x: Math.max(0, Math.min(layout.width - 10, drag.originX + dx)), y: Math.max(0, Math.min(layout.height - 10, drag.originY + dy)) }
          : el
      ),
    });
  }

  function onPointerUp() {
    setDrag(null);
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className={cn(
          "relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-background",
          "select-none touch-none"
        )}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={() => onSelect(null)}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-dots opacity-100" />
        <div className="absolute inset-0 bg-speed-lines" />
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-primary/12 rounded-full blur-[180px]" />
        <div className="absolute bottom-[-120px] right-[-120px] w-[520px] h-[520px] bg-violet-500/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-black/35" />

        {/* Athlete silhouette placeholder */}
        <div className="absolute right-[70px] bottom-[220px] w-[420px] h-[620px] rounded-[40px] border border-white/10 bg-white/[0.04] backdrop-blur-[2px]" />
        <div className="absolute right-[92px] bottom-[242px] w-[376px] h-[576px] rounded-[34px] bg-gradient-to-b from-white/[0.06] to-transparent" />

        {/* Text elements */}
        {layout.elements.map((el) => {
          const isSelected = el.id === selectedId;
          const text = copy[el.key] ?? "";
          const display = el.uppercase ? text.toUpperCase() : text;

          return (
            <div
              key={el.id}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => onPointerDown(e, el)}
              className={cn(
                "absolute cursor-move",
                isSelected && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background rounded-md"
              )}
              style={{
                left: `${(el.x / layout.width) * 100}%`,
                top: `${(el.y / layout.height) * 100}%`,
                width: `${(el.w / layout.width) * 100}%`,
              }}
            >
              {el.key === "cta" ? (
                <div className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center">
                  <div
                    className={cn(
                      "text-white/95 drop-shadow-[0_10px_30px_rgba(168,85,247,0.30)]",
                      trackingClass(el.tracking)
                    )}
                    style={{ fontSize: `${(el.fontSize / layout.height) * 100}vh`, fontWeight: el.weight ?? 900 }}
                  >
                    {display}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "text-white/95",
                    el.align === "center" && "text-center",
                    el.align === "right" && "text-right",
                    trackingClass(el.tracking),
                    el.key === "headline" && "text-gradient"
                  )}
                  style={{
                    fontSize: `${(el.fontSize / layout.height) * 100}vh`,
                    fontWeight: el.weight ?? 800,
                    lineHeight: 1.05,
                    textShadow: "0 20px 80px rgba(168, 85, 247, 0.22)",
                  }}
                >
                  {display}
                </div>
              )}
            </div>
          );
        })}

        {/* Hint */}
        {!selected && (
          <div className="absolute left-4 bottom-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/60">
            Click text to edit, drag to reposition
          </div>
        )}
      </div>
    </div>
  );
}

