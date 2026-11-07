import type { SpaceCategory } from "./models";

/**
 * Where a space is drawn on the plan of its floor. The plan is a 100 by 60 canvas, and a position is the top-left
 * corner and the size, in the same units. It is not a map to scale, only a drawing people recognise.
 */
export interface PlanLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PLAN_WIDTH = 100;
export const PLAN_HEIGHT = 60;
export const MIN_TILE = 3;

/** Size of a new tile by category: a desk is small, a meeting room or an open space is big. */
export const DEFAULT_TILE_SIZE: Record<SpaceCategory, { w: number; h: number }> = {
  desk: { w: 5, h: 5 },
  phone_booth: { w: 6, h: 6 },
  meeting_room: { w: 14, h: 10 },
  open_space: { w: 22, h: 12 },
  coworking: { w: 22, h: 12 },
};

const round = (value: number) => Math.round(value * 10) / 10;

/** Keeps a tile inside the plan and at least as big as the minimum. */
export function clampLayout(layout: PlanLayout): PlanLayout {
  const w = Math.min(PLAN_WIDTH, Math.max(MIN_TILE, layout.w));
  const h = Math.min(PLAN_HEIGHT, Math.max(MIN_TILE, layout.h));
  return { x: round(Math.min(PLAN_WIDTH - w, Math.max(0, layout.x))), y: round(Math.min(PLAN_HEIGHT - h, Math.max(0, layout.y))), w: round(w), h: round(h) };
}

/** Whether two tiles touch or overlap, keeping `gap` units between them. */
export function tilesCollide(a: PlanLayout, b: PlanLayout, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

/**
 * Places spaces that have no position yet, without overlapping the ones already placed: the big ones first, each at the
 * first free spot from the top-left, so desks fill the rows next to each other. The same input always gives the same plan.
 */
export function autoLayout(spaces: { id: string; category: SpaceCategory }[], placed: PlanLayout[] = []): Map<string, PlanLayout> {
  const result = new Map<string, PlanLayout>();
  const taken = [...placed];
  const area = (category: SpaceCategory) => DEFAULT_TILE_SIZE[category].w * DEFAULT_TILE_SIZE[category].h;
  const order = [...spaces].sort((a, b) => area(b.category) - area(a.category) || a.id.localeCompare(b.id));

  for (const space of order) {
    const { w, h } = DEFAULT_TILE_SIZE[space.category];
    let spot: PlanLayout | null = null;
    for (let y = 2; spot === null && y + h <= PLAN_HEIGHT - 2; y += 1) {
      for (let x = 2; x + w <= PLAN_WIDTH - 2; x += 1) {
        if (!taken.some((tile) => tilesCollide({ x, y, w, h }, tile, 1))) {
          spot = { x, y, w, h };
          break;
        }
      }
    }
    // A floor that is already full: stack the rest in a corner, the editor lets the administrator move them.
    const layout = spot ?? clampLayout({ x: 0, y: 0, w, h });
    taken.push(layout);
    result.set(space.id, layout);
  }
  return result;
}
