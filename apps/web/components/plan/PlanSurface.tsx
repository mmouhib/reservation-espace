import type { CSSProperties, ReactNode } from "react";
import { PLAN_HEIGHT, PLAN_WIDTH, type PlanLayout } from "@reservation/shared";

/** Where a tile goes on the surface: the plan is 100 × 60 units, drawn in percentages so it scales to any screen. */
export function tileStyle(layout: PlanLayout): CSSProperties {
  return {
    left: `${(layout.x / PLAN_WIDTH) * 100}%`,
    top: `${(layout.y / PLAN_HEIGHT) * 100}%`,
    width: `${(layout.w / PLAN_WIDTH) * 100}%`,
    height: `${(layout.h / PLAN_HEIGHT) * 100}%`,
  };
}

/** The floor itself: a drawing sheet with a light grid, on which the tiles of the spaces are placed. */
export function PlanSurface({ children, label, surfaceRef }: { children: ReactNode; label: string; surfaceRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={surfaceRef}
      role="group"
      aria-label={label}
      className="relative w-full select-none overflow-hidden rounded-2xl border-2 border-slate-400 bg-slate-50 text-slate-900 shadow-inner"
      style={{ aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}` }}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        {Array.from({ length: PLAN_WIDTH / 5 - 1 }, (_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 5} x2={(i + 1) * 5} y1={0} y2={PLAN_HEIGHT} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {Array.from({ length: PLAN_HEIGHT / 5 - 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} x2={PLAN_WIDTH} y1={(i + 1) * 5} y2={(i + 1) * 5} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {children}
    </div>
  );
}
