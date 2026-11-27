import { describe, it, expect } from "vitest";
import { place } from "./helpers";

const o = { width: 380, gap: 6, margin: 8, vw: 1200, vh: 800 };

describe("place", () => {
  it("opens below the trigger when there is more room below", () => {
    expect(place({ top: 100, bottom: 120, left: 300 }, o)).toEqual({ left: 300, top: 126 });
  });
  it("flips above when there is more room above", () => {
    expect(place({ top: 700, bottom: 720, left: 300 }, o)).toEqual({ left: 300, bottom: 106 });
  });
  it("clamps to the right edge of the viewport", () => {
    expect(place({ top: 100, bottom: 120, left: 1100 }, o).left).toBe(1200 - 380 - 8);
  });
});
