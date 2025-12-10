import { describe, it, expect } from "vitest";
import { create資源情報 } from "./helpers";
import { 資源名s } from "./constants";

describe("create資源情報", () => {
  it("creates a 資源情報 for a valid name", () => {
    const stockGroup = create資源情報(資源名s.マイワシ太平洋);

    expect(stockGroup.fullName()).toBe("マイワシ太平洋系群");
    expect(stockGroup.呼称).toBe("マイワシ");
    expect(stockGroup.系群名).toBe("太平洋系群");
    expect(stockGroup.資源タイプ).toBe(1);
  });

  it("throws an error for an empty name", () => {
    expect(() => create資源情報("")).toThrow("Stock group name cannot be empty");
  });

  it("throws an error for an unknown name", () => {
    expect(() => create資源情報("存在しない系群")).toThrow("Unknown stock group name");
  });

  it("trims whitespace from name", () => {
    const stockGroup = create資源情報("  マイワシ太平洋系群  ");

    expect(stockGroup.fullName()).toBe("マイワシ太平洋系群");
  });

  describe("資源情報 methods", () => {
    it("equals returns true for same name", () => {
      const stockGroup1 = create資源情報(資源名s.マイワシ太平洋);
      const stockGroup2 = create資源情報(資源名s.マイワシ太平洋);

      expect(stockGroup1.equals(stockGroup2)).toBe(true);
    });

    it("equals returns false for different name", () => {
      const stockGroup1 = create資源情報(資源名s.マイワシ太平洋);
      const stockGroup2 = create資源情報(資源名s.ズワイガニオホーツク);

      expect(stockGroup1.equals(stockGroup2)).toBe(false);
    });

    it("toString returns the name", () => {
      const stockGroup = create資源情報(資源名s.マイワシ太平洋);

      expect(stockGroup.toString()).toBe("マイワシ太平洋系群");
    });

    it("toDisplayString returns formatted string with default format", () => {
      const stockGroup = create資源情報(資源名s.マイワシ太平洋);

      expect(stockGroup.toDisplayString()).toBe("マイワシ 太平洋系群");
    });

    it("toDisplayString returns formatted string with custom formatter", () => {
      const stockGroup = create資源情報(資源名s.マイワシ太平洋);

      const result = stockGroup.toDisplayString(
        (callName, region) => `<span>${callName}</span><span>${region}</span>`
      );

      expect(result).toBe("<span>マイワシ</span><span>太平洋系群</span>");
    });
  });
});
