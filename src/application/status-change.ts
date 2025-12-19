/**
 * @module status-change
 * 資源評価ステータス変更サービス
 */

import {
  作業着手,
  内部査読依頼,
  内部査読依頼取り消し,
  外部公開,
  外部公開停止,
  再検討依頼,
  再検討依頼取り消し,
  受理,
  受理取り消し,
  type 進行中資源評価,
  type 内部査読中資源評価,
  type 外部査読中資源評価,
  type 内部査読受理済み資源評価,
  type 外部査読受理済み資源評価,
  type 再検討中資源評価,
} from "@/domain/models/stock/status";
import {
  新年度評価初期化,
  type 未着手資源評価,
  type 年度,
  type 資源名,
} from "@/domain/models/stock/stock";
import { is資源評価管理者 } from "@/domain/models/user";
import type { 認証済評価担当者, 認証済資源評価管理者, 副担当者 } from "@/domain/models/user";
import { logger } from "@/utils/logger";

/**
 * 評価開始ユースケース
 * 未着手の資源評価を作業中に変更する
 * Note: No version parameter because version doesn't exist at this point
 */
export function 評価開始ユースケース(対象資源評価: 未着手資源評価, 操作者: 認証済評価担当者) {
  logger.debug("評価開始ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
  });

  const result = 作業着手(対象資源評価, new Date(), 操作者);

  logger.info("評価開始完了", {
    資源名: result.進行中資源評価.対象.toString(),
    イベント: result.作業着手済み.toString(),
  });

  return result;
}

/**
 * 内部査読依頼ユースケース
 * 作業中の資源評価を内部査読中に変更する
 */
export function 内部査読依頼ユースケース(
  対象資源評価: 進行中資源評価,
  操作者: 認証済評価担当者,
  対象バージョン: number
) {
  logger.debug("内部査読依頼ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
    対象バージョン,
  });

  const result = 内部査読依頼(対象資源評価, new Date(), 操作者, 対象バージョン);

  logger.info("内部査読依頼完了", {
    資源名: result.内部査読待ち資源評価.対象.toString(),
    イベント: result.内部査読依頼済み.toString(),
  });

  return result;
}

/**
 * 内部査読依頼取り消しユースケース
 * 内部査読中の資源評価を作業中に戻す
 */
export function 内部査読依頼取り消しユースケース(
  対象資源評価: 内部査読中資源評価,
  操作者: 認証済評価担当者
) {
  logger.debug("内部査読依頼取り消しユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
  });

  const result = 内部査読依頼取り消し(対象資源評価, new Date(), 操作者);

  logger.info("内部査読依頼取り消し完了", {
    資源名: result.進行中資源評価.対象.toString(),
    イベント: result.内部査読依頼取り消し済み.toString(),
  });

  return result;
}

/**
 * 外部公開ユースケース
 * 内部査読受理済みの資源評価を外部査読中に変更する
 */
export function 外部公開ユースケース(
  対象資源評価: 内部査読受理済み資源評価,
  操作者: 認証済資源評価管理者,
  対象バージョン: number
) {
  logger.debug("外部公開ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
    対象バージョン,
  });

  const result = 外部公開(対象資源評価, new Date(), 操作者, 対象バージョン);

  logger.info("外部公開完了", {
    資源名: result.外部査読中資源評価.対象.toString(),
    イベント: result.外部公開済み.toString(),
  });

  return result;
}

/**
 * 外部公開停止ユースケース
 * 外部査読中の資源評価を外部公開可能に戻す
 */
export function 外部公開停止ユースケース(
  対象資源評価: 外部査読中資源評価,
  操作者: 認証済資源評価管理者
) {
  logger.debug("外部公開停止ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
  });

  const result = 外部公開停止(対象資源評価, new Date(), 操作者);

  logger.info("外部公開停止完了", {
    資源名: result.外部公開可能資源評価.対象.toString(),
    イベント: result.外部公開停止済み.toString(),
  });

  return result;
}

/**
 * 再検討依頼ユースケース
 * 内部査読中または外部査読中の資源評価を再検討中に変更する
 */
export function 再検討依頼ユースケース(
  対象資源評価: 内部査読中資源評価 | 外部査読中資源評価,
  操作者: 認証済資源評価管理者 | 副担当者,
  対象バージョン: number
) {
  logger.debug("再検討依頼ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
    対象バージョン,
  });

  const result = 再検討依頼(対象資源評価, new Date(), 操作者, 対象バージョン);

  logger.info("再検討依頼完了", {
    資源名: result.再検討待ち資源評価.対象.toString(),
    イベント: result.再検討依頼済み.toString(),
  });

  return result;
}

/**
 * 再検討依頼取り消しユースケース
 * 再検討中の資源評価を元のステータスに戻す
 *
 * 元ステータスは対象資源評価.元ステータスから自動的に取得されます
 * @throws Error if 元ステータス is "外部査読中" and 操作者 is not a 資源評価管理者
 */
export function 再検討依頼取り消しユースケース(
  対象資源評価: 再検討中資源評価,
  操作者: 認証済資源評価管理者 | 副担当者
) {
  const 元ステータス = 対象資源評価.元ステータス;

  logger.debug("再検討依頼取り消しユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
    元ステータス,
  });

  // Validate operator role matches the origin status requirements
  if (元ステータス === "外部査読中" && !is資源評価管理者(操作者)) {
    throw new Error("外部査読中からの再検討依頼取り消しは資源評価管理者のみが操作できます");
  }

  const result = 再検討依頼取り消し(対象資源評価, new Date(), 操作者);

  logger.info("再検討依頼取り消し完了", {
    資源名: result.査読中資源評価.対象.toString(),
    イベント: result.再検討依頼取り消し済み.toString(),
    戻り先: 元ステータス,
  });

  return result;
}

/**
 * 受理ユースケース（内部査読中）
 * 内部査読中の資源評価を外部公開可能に変更する
 */
export function 内部査読受理ユースケース(
  対象資源評価: 内部査読中資源評価,
  操作者: 認証済資源評価管理者,
  対象バージョン: number
) {
  logger.debug("内部査読受理ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
    対象バージョン,
  });

  const result = 受理(対象資源評価, new Date(), 操作者, 対象バージョン);

  logger.info("内部査読受理完了", {
    資源名: result.受理済み資源評価.対象.toString(),
    イベント: result.受理済み.toString(),
  });

  return result;
}

/**
 * 受理ユースケース（外部査読中）
 * 外部査読中の資源評価を外部査読受理済みに変更する
 */
export function 外部査読受理ユースケース(
  対象資源評価: 外部査読中資源評価,
  操作者: 認証済資源評価管理者,
  対象バージョン: number
) {
  logger.debug("外部査読受理ユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
    対象バージョン,
  });

  const result = 受理(対象資源評価, new Date(), 操作者, 対象バージョン);

  logger.info("外部査読受理完了", {
    資源名: result.受理済み資源評価.対象.toString(),
    イベント: result.受理済み.toString(),
  });

  return result;
}

/**
 * 内部査読受理取り消しユースケース
 * 外部公開可能の資源評価を内部査読中に戻す
 */
export function 内部査読受理取り消しユースケース(
  対象資源評価: 内部査読受理済み資源評価,
  操作者: 認証済資源評価管理者
) {
  logger.debug("内部査読受理取り消しユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
  });

  const result = 受理取り消し(対象資源評価, new Date(), 操作者);

  logger.info("内部査読受理取り消し完了", {
    資源名: result.査読中資源評価.対象.toString(),
    イベント: result.受理取り消し済み.toString(),
  });

  return result;
}

/**
 * 外部査読受理取り消しユースケース
 * 外部査読受理済みの資源評価を外部査読中に戻す
 */
export function 外部査読受理取り消しユースケース(
  対象資源評価: 外部査読受理済み資源評価,
  操作者: 認証済資源評価管理者
) {
  logger.debug("外部査読受理取り消しユースケース called", {
    資源名: 対象資源評価.対象.toString(),
    操作者: 操作者.氏名,
  });

  const result = 受理取り消し(対象資源評価, new Date(), 操作者);

  logger.info("外部査読受理取り消し完了", {
    資源名: result.査読中資源評価.対象.toString(),
    イベント: result.受理取り消し済み.toString(),
  });

  return result;
}

/**
 * 新年度評価開始ユースケース
 * 新年度のすべての資源評価を未着手状態で初期化する
 */
export function 新年度評価開始ユースケース(年度: 年度) {
  logger.debug("新年度評価開始ユースケース called", { 年度 });

  const result = 新年度評価初期化(年度);

  const 初期化された資源名一覧: 資源名[] = [...result.評価一覧.keys()];
  logger.info("新年度評価開始完了", {
    message: result.toString(),
    資源名一覧: 初期化された資源名一覧,
  });

  return result;
}
