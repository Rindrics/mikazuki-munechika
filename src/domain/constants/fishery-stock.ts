/**
 * ABC計算方法別の資源タイプ
 * - 1系: 再生産関係に基づいた将来予測の結果を利用
 * - 2系: 再生産関係を利用しない将来予測の結果を利用
 * - 3系: 漁獲量変動の経験的解析結果を利用
 */
export type StockType = 1 | 2 | 3;

/**
 * 海域名（name:string）と資源タイプ（type:StockType）を保持する型
 */
interface RegionInfo {
  readonly name: string;
  readonly type: StockType;
}

/**
 * 評価対象資源名の生成に利用する情報を保持する定数
 *
 * 呼称（call_name）・構成種の標準和名（member_species）・地域系群（regions）を保持する
 *
 * @example
 * ```typescript
 * STOCK_GROUPS.MAIWASHI.call_name // "マイワシ"
 * STOCK_GROUPS.MAIWASHI.member_species // ["マイワシ"]
 * STOCK_GROUPS.MAIWASHI.regions.PACIFIC.name // "太平洋系群"
 * STOCK_GROUPS.MAIWASHI.regions.PACIFIC.type // 1
 * ```
 */
export const STOCK_GROUPS: {
  readonly [key: string]: {
    readonly call_name: string;
    readonly member_species: readonly string[];
    readonly regions: { readonly [regionKey: string]: RegionInfo };
  };
} = {
  /** マイワシ */
  MAIWASHI: {
    call_name: "マイワシ",
    member_species: ["マイワシ"],
    regions: {
      PACIFIC: { name: "太平洋系群", type: 1 },
      TSUSHIMA: { name: "対馬暖流系群", type: 1 },
    },
  },
  MACHIRUI: {
    call_name: "マチ類",
    member_species: ["アオダイ", "ハマダイ", "ヒメダイ", "オオヒメ"],
    regions: {
      ANAMI_OKINAWA_SAKISHIMA: { name: "（奄美諸島・沖縄諸島・先島諸島）", type: 3 },
    },
  },
  /** ズワイガニ */
  ZUWAIGANI: {
    call_name: "ズワイガニ",
    member_species: ["ズワイガニ"],
    regions: {
      OKHOTSK: { name: "オホーツク海系群", type: 2 },
    },
  },
} as const;

/**
 * 資源名（呼称 + 系群名）を保持する定数
 *
 * @example
 * ```typescript
 * STOCK_GROUP_NAMES.MAIWASHI_PACIFIC // "マイワシ太平洋系群"
 * ```
 */
export const STOCK_GROUP_NAMES = {
  MAIWASHI_PACIFIC: `${STOCK_GROUPS.MAIWASHI.call_name}${STOCK_GROUPS.MAIWASHI.regions.PACIFIC.name}`,
  MAIWASHI_TSUSHIMA: `${STOCK_GROUPS.MAIWASHI.call_name}${STOCK_GROUPS.MAIWASHI.regions.TSUSHIMA.name}`,
  ZUWAIGANI_OKHOTSK: `${STOCK_GROUPS.ZUWAIGANI.call_name}${STOCK_GROUPS.ZUWAIGANI.regions.OKHOTSK.name}`,
  MACHIRUI_ANAMI_OKINAWA_SAKISHIMA: `${STOCK_GROUPS.MACHIRUI.call_name}${STOCK_GROUPS.MACHIRUI.regions.ANAMI_OKINAWA_SAKISHIMA.name}`,
} as const;
