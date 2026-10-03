/**
 * @file PreviewWindow.tsx
 * @description Draggable, keyboard-movable camera window with minimize and restore controls.
 * @depends react
 */
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function PreviewWindow({ children }: { children: ReactNode }) {
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const constrain = (x: number, y: number) => {
    const bounds = panel.current?.getBoundingClientRect();
    return { x: Math.max(8, Math.min(x, window.innerWidth - (bounds?.width ?? 400) - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - (bounds?.height ?? 440) - 8)) };
  };
  useEffect(() => {
    const resize = () => setPosition(current => current ? constrain(current.x, current.y) : current);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  if (minimized) return (
    <button type="button" aria-label="Restore camera preview" title="Restore camera preview"
      onClick={() => setMinimized(false)}
      className="absolute bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-300/40 bg-neutral-950 text-amber-300 shadow-xl">
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></svg>
    </button>
  );
  return (
    <section ref={panel} aria-label="Camera preview"
      style={position ? {left:position.x, top:position.y, transform:"none"} : undefined}
      className="absolute left-1/2 top-20 z-30 w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[#090a0b]/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:top-4">
      <div className="flex items-center border-b border-white/10 bg-neutral-900">
        <button type="button" aria-label="Move camera preview" title="Drag to move; arrow keys to reposition"
          className="flex min-w-0 flex-1 touch-none cursor-grab items-center gap-2 px-4 py-3 text-left text-xs font-medium text-white/70 active:cursor-grabbing"
          onPointerDown={event => {
            if (event.button !== 0) return;
            const box = panel.current!.getBoundingClientRect();
            drag.current = {id:event.pointerId, x:event.clientX, y:event.clientY, left:box.left, top:box.top};
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const start = drag.current;
            if (!start || start.id !== event.pointerId) return;
            setPosition(constrain(start.left + event.clientX - start.x, start.top + event.clientY - start.y));
          }}
          onPointerUp={event => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }}
          onKeyDown={event => {
            const delta = {ArrowLeft:[-20,0], ArrowRight:[20,0], ArrowUp:[0,-20], ArrowDown:[0,20]}[event.key];
            if (!delta) return;
            event.preventDefault();
            const box = panel.current!.getBoundingClientRect();
            setPosition(constrain(box.left+delta[0], box.top+delta[1]));
          }}>
          <span aria-hidden="true" className="text-white/35">⠿</span> Live view
        </button>
        <button type="button" aria-label="Minimize camera preview" title="Minimize"
          onClick={() => setMinimized(true)} className="m-1 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.6"/></svg>
        </button>
      </div>
      <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto">{children}</div>
    </section>
  );
}
