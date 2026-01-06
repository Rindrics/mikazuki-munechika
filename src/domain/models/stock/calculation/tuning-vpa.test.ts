import { describe, it, expect } from "vitest";
import {
  estimate比例定数q,
  estimate非線形性b,
  estimate指標パラメータ,
  optimizeNelderMead,
  calculate目的関数,
  calculateMohnsRho,
  type 資源量指標値,
  type ターミナルF,
  type 指標パラメータ,
  type レトロスペクティブ結果,
} from "./tuning-vpa";

describe("Tuning VPA", () => {
  describe("estimate非線形性b", () => {
    it("should estimate nonlinearity coefficient b using equation (8b)", () => {
      // Simple test case with linear relationship
      // ln(I) = ln(X) + constant
      // Expected: b ≈ 1.0

      const 観測値 = [10, 20, 30, 40, 50];
      const VPA推定値 = [12, 24, 36, 48, 60]; // I/X ≈ constant ratio

      const b = estimate非線形性b(観測値, VPA推定値);

      // For proportional relationship: ln(I) = ln(q) + ln(X)
      // Cov[ln(X), ln(I)] / V[ln(X)] should be close to 1
      expect(b).toBeCloseTo(1.0, 1);
    });

    it("should estimate b for non-linear relationship", () => {
      // Test case with non-linear relationship
      // I = q * X^0.5 (square root relationship)
      // ln(I) = ln(q) + 0.5 * ln(X)
      // Expected: b ≈ 0.5

      const VPA推定値 = [100, 400, 900, 1600, 2500];
      const q = 2.0;
      const 観測値 = VPA推定値.map((X) => q * Math.sqrt(X));

      const b = estimate非線形性b(観測値, VPA推定値);

      expect(b).toBeCloseTo(0.5, 1);
    });

    it("should throw error for mismatched array lengths", () => {
      const 観測値 = [10, 20, 30];
      const VPA推定値 = [12, 24];

      expect(() => {
        estimate非線形性b(観測値, VPA推定値);
      }).toThrow("観測値とVPA推定値の長さが一致しません");
    });
  });

  describe("estimate比例定数q", () => {
    it("should estimate catchability coefficient q using equation (8a)", () => {
      // Test case: I = q * X^b
      // With b = 1 (linear), I = q * X
      // Expected: q = I/X (average ratio)

      const VPA推定値 = [10, 20, 30, 40, 50];
      const trueQ = 2.0;
      const b = 1.0;
      const 観測値 = VPA推定値.map((X) => trueQ * Math.pow(X, b));

      const q = estimate比例定数q(観測値, VPA推定値, b);

      expect(q).toBeCloseTo(trueQ, 1);
    });

    it("should estimate q for non-linear relationship", () => {
      // Test case: I = q * X^0.8
      const VPA推定値 = [10, 20, 30, 40, 50];
      const trueQ = 3.0;
      const b = 0.8;
      const 観測値 = VPA推定値.map((X) => trueQ * Math.pow(X, b));

      const q = estimate比例定数q(観測値, VPA推定値, b);

      expect(q).toBeCloseTo(trueQ, 1);
    });

    it("should throw error for mismatched array lengths", () => {
      const 観測値 = [10, 20, 30];
      const VPA推定値 = [12, 24];

      expect(() => {
        estimate比例定数q(観測値, VPA推定値, 1.0);
      }).toThrow("観測値とVPA推定値の長さが一致しません");
    });
  });

  describe("estimate指標パラメータ", () => {
    it("should estimate both q and b parameters", () => {
      // Test case with known relationship: I = 2.5 * X^0.9
      const VPA推定値 = [10, 20, 30, 40, 50];
      const trueQ = 2.5;
      const trueB = 0.9;
      const 観測値 = VPA推定値.map((X) => trueQ * Math.pow(X, trueB));

      const 指標値: 資源量指標値 = {
        種別: "北上期調査_0歳魚CPUE",
        年範囲: { 開始年: 2019, 終了年: 2023 },
        観測値,
        対象年齢: 0,
      };

      const params = estimate指標パラメータ(指標値, VPA推定値, false);

      expect(params.b).toBeCloseTo(trueB, 1);
      expect(params.q).toBeCloseTo(trueQ, 1);
    });

    it("should fix b=1 when requested (for spawning stock)", () => {
      // Test case for spawning stock (産卵量)
      // b should be fixed to 1.0

      const VPA推定値 = [100, 200, 300, 400, 500];
      const trueQ = 1.5;
      const 観測値 = VPA推定値.map((X) => trueQ * X);

      const 指標値: 資源量指標値 = {
        種別: "産卵量",
        年範囲: { 開始年: 2019, 終了年: 2023 },
        観測値,
      };

      const params = estimate指標パラメータ(指標値, VPA推定値, true);

      expect(params.b).toBe(1.0); // Fixed to 1.0
      expect(params.q).toBeCloseTo(trueQ, 1);
    });
  });

  describe("optimizeNelderMead", () => {
    it("should minimize a simple quadratic function", () => {
      // Test case: minimize f(x) = (x1-3)² + (x2-2)²
      // Expected minimum: x = [3, 2], f(x) = 0

      const 目的関数 = (x: readonly number[]): number => {
        return (x[0] - 3) ** 2 + (x[1] - 2) ** 2;
      };

      const 初期値 = [0, 0];

      const result = optimizeNelderMead(目的関数, 初期値, {
        maxIterations: 200,
        tolerance: 1e-6,
      });

      expect(result.最適値[0]).toBeCloseTo(3, 1);
      expect(result.最適値[1]).toBeCloseTo(2, 1);
      expect(result.目的関数値).toBeCloseTo(0, 2);
    });

    it("should minimize a 5D function (simulating terminal F optimization)", () => {
      // Test case: minimize f(x) = ∑(xi - i)²
      // Expected minimum: x = [0, 1, 2, 3, 4], f(x) = 0

      const 目的関数 = (x: readonly number[]): number => {
        let sum = 0;
        for (let i = 0; i < x.length; i++) {
          sum += (x[i] - i) ** 2;
        }
        return sum;
      };

      const 初期値 = [0.5, 0.5, 0.5, 0.5, 0.5];

      const result = optimizeNelderMead(目的関数, 初期値, {
        maxIterations: 500,
        tolerance: 1e-5,
      });

      // Should converge to [0, 1, 2, 3, 4]
      for (let i = 0; i < 5; i++) {
        expect(result.最適値[i]).toBeCloseTo(i, 1);
      }
      expect(result.目的関数値).toBeCloseTo(0, 2);
    });

    it("should find minimum for Rosenbrock function (harder test)", () => {
      // Rosenbrock function: f(x,y) = (1-x)² + 100(y-x²)²
      // Global minimum: (1, 1) with f(1,1) = 0

      const 目的関数 = (x: readonly number[]): number => {
        return (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
      };

      const 初期値 = [0, 0];

      const result = optimizeNelderMead(目的関数, 初期値, {
        maxIterations: 1000,
        tolerance: 1e-4,
      });

      expect(result.最適値[0]).toBeCloseTo(1, 0);
      expect(result.最適値[1]).toBeCloseTo(1, 0);
      expect(result.目的関数値).toBeLessThan(0.01);
    });
  });

  describe("calculate目的関数", () => {
    it("should calculate Ridge VPA objective function (equation 7)", () => {
      // Simple test case
      const ターミナルF: ターミナルF = {
        年: 2023,
        F0: 0.4,
        F1: 0.5,
        F2: 0.6,
        F3: 0.4,
        F4: 0.5,
      };

      const 指標パラメータMap = new Map<string, 指標パラメータ>([
        ["北上期調査_0歳魚CPUE", { q: 2.0, b: 1.0 }],
      ]);

      const 資源量指標値: 資源量指標値[] = [
        {
          種別: "北上期調査_0歳魚CPUE",
          年範囲: { 開始年: 2021, 終了年: 2023 },
          観測値: [100, 120, 110],
          対象年齢: 0,
        },
      ];

      const VPA推定値リスト = new Map<string, readonly number[]>([
        ["北上期調査_0歳魚CPUE", [50, 60, 55]], // q*X should be close to I
      ]);

      const 直近3年F = [0.35, 0.45, 0.55, 0.38, 0.48];

      const λ = 0.45;

      const result = calculate目的関数(
        ターミナルF,
        指標パラメータMap,
        資源量指標値,
        VPA推定値リスト,
        直近3年F,
        λ
      );

      // Should have both terms
      expect(result.総残差平方和).toBeGreaterThan(0);
      expect(result.ペナルティ項).toBeGreaterThan(0);
      expect(result.合計).toBe((1 - λ) * result.総残差平方和 + λ * result.ペナルティ項);
      expect(result.λ).toBe(λ);
    });
  });

  describe("Retrospective Analysis", () => {
    describe("calculateMohnsRho", () => {
      it("should calculate Mohn's ρ from retrospective results", () => {
        // Mock retrospective results
        const レトロ結果: レトロスペクティブ結果[] = [
          {
            ピール年数: 0,
            終了年: 2023,
            親魚量: [1000, 1100, 1200, 1300, 1400], // 2019-2023
            加入量: [500, 550, 600, 650, 700],
            年齢別F: [
              [0.3, 0.4, 0.5],
              [0.32, 0.42, 0.52],
              [0.35, 0.45, 0.55],
              [0.38, 0.48, 0.58],
              [0.4, 0.5, 0.6],
            ],
          },
          {
            ピール年数: 1,
            終了年: 2022,
            親魚量: [1000, 1100, 1200, 1280], // 2019-2022, slightly different
            加入量: [500, 550, 600, 640],
            年齢別F: [
              [0.3, 0.4, 0.5],
              [0.32, 0.42, 0.52],
              [0.35, 0.45, 0.55],
              [0.36, 0.46, 0.56],
            ],
          },
          {
            ピール年数: 2,
            終了年: 2021,
            親魚量: [1000, 1100, 1180], // 2019-2021
            加入量: [500, 550, 590],
            年齢別F: [
              [0.3, 0.4, 0.5],
              [0.32, 0.42, 0.52],
              [0.34, 0.44, 0.54],
            ],
          },
        ];

        const rho = calculateMohnsRho(レトロ結果);

        // Check structure
        expect(rho).toHaveProperty("親魚量");
        expect(rho).toHaveProperty("加入量");
        expect(rho).toHaveProperty("平均F");
        expect(rho).toHaveProperty("総合");

        // All should be numbers
        expect(typeof rho.親魚量).toBe("number");
        expect(typeof rho.加入量).toBe("number");
        expect(typeof rho.平均F).toBe("number");
        expect(typeof rho.総合).toBe("number");

        // Total should be average of absolute values
        expect(rho.総合).toBeCloseTo(
          (Math.abs(rho.親魚量) + Math.abs(rho.加入量) + Math.abs(rho.平均F)) / 3,
          5
        );
      });

      it("should throw error for insufficient retrospective results", () => {
        const 単一結果: レトロスペクティブ結果[] = [
          {
            ピール年数: 0,
            終了年: 2023,
            親魚量: [1000, 1100],
            加入量: [500, 550],
            年齢別F: [
              [0.3, 0.4],
              [0.32, 0.42],
            ],
          },
        ];

        expect(() => {
          calculateMohnsRho(単一結果);
        }).toThrow("最低2つのレトロスペクティブ結果が必要");
      });

      it("should throw error when peel=0 is missing", () => {
        const ピール0なし: レトロスペクティブ結果[] = [
          {
            ピール年数: 1,
            終了年: 2022,
            親魚量: [1000, 1100],
            加入量: [500, 550],
            年齢別F: [
              [0.3, 0.4],
              [0.32, 0.42],
            ],
          },
          {
            ピール年数: 2,
            終了年: 2021,
            親魚量: [1000],
            加入量: [500],
            年齢別F: [[0.3, 0.4]],
          },
        ];

        expect(() => {
          calculateMohnsRho(ピール0なし);
        }).toThrow("完全データ（ピール=0）が見つかりません");
      });
    });
  });
});
