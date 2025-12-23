import { describe, it, expect } from "vitest";
import { 正規分布, 固定値, 単位フォーマッタ, create年齢年行列 } from "./strategy";

describe("確率分布", () => {
  describe("固定値", () => {
    it("常に同じ値を返す", () => {
      const dist = 固定値(0.4);

      expect(dist.分布名).toBe("固定値");
      expect(dist.平均値).toBe(0.4);
      expect(dist.分散).toBe(0);
      expect(dist.sample()).toBe(0.4);
      expect(dist.sample()).toBe(0.4);
      expect(dist.sample()).toBe(0.4);
    });
  });

  describe("正規分布", () => {
    it("正しいパラメータを持つ", () => {
      const dist = 正規分布(0.4, 0.1);

      expect(dist.分布名).toBe("正規分布");
      expect(dist.平均値).toBe(0.4);
      expect(dist.分散).toBeCloseTo(0.01); // 0.1^2
    });

    it("サンプル値が平均値の周辺に分布する", () => {
      const dist = 正規分布(0.4, 0.1);
      const samples: number[] = [];

      for (let i = 0; i < 1000; i++) {
        samples.push(dist.sample());
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      // Allow some tolerance due to randomness
      expect(mean).toBeGreaterThan(0.3);
      expect(mean).toBeLessThan(0.5);
    });
  });
});

describe("単位フォーマッタ", () => {
  describe("トン", () => {
    it("1000 未満はトン表記", () => {
      expect(単位フォーマッタ["トン"](500)).toBe("500.0 トン");
      expect(単位フォーマッタ["トン"](999.9)).toBe("999.9 トン");
    });

    it("1000 以上は千トン表記", () => {
      expect(単位フォーマッタ["トン"](1000)).toBe("1.0 千トン");
      expect(単位フォーマッタ["トン"](15000)).toBe("15.0 千トン");
    });
  });

  describe("千尾", () => {
    it("1000 未満は千尾表記", () => {
      expect(単位フォーマッタ["千尾"](500)).toBe("500.0 千尾");
    });

    it("1000 以上は百万尾表記", () => {
      expect(単位フォーマッタ["千尾"](1000)).toBe("1.00 百万尾");
      expect(単位フォーマッタ["千尾"](1500)).toBe("1.50 百万尾");
    });
  });

  describe("尾", () => {
    it("100 万未満は尾表記（カンマ区切り）", () => {
      expect(単位フォーマッタ["尾"](1000)).toBe("1,000 尾");
      expect(単位フォーマッタ["尾"](999999)).toBe("999,999 尾");
    });

    it("100 万以上は百万尾表記", () => {
      expect(単位フォーマッタ["尾"](1_000_000)).toBe("1.00 百万尾");
      expect(単位フォーマッタ["尾"](1_500_000)).toBe("1.50 百万尾");
    });
  });

  describe("無次元", () => {
    it("小数点以下 3 桁で表示", () => {
      expect(単位フォーマッタ["無次元"](0.4)).toBe("0.400");
      expect(単位フォーマッタ["無次元"](0.123456)).toBe("0.123");
    });
  });
});

describe("年齢年行列", () => {
  const createTestMatrix = () =>
    create年齢年行列({
      単位: "トン",
      年範囲: { 開始年: 2020, 終了年: 2022 },
      年齢範囲: { 最小年齢: 0, 最大年齢: 2 },
      データ: [
        [100, 200, 300], // 2020: age 0, 1, 2
        [110, 210, 310], // 2021: age 0, 1, 2
        [120, 220, 320], // 2022: age 0, 1, 2
      ],
    });

  describe("create年齢年行列", () => {
    it("正しいプロパティを持つ", () => {
      const matrix = createTestMatrix();

      expect(matrix.単位).toBe("トン");
      expect(matrix.年範囲).toEqual({ 開始年: 2020, 終了年: 2022 });
      expect(matrix.年齢範囲).toEqual({ 最小年齢: 0, 最大年齢: 2 });
      expect(matrix.データ).toHaveLength(3);
    });
  });

  describe("get", () => {
    it("年と年齢から正しい値を取得できる", () => {
      const matrix = createTestMatrix();

      expect(matrix.get(2020, 0)).toBe(100);
      expect(matrix.get(2020, 1)).toBe(200);
      expect(matrix.get(2020, 2)).toBe(300);
      expect(matrix.get(2021, 0)).toBe(110);
      expect(matrix.get(2022, 2)).toBe(320);
    });

    it("範囲外の年を指定するとエラー", () => {
      const matrix = createTestMatrix();

      expect(() => matrix.get(2019, 0)).toThrow("年 2019 は範囲外です（2020〜2022）");
      expect(() => matrix.get(2023, 0)).toThrow("年 2023 は範囲外です（2020〜2022）");
    });

    it("範囲外の年齢を指定するとエラー", () => {
      const matrix = createTestMatrix();

      expect(() => matrix.get(2020, -1)).toThrow("年齢 -1 は範囲外です（0〜2）");
      expect(() => matrix.get(2020, 3)).toThrow("年齢 3 は範囲外です（0〜2）");
    });
  });

  describe("getFormatted", () => {
    it("値をフォーマットして返す", () => {
      const matrix = createTestMatrix();

      expect(matrix.getFormatted(2020, 0)).toBe("100.0 トン");
      expect(matrix.getFormatted(2020, 2)).toBe("300.0 トン");
    });

    it("1000 以上は千トン表記になる", () => {
      const matrix = create年齢年行列({
        単位: "トン",
        年範囲: { 開始年: 2020, 終了年: 2020 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 0 },
        データ: [[15000]],
      });

      expect(matrix.getFormatted(2020, 0)).toBe("15.0 千トン");
    });
  });

  describe("型パラメータによる単位の追跡", () => {
    it("異なる単位の行列を作成できる", () => {
      const tonnage = create年齢年行列({
        単位: "トン",
        年範囲: { 開始年: 2020, 終了年: 2020 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 0 },
        データ: [[1000]],
      });

      const count = create年齢年行列({
        単位: "千尾",
        年範囲: { 開始年: 2020, 終了年: 2020 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 0 },
        データ: [[500]],
      });

      expect(tonnage.単位).toBe("トン");
      expect(count.単位).toBe("千尾");
      expect(tonnage.getFormatted(2020, 0)).toBe("1.0 千トン");
      expect(count.getFormatted(2020, 0)).toBe("500.0 千尾");
    });
  });
});
