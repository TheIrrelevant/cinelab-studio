/**
 * @file SceneJsonPanel.tsx
 * @description Shows the provider-neutral render request the current studio scene produces,
 *   or what is missing, with copy and download actions.
 * @scope cinelab-studio
 * @depends render/scene-json.ts, render/contract.ts
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Character } from "@cinelab/character/schema";
import type { RenderRequest } from "../contract";
import { buildRenderRequest, buildSceneJson } from "../scene-json";
import type { StudioSceneData } from "@cinelab/studio/scene-storage";

export function SceneJsonPanel({
  scene,
  characters,
  onClose,
}: {
  scene: StudioSceneData;
  characters: readonly Character[];
  onClose: () => void;
}) {
  const built = useMemo(() => buildSceneJson(scene, characters), [scene, characters]);
  const [request, setRequest] = useState<RenderRequest | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!built.ok) return;
    let cancelled = false;
    buildRenderRequest(built.scene, { kind: "preview" }).then((next) => {
      if (!cancelled) setRequest(next);
    });
    return () => {
      cancelled = true;
    };
  }, [built]);

  const shown = built.ok ? request : null;
  const text = shown ? JSON.stringify(shown, null, 2) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    if (!shown) return;
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `cinelab-scene-${shown.sceneHash.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      aria-label="Scene JSON"
      className="absolute right-5 top-1/2 flex max-h-[calc(100dvh-11rem)] w-[min(26rem,calc(100%-2.5rem))] -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-[#151617]/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Render contract</p>
          <h2 className="mt-1 text-sm font-medium">Scene JSON</h2>
        </div>
        <button type="button" aria-label="Close scene JSON" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      {!built.ok ? (
        <div role="status" className="space-y-2 text-xs text-white/65">
          <p className="text-white">The scene is not ready to render yet:</p>
          <ul className="list-disc space-y-1 pl-4">
            {built.issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      ) : !shown ? (
        <p role="status" className="text-xs text-white/55">Building request…</p>
      ) : (
        <>
          <p role="status" className="mb-3 text-xs text-white/55">
            Ready · scene hash <code className="text-amber-200">{shown.sceneHash.slice(0, 12)}</code> · {shown.output.width}×{shown.output.height} preview
          </p>
          <pre aria-label="Render request JSON" className="min-h-0 flex-1 overflow-auto rounded-xl bg-black/35 p-3 text-[10px] leading-relaxed text-white/75">
            {text}
          </pre>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={copy} className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-950">
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button type="button" onClick={download} className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:border-white/35">
              Download
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
