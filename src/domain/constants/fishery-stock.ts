import { 資源グループ呼称 } from "../models/stock";

/**
 * ABC計算方法別の資源タイプ
 * - 1系: 再生産関係に基づいた将来予測の結果を利用
 * - 2系: 再生産関係を利用しない将来予測の結果を利用
 * - 3系: 漁獲量変動の経験的解析結果を利用
 */
export const 資源タイプs = {
  "1系": 1,
  "2系": 2,
  "3系": 3,
} as const;

export type 資源タイプ = (typeof 資源タイプs)[keyof typeof 資源タイプs];

/**
 * 資源タイプごとの参考文献URL
 */
export const 参考文献URLs: Record<資源タイプ, string> = {
  1: "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf",
  2: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
  3: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
};

/**
 * 系群名（name:string）と資源タイプ（type:資源タイプ）を保持する型
 */
interface 系群情報 {
  readonly 系群名: string;
  readonly 資源タイプ: 資源タイプ;
  /** URL パスで使用する英語 slug (ADR 0018) */
  readonly slug: string;
}

/**
 * 複数の資源をまとめて指す時の呼称。
 * "マイワシ"のように呼称が種名と一致するケースもあれば、"マチ類"のように一致しないこともある。
 *
 * @example
 * ```typescript
 * 資源グループ呼称s.マイワシ    // "マイワシ"
 * 資源グループ呼称s.ズワイガニ  // "ズワイガニ"
 * 資源グループ呼称s.マチ類      // "マチ類"
 * ```
 */
export const 資源グループ呼称s = {
  マイワシ: "マイワシ",
  ズワイガニ: "ズワイガニ",
  マチ類: "マチ類",
} as const;

/**
 * 資源グループ名の情報まとめて扱うための情報を保持する定数
 *
 * 呼称（呼称）・構成種の標準和名（構成種）・系群（系群）を保持する
 *
 * @example
 * ```typescript
 * 資源グループs.マイワシ.呼称 // "マイワシ"
 * 資源グループs.マイワシ.構成種 // ["マイワシ"]
 * 資源グループs.マイワシ.系群.太平洋.系群名 // "太平洋系群"
 * 資源グループs.マイワシ.系群.太平洋.資源タイプ // 1
 * ```
 */
export const 資源グループs: {
  readonly [資源グループ名: string]: {
    readonly 呼称: 資源グループ呼称;
    readonly 構成種: readonly string[];
    readonly 系群: { readonly [regionKey: string]: 系群情報 };
  };
} = {
  マイワシ: {
    呼称: "マイワシ",
    構成種: ["マイワシ"],
    系群: {
      太平洋: { 系群名: "太平洋系群", 資源タイプ: 1, slug: "maiwashi_pacific" },
      対馬: { 系群名: "対馬暖流系群", 資源タイプ: 1, slug: "maiwashi_tsushima" },
    },
  },
  マチ類: {
    呼称: "マチ類",
    構成種: ["アオダイ", "ハマダイ", "ヒメダイ", "オオヒメ"],
    系群: {
      奄美沖縄先島: { 系群名: "（奄美諸島・沖縄諸島・先島諸島）", 資源タイプ: 3, slug: "machirui_amami-okinawa-sakishima" },
    },
  },
  ズワイガニ: {
    呼称: "ズワイガニ",
    構成種: ["ズワイガニ"],
    系群: {
      オホーツク: { 系群名: "オホーツク海系群", 資源タイプ: 2, slug: "zuwaigani_okhotsk" },
    },
  },
} as const;

/**
 * 資源名（呼称 + 系群名）を保持する定数
 *
 * @example
 * ```typescript
 * 資源名.マイワシ太平洋 // "マイワシ太平洋系群"
 * ```
 */
export const 資源名s = {
  マイワシ太平洋: `${資源グループs.マイワシ.呼称}${資源グループs.マイワシ.系群.太平洋.系群名}`,
  マイワシ対馬: `${資源グループs.マイワシ.呼称}${資源グループs.マイワシ.系群.対馬.系群名}`,
  ズワイガニオホーツク: `${資源グループs.ズワイガニ.呼称}${資源グループs.ズワイガニ.系群.オホーツク.系群名}`,
  マチ類: `${資源グループs.マチ類.呼称}${資源グループs.マチ類.系群.奄美沖縄先島.系群名}`,
} as const;
