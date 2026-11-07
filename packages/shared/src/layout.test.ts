import { describe, expect, it } from "vitest";
import { PLAN_HEIGHT, PLAN_WIDTH, autoLayout, clampLayout, tilesCollide, type PlanLayout } from "./layout";
import type { SpaceCategory } from "./models";

const spaces = (...categories: SpaceCategory[]) => categories.map((category, i) => ({ id: `s${String(i).padStart(2, "0")}`, category }));

describe("clampLayout", () => {
  it("keeps a tile inside the plan and not smaller than the minimum", () => {
    expect(clampLayout({ x: 98, y: 59, w: 10, h: 10 })).toEqual({ x: 90, y: 50, w: 10, h: 10 });
    expect(clampLayout({ x: -5, y: -5, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 3, h: 3 });
    expect(clampLayout({ x: 10.04, y: 20.06, w: 5, h: 5 })).toEqual({ x: 10, y: 20.1, w: 5, h: 5 });
  });
});

describe("tilesCollide", () => {
  const a: PlanLayout = { x: 10, y: 10, w: 5, h: 5 };
  it("sees overlap and a too small gap", () => {
    expect(tilesCollide(a, { x: 12, y: 12, w: 5, h: 5 })).toBe(true);
    expect(tilesCollide(a, { x: 15, y: 10, w: 5, h: 5 })).toBe(false); // touching is not overlapping
    expect(tilesCollide(a, { x: 15, y: 10, w: 5, h: 5 }, 1)).toBe(true); // but it is closer than a gap of 1
    expect(tilesCollide(a, { x: 17, y: 10, w: 5, h: 5 }, 1)).toBe(false);
  });
});

describe("autoLayout", () => {
  const many = spaces("meeting_room", "meeting_room", "open_space", ...Array<SpaceCategory>(20).fill("desk"), "phone_booth");
  const plan = autoLayout(many);

  it("places every space inside the plan", () => {
    expect(plan.size).toBe(many.length);
    for (const layout of plan.values()) {
      expect(layout.x).toBeGreaterThanOrEqual(0);
      expect(layout.y).toBeGreaterThanOrEqual(0);
      expect(layout.x + layout.w).toBeLessThanOrEqual(PLAN_WIDTH);
      expect(layout.y + layout.h).toBeLessThanOrEqual(PLAN_HEIGHT);
    }
  });

  it("never lets two spaces overlap when there is room", () => {
    const tiles = [...plan.values()];
    for (let i = 0; i < tiles.length; i += 1) for (let j = i + 1; j < tiles.length; j += 1) expect(tilesCollide(tiles[i]!, tiles[j]!)).toBe(false);
  });

  it("gives the same plan for the same spaces, and respects the tiles already placed", () => {
    expect([...autoLayout(many)]).toEqual([...plan]);
    const wall: PlanLayout = { x: 0, y: 0, w: PLAN_WIDTH, h: 30 };
    const below = autoLayout(spaces("desk", "desk"), [wall]);
    for (const layout of below.values()) expect(tilesCollide(layout, wall)).toBe(false);
  });
});
