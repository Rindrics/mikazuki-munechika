/**
 * Shared test helpers for stock status tests
 */
import { 資源名s, ロールs } from "@/domain/constants";
import { create資源情報, create資源評価 } from "@/domain/helpers";
import { 作業着手, 内部査読依頼, 外部公開, 再検討依頼, 受理 } from "@/domain/models/stock/status";
import {
  create評価担当者,
  create資源評価管理者,
  to認証済評価担当者,
  to認証済資源評価管理者,
} from "@/domain/models/user";
import type { 主担当者, 副担当者 } from "@/domain/models/user";

export const create未着手の資源評価 = () => {
  return create資源評価(create資源情報(資源名s.マイワシ太平洋));
};

export const create認証済み主担当者 = () => {
  return to認証済評価担当者(
    create評価担当者("user-1", "認証済主担当", "test@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    })
  ) as 主担当者;
};

export const create認証済み副担当者 = () => {
  return to認証済評価担当者(
    create評価担当者("user-2", "認証済副担当", "sub@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.副担当,
    })
  ) as 副担当者;
};

export const create認証済み資源評価管理者 = () => {
  return to認証済資源評価管理者(create資源評価管理者("admin-1", "管理者", "admin@example.com"));
};

export const create作業中の資源評価 = () => {
  const 未着手 = create未着手の資源評価();
  const 認証済み主担当者 = create認証済み主担当者();
  const { 進行中資源評価 } = 作業着手(未着手, new Date(), 認証済み主担当者);
  return 進行中資源評価;
};

// Default test version number
const テスト用バージョン = 1;

export const create内部査読中の資源評価 = () => {
  const 進行中資源評価 = create作業中の資源評価();
  const 認証済み主担当者 = create認証済み主担当者();
  const { 内部査読待ち資源評価 } = 内部査読依頼(
    進行中資源評価,
    new Date(),
    認証済み主担当者,
    テスト用バージョン
  );
  return 内部査読待ち資源評価;
};

export const create外部査読中の資源評価 = () => {
  const 内部査読中 = create内部査読中の資源評価();
  const 認証済み管理者 = create認証済み資源評価管理者();
  const { 外部査読中資源評価 } = 外部公開(
    内部査読中,
    new Date(),
    認証済み管理者,
    テスト用バージョン
  );
  return 外部査読中資源評価;
};

export const create再検討中の資源評価_内部査読中から = () => {
  const 内部査読中 = create内部査読中の資源評価();
  const 認証済み副担当者 = create認証済み副担当者();
  const { 再検討待ち資源評価 } = 再検討依頼(
    内部査読中,
    new Date(),
    認証済み副担当者,
    テスト用バージョン
  );
  return 再検討待ち資源評価;
};

export const create再検討中の資源評価_外部査読中から = () => {
  const 外部査読中 = create外部査読中の資源評価();
  const 認証済み管理者 = create認証済み資源評価管理者();
  const { 再検討待ち資源評価 } = 再検討依頼(
    外部査読中,
    new Date(),
    認証済み管理者,
    テスト用バージョン
  );
  return 再検討待ち資源評価;
};

export const create内部査読受理済みの資源評価 = () => {
  const 内部査読中 = create内部査読中の資源評価();
  const 管理者 = create認証済み資源評価管理者();
  const { 受理済み資源評価 } = 受理(内部査読中, new Date(), 管理者, テスト用バージョン);
  return 受理済み資源評価;
};

export const create外部査読受理済みの資源評価 = () => {
  const 外部査読中 = create外部査読中の資源評価();
  const 管理者 = create認証済み資源評価管理者();
  const { 受理済み資源評価 } = 受理(外部査読中, new Date(), 管理者, テスト用バージョン);
  return 受理済み資源評価;
};
