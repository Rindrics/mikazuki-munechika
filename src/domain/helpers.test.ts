import { describe, it, expect } from "vitest";
import { create資源情報, create資源評価, create文献リスト } from "./helpers";
import { 資源名s, 資源タイプs, type 資源タイプ } from "./constants";
import { type 資源情報 } from "./models";

describe("create資源情報", () => {
  it("creates a 資源情報 for a valid name", () => {
    const stockGroup = create資源情報(資源名s.マイワシ太平洋);

    expect(stockGroup.toString()).toBe("マイワシ太平洋系群");
    expect(stockGroup.呼称).toBe("マイワシ");
    expect(stockGroup.系群名).toBe("太平洋系群");
    expect(stockGroup.資源タイプ).toBe(1);
  });

  it("throws an error for an empty name", () => {
    expect(() => create資源情報("")).toThrow("Stock group name cannot be empty");
  });

  it("throws an error for an unknown name", () => {
    expect(() => create資源情報("存在しない系群")).toThrow("不正な資源名: 存在しない系群");
  });

  it("trims whitespace from name", () => {
    const stockGroup = create資源情報("  マイワシ太平洋系群  ");

    expect(stockGroup.toString()).toBe("マイワシ太平洋系群");
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

describe("create資源評価", () => {
  describe("validな資源情報を指定した場合には期待通りの資源評価を返す", () => {
    it("1系資源", () => {
      const stockGroup = create資源情報(資源名s.マイワシ太平洋);
      const stock = create資源評価(stockGroup);
      const result = stock.資源量推定({ value: "100" }, { value: "100" }).ABC算定();

      // Verify that the result contains actual calculated ABC values
      expect(result.value).toContain("トン");
      expect(result.value).toContain("親魚量");
      expect(result.value).toContain("F:");
      expect(result.unit).toBe("トン");
      expect(result.資源量).toBeDefined();
      expect(result.資源量.単位).toBe("トン");
      expect(stock.対象.資源タイプ).toBe(資源タイプs["1系"]);
    });

    it("2系資源", () => {
      const stockGroup = create資源情報(資源名s.ズワイガニオホーツク);
      const stock = create資源評価(stockGroup);

      expect(stock.資源量推定({ value: "100" }, { value: "100" }).ABC算定().value).toBe(
        'Simulated WITHOUT recruitment using its abundance "estimated using 100 and 100"'
      );
      expect(stock.対象.資源タイプ).toBe(資源タイプs["2系"]);
    });

    it("3系資源", () => {
      const stockGroup = create資源情報(資源名s.マチ類);
      const stock = create資源評価(stockGroup);

      expect(stock.資源量推定({ value: "100" }, { value: "100" }).ABC算定().value).toBe(
        'ABC estimated DIRECTLY using its abundance "estimated using 100 and 100"'
      );
      expect(stock.対象.資源タイプ).toBe(資源タイプs["3系"]);
    });
  });

  it("不正な資源情報を指定した場合にはエラーを返す", () => {
    const invalid資源情報 = {
      呼称: "テスト",
      系群名: "テスト系群",
      資源タイプ: 99 as unknown as 資源タイプ,
      equals: () => false,
      toString: () => "テスト",
      toDisplayString: () => "テスト",
    } as unknown as 資源情報;

    expect(() => create資源評価(invalid資源情報)).toThrow("不正な資源情報");
  });
});

describe("create文献リスト", () => {
  it("文献リストを作成できる", () => {
    const 文献リスト = create文献リスト();
    expect(文献リスト.文献一覧()).toEqual([]);
  });

  it("文献リストに文献を追加できる", () => {
    const 文献リスト = create文献リスト();
    expect(文献リスト.文献一覧()).toEqual([]);

    文献リスト.文献追加({
      著者: ["テスト"],
      出版年: 2025,
      タイトル: "テスト",
      出版者: "テスト",
      ページ数: "123",
      メモ: "テスト",
      タグ: ["テスト"],
      関連する資源タイプ: [資源タイプs["1系"]],
      関連する資源呼称: ["マイワシ"],
    });

    expect(文献リスト.文献一覧()).toEqual([
      {
        著者: ["テスト"],
        出版年: 2025,
        タイトル: "テスト",
        出版者: "テスト",
        ページ数: "123",
        メモ: "テスト",
        タグ: ["テスト"],
        関連する資源タイプ: [資源タイプs["1系"]],
        関連する資源呼称: ["マイワシ"],
      },
    ]);
  });
});
