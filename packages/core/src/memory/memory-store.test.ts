import { describe, it, expect } from "vitest";
import { parseMemoryFile, serializeMemoryEntry } from "./memory-store";
import type { MemoryEntry } from "@superclaw/types";

describe("parseMemoryFile", () => {
  it("splits sections by ## headers", () => {
    const content = `## First Entry
Some content here.

## Second Entry
More content.
`;
    const entries = parseMemoryFile(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.id).toBe("First Entry");
    expect(entries[1]!.id).toBe("Second Entry");
  });

  it("extracts valid_until from HTML comments", () => {
    const content = `## Temp Fact
This is temporary.
<!-- valid_until: 2026-06-01 -->
`;
    const entries = parseMemoryFile(content);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.validUntil).toBe("2026-06-01");
  });

  it("extracts category and tags from HTML comments", () => {
    const content = `## Important Judgment
A key insight.
<!-- category: judgment -->
<!-- tags: strategy, planning, q2 -->
`;
    const entries = parseMemoryFile(content);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe("judgment");
    expect(entries[0]!.tags).toEqual(["strategy", "planning", "q2"]);
  });

  it("returns empty array for empty content", () => {
    expect(parseMemoryFile("")).toEqual([]);
    expect(parseMemoryFile("   ")).toEqual([]);
  });
});

describe("serializeMemoryEntry", () => {
  it("produces correct markdown format", () => {
    const entry: MemoryEntry = {
      id: "Test Entry",
      content: "Some important content.",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      validUntil: "2026-12-31",
      category: "fact",
      tags: ["alpha", "beta"],
    };

    const result = serializeMemoryEntry(entry);

    expect(result).toContain("## Test Entry");
    expect(result).toContain("Some important content.");
    expect(result).toContain("<!-- valid_until: 2026-12-31 -->");
    expect(result).toContain("<!-- category: fact -->");
    expect(result).toContain("<!-- tags: alpha, beta -->");
    expect(result.endsWith("\n")).toBe(true);
  });

  it("omits optional metadata when not present", () => {
    const entry: MemoryEntry = {
      id: "Simple",
      content: "Just text.",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = serializeMemoryEntry(entry);

    expect(result).toContain("## Simple");
    expect(result).toContain("Just text.");
    expect(result).not.toContain("valid_until");
    expect(result).not.toContain("category");
    expect(result).not.toContain("tags");
  });
});

describe("filtering expired entries", () => {
  it("filters expired entries correctly (valid_until in past)", () => {
    const content = `## Expired Fact
Old info.
<!-- valid_until: 2020-01-01 -->

## Still Valid
Current info.
<!-- valid_until: 2099-12-31 -->

## No Expiry
Permanent info.
`;
    const entries = parseMemoryFile(content);
    const now = new Date();

    const validEntries = entries.filter((entry) => {
      if (!entry.validUntil) return true;
      return new Date(entry.validUntil) > now;
    });

    expect(validEntries).toHaveLength(2);
    expect(validEntries.map((e) => e.id)).toEqual(["Still Valid", "No Expiry"]);
  });
});
