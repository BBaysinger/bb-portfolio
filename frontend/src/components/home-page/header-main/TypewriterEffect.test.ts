import { describe, expect, it } from "vitest";

import { buildParagraphQueue } from "./TypewriterEffect.utils";

describe("buildParagraphQueue", () => {
  it("keeps the first paragraph fixed on initial render", () => {
    const queue = buildParagraphQueue(5);

    expect(queue[0]).toBe(0);
    expect([...queue].sort((left, right) => left - right)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("handles empty and single-paragraph queues", () => {
    expect(buildParagraphQueue(0)).toEqual([]);
    expect(buildParagraphQueue(1)).toEqual([0]);
  });
});
