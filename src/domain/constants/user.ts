/**
 * ユーザーロールの定数
 *
 * - PRIMARY: 主担当 - 資源評価の主担当者
 * - SECONDARY: 副担当 - 資源評価の副担当者
 * - ADMIN: 管理者 - システム管理者
 */
export const USER_ROLES = {
  /** 主担当 - 資源評価の主担当者 */
  PRIMARY: "主担当",
  /** 副担当 - 資源評価の副担当者 */
  SECONDARY: "副担当",
  /** 管理者 - システム管理者 */
  ADMIN: "管理者",
} as const;
