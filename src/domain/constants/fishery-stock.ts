/**
 * 評価対象資源名の生成に利用する情報を保持する定数
 * 
 * 呼称（call_name）・構成種の標準和名（member_species）・地域系群（regions）を保持する
 *
 * @example
 * ```typescript
 * STOCK_GROUPS.MAIWASHI.call_name // "マイワシ"
 * STOCK_GROUPS.MAIWASHI.member_species // ["マイワシ"]
 * STOCK_GROUPS.MAIWASHI.regions.PACIFIC // "太平洋系群"
 * ```
 */
export const STOCK_GROUPS = {
    /** マイワシ */
    MAIWASHI: {
      call_name: "マイワシ",
      member_species: ["マイワシ"],
      regions: {
        PACIFIC: "太平洋系群",
        TSUSHIMA: "対馬暖流系群",
      },
    },
    MACHIRUI: {
      call_name: "マチ類",
      member_species: ["アオダイ", "ハマダイ", "ヒメダイ", "オオヒメ"],
      regions: {
        ANAMI_OKINAWA_SAKISHIMA: "奄美諸島・沖縄諸島・先島諸島",
      },
    },
    /** ズワイガニ */
    ZUWAIGANI: {
      call_name: "ズワイガニ",
      member_species: ["ズワイガニ"],
      regions: {
        OKHOTSK: "オホーツク海系群",
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
    MAIWASHI_PACIFIC: `${STOCK_GROUPS.MAIWASHI.call_name}${STOCK_GROUPS.MAIWASHI.regions.PACIFIC}`,
    MAIWASHI_TSUSHIMA: `${STOCK_GROUPS.MAIWASHI.call_name}${STOCK_GROUPS.MAIWASHI.regions.TSUSHIMA}`,
    ZUWAIGANI_OKHOTSK: `${STOCK_GROUPS.ZUWAIGANI.call_name}${STOCK_GROUPS.ZUWAIGANI.regions.OKHOTSK}`,
  } as const;
