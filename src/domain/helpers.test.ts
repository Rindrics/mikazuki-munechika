import { describe, it, expect } from "vitest";
import { createStockGroup } from "./helpers";
import { STOCK_GROUP_NAMES } from "./constants";

describe("createStockGroup", () => {
  it("creates a StockGroup for a valid name", () => {
    const stockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);

    expect(stockGroup.name).toBe("マイワシ太平洋系群");
    expect(stockGroup.call_name).toBe("マイワシ");
    expect(stockGroup.region).toBe("太平洋系群");
    expect(stockGroup.type).toBe(1);
  });

  it("throws an error for an empty name", () => {
    expect(() => createStockGroup("")).toThrow("Stock group name cannot be empty");
  });

  it("throws an error for an unknown name", () => {
    expect(() => createStockGroup("存在しない系群")).toThrow("Unknown stock group name");
  });

  it("trims whitespace from name", () => {
    const stockGroup = createStockGroup("  マイワシ太平洋系群  ");

    expect(stockGroup.name).toBe("マイワシ太平洋系群");
  });

  describe("StockGroup methods", () => {
    it("equals returns true for same name", () => {
      const stockGroup1 = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);
      const stockGroup2 = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);

      expect(stockGroup1.equals(stockGroup2)).toBe(true);
    });

    it("equals returns false for different name", () => {
      const stockGroup1 = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);
      const stockGroup2 = createStockGroup(STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK);

      expect(stockGroup1.equals(stockGroup2)).toBe(false);
    });

    it("toString returns the name", () => {
      const stockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);

      expect(stockGroup.toString()).toBe("マイワシ太平洋系群");
    });

    it("toDisplayString returns formatted string with default format", () => {
      const stockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);

      expect(stockGroup.toDisplayString()).toBe("マイワシ 太平洋系群");
    });

    it("toDisplayString returns formatted string with custom formatter", () => {
      const stockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);

      const result = stockGroup.toDisplayString(
        (callName, region) => `<span>${callName}</span><span>${region}</span>`
      );

      expect(result).toBe("<span>マイワシ</span><span>太平洋系群</span>");
    });
  });
});
