import { describe, expect, it } from "vitest";
import { computeHeatmap } from "./occupancy";

// 2026-11-02 is a Monday, 2026-11-03 a Tuesday.
describe("occupancy heatmap", () => {
  it("counts the spaces in use at each hour, and a space booked twice at once only once", () => {
    const heatmap = computeHeatmap(
      [
        { date: "2026-11-02", from: 540, to: 660, spaceId: "a" }, // 09:00-11:00
        { date: "2026-11-02", from: 570, to: 630, spaceId: "b" }, // 09:30-10:30
        { date: "2026-11-02", from: 600, to: 720, spaceId: "a" }, // the same space, overlapping
      ],
      "2026-11-02",
      "2026-11-02",
      10,
    );
    expect(heatmap.cells[0]![8]).toBe(0);
    expect(heatmap.cells[0]![9]).toBe(2); // a and b
    expect(heatmap.cells[0]![10]).toBe(2); // a (twice) and b
    expect(heatmap.cells[0]![11]).toBe(1); // a only
    expect(heatmap.cells[0]![12]).toBe(0);
    expect(heatmap.spaces).toBe(10);
    expect(heatmap.peak).toEqual({ weekday: 0, hour: 9, value: 2 });
  });

  it("averages over the days of each weekday in the range, empty days included", () => {
    // Two Mondays in the range; the space is booked at 09:00 on one of them only.
    const heatmap = computeHeatmap([{ date: "2026-11-02", from: 540, to: 600, spaceId: "a" }], "2026-11-02", "2026-11-09", 5);
    expect(heatmap.cells[0]![9]).toBe(0.5);
    expect(heatmap.cells[1]![9]).toBe(0); // Tuesday
  });

  it("is empty when nothing is booked", () => {
    const heatmap = computeHeatmap([], "2026-11-02", "2026-11-08", 5);
    expect(heatmap.cells).toHaveLength(7);
    expect(heatmap.cells.every((row) => row.length === 24 && row.every((value) => value === 0))).toBe(true);
    expect(heatmap.peak).toBeNull();
  });

  it("puts each booking on its own weekday", () => {
    const heatmap = computeHeatmap([{ date: "2026-11-03", from: 840, to: 900, spaceId: "a" }], "2026-11-02", "2026-11-03", 5);
    expect(heatmap.cells[1]![14]).toBe(1);
    expect(heatmap.cells[0]![14]).toBe(0);
  });
});
