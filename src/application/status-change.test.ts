import { describe, it, expect } from "vitest";
import { 資源名s, ロールs } from "@/domain/constants";
import { create資源情報, create資源評価 } from "@/domain/helpers";
import {
  create評価担当者,
  create資源評価管理者,
  to認証済評価担当者,
  to認証済資源評価管理者,
} from "@/domain/models/user";
import type { 主担当者, 副担当者 } from "@/domain/models/user";
import { 作業着手, 内部査読依頼, 外部公開, 再検討依頼, 受理 } from "@/domain/models/stock/status";
import {
  評価開始ユースケース,
  内部査読依頼ユースケース,
  内部査読依頼取り消しユースケース,
  外部公開ユースケース,
  外部公開停止ユースケース,
  再検討依頼ユースケース,
  再検討依頼取り消し内部査読中へユースケース,
  再検討依頼取り消し外部査読中へユースケース,
  内部査読受理ユースケース,
  外部査読受理ユースケース,
  内部査読受理取り消しユースケース,
  外部査読受理取り消しユースケース,
  新年度評価開始ユースケース,
} from "./status-change";

// Test helpers
const create未着手の資源評価 = () => {
  return create資源評価(create資源情報(資源名s.マイワシ太平洋));
};

const create認証済み主担当者 = () => {
  return to認証済評価担当者(
    create評価担当者("user-1", "認証済主担当", "test@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    })
  ) as 主担当者;
};

const create認証済み副担当者 = () => {
  return to認証済評価担当者(
    create評価担当者("user-2", "認証済副担当", "sub@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.副担当,
    })
  ) as 副担当者;
};

const create認証済み資源評価管理者 = () => {
  return to認証済資源評価管理者(create資源評価管理者("admin-1", "管理者", "admin@example.com"));
};

const create作業中の資源評価 = () => {
  const 未着手 = create未着手の資源評価();
  const 主担当者 = create認証済み主担当者();
  const { 進行中資源評価 } = 作業着手(未着手, new Date(), 主担当者);
  return 進行中資源評価;
};

const create内部査読中の資源評価 = () => {
  const 作業中 = create作業中の資源評価();
  const 主担当者 = create認証済み主担当者();
  const { 内部査読待ち資源評価 } = 内部査読依頼(作業中, new Date(), 主担当者);
  return 内部査読待ち資源評価;
};

const create外部査読中の資源評価 = () => {
  const 内部査読中 = create内部査読中の資源評価();
  const 管理者 = create認証済み資源評価管理者();
  const { 外部査読中資源評価 } = 外部公開(内部査読中, new Date(), 管理者);
  return 外部査読中資源評価;
};

const create再検討中の資源評価_内部査読中から = () => {
  const 内部査読中 = create内部査読中の資源評価();
  const 副担当者 = create認証済み副担当者();
  const { 再検討待ち資源評価 } = 再検討依頼(内部査読中, new Date(), 副担当者);
  return 再検討待ち資源評価;
};

const create再検討中の資源評価_外部査読中から = () => {
  const 外部査読中 = create外部査読中の資源評価();
  const 管理者 = create認証済み資源評価管理者();
  const { 再検討待ち資源評価 } = 再検討依頼(外部査読中, new Date(), 管理者);
  return 再検討待ち資源評価;
};

const create内部査読受理済みの資源評価 = () => {
  const 内部査読中 = create内部査読中の資源評価();
  const 管理者 = create認証済み資源評価管理者();
  const { 受理済み資源評価 } = 受理(内部査読中, new Date(), 管理者);
  return 受理済み資源評価;
};

const create外部査読受理済みの資源評価 = () => {
  const 外部査読中 = create外部査読中の資源評価();
  const 管理者 = create認証済み資源評価管理者();
  const { 受理済み資源評価 } = 受理(外部査読中, new Date(), 管理者);
  return 受理済み資源評価;
};

describe("評価開始ユースケース", () => {
  it("未着手の資源評価を作業中に変更する", () => {
    const 未着手 = create未着手の資源評価();
    const 主担当者 = create認証済み主担当者();

    const result = 評価開始ユースケース(未着手, 主担当者);

    expect(result.進行中資源評価.作業ステータス).toBe("作業中");
    expect(result.作業着手済み.変化前).toBe("未着手");
    expect(result.作業着手済み.変化後).toBe("作業中");
  });
});

describe("内部査読依頼ユースケース", () => {
  it("作業中の資源評価を内部査読中に変更する", () => {
    const 作業中 = create作業中の資源評価();
    const 主担当者 = create認証済み主担当者();

    const result = 内部査読依頼ユースケース(作業中, 主担当者);

    expect(result.内部査読待ち資源評価.作業ステータス).toBe("内部査読中");
    expect(result.内部査読依頼済み.変化前).toBe("作業中");
    expect(result.内部査読依頼済み.変化後).toBe("内部査読中");
  });
});

describe("内部査読依頼取り消しユースケース", () => {
  it("内部査読中の資源評価を作業中に戻す", () => {
    const 内部査読中 = create内部査読中の資源評価();
    const 主担当者 = create認証済み主担当者();

    const result = 内部査読依頼取り消しユースケース(内部査読中, 主担当者);

    expect(result.進行中資源評価.作業ステータス).toBe("作業中");
    expect(result.内部査読依頼取り消し済み.変化前).toBe("内部査読中");
    expect(result.内部査読依頼取り消し済み.変化後).toBe("作業中");
  });
});

describe("外部公開ユースケース", () => {
  it("内部査読中の資源評価を外部査読中に変更する", () => {
    const 内部査読中 = create内部査読中の資源評価();
    const 管理者 = create認証済み資源評価管理者();

    const result = 外部公開ユースケース(内部査読中, 管理者);

    expect(result.外部査読中資源評価.作業ステータス).toBe("外部査読中");
    expect(result.外部公開済み.変化前).toBe("内部査読中");
    expect(result.外部公開済み.変化後).toBe("外部査読中");
  });
});

describe("外部公開停止ユースケース", () => {
  it("外部査読中の資源評価を外部公開可能に戻す", () => {
    const 外部査読中 = create外部査読中の資源評価();
    const 管理者 = create認証済み資源評価管理者();

    const result = 外部公開停止ユースケース(外部査読中, 管理者);

    expect(result.外部公開可能資源評価.作業ステータス).toBe("外部公開可能");
    expect(result.外部公開停止済み.変化前).toBe("外部査読中");
    expect(result.外部公開停止済み.変化後).toBe("外部公開可能");
  });
});

describe("再検討依頼ユースケース", () => {
  it("内部査読中の資源評価を再検討中に変更する", () => {
    const 内部査読中 = create内部査読中の資源評価();
    const 副担当者 = create認証済み副担当者();

    const result = 再検討依頼ユースケース(内部査読中, 副担当者);

    expect(result.再検討待ち資源評価.作業ステータス).toBe("再検討中");
    expect(result.再検討依頼済み.変化前).toBe("内部査読中");
    expect(result.再検討依頼済み.変化後).toBe("再検討中");
  });

  it("外部査読中の資源評価を再検討中に変更する", () => {
    const 外部査読中 = create外部査読中の資源評価();
    const 管理者 = create認証済み資源評価管理者();

    const result = 再検討依頼ユースケース(外部査読中, 管理者);

    expect(result.再検討待ち資源評価.作業ステータス).toBe("再検討中");
    expect(result.再検討依頼済み.変化前).toBe("外部査読中");
    expect(result.再検討依頼済み.変化後).toBe("再検討中");
  });
});

describe("再検討依頼取り消しユースケース", () => {
  describe("内部査読中への取り消し", () => {
    it("再検討中の資源評価を内部査読中に戻す", () => {
      const 再検討中 = create再検討中の資源評価_内部査読中から();
      const 副担当者 = create認証済み副担当者();

      const result = 再検討依頼取り消し内部査読中へユースケース(再検討中, 副担当者);

      expect(result.内部査読中資源評価.作業ステータス).toBe("内部査読中");
      expect(result.再検討依頼取り消し済み.変化前).toBe("再検討中");
      expect(result.再検討依頼取り消し済み.変化後).toBe("内部査読中");
    });
  });

  describe("外部査読中への取り消し", () => {
    it("再検討中の資源評価を外部査読中に戻す", () => {
      const 再検討中 = create再検討中の資源評価_外部査読中から();
      const 管理者 = create認証済み資源評価管理者();

      const result = 再検討依頼取り消し外部査読中へユースケース(再検討中, 管理者);

      expect(result.外部査読中資源評価.作業ステータス).toBe("外部査読中");
      expect(result.再検討依頼取り消し済み.変化前).toBe("再検討中");
      expect(result.再検討依頼取り消し済み.変化後).toBe("外部査読中");
    });
  });
});

describe("受理ユースケース", () => {
  describe("内部査読受理", () => {
    it("内部査読中の資源評価を外部公開可能に変更する", () => {
      const 内部査読中 = create内部査読中の資源評価();
      const 管理者 = create認証済み資源評価管理者();

      const result = 内部査読受理ユースケース(内部査読中, 管理者);

      expect(result.受理済み資源評価.作業ステータス).toBe("外部公開可能");
      expect(result.受理済み.変化前).toBe("内部査読中");
      expect(result.受理済み.変化後).toBe("外部公開可能");
    });
  });

  describe("外部査読受理", () => {
    it("外部査読中の資源評価を外部査読受理済みに変更する", () => {
      const 外部査読中 = create外部査読中の資源評価();
      const 管理者 = create認証済み資源評価管理者();

      const result = 外部査読受理ユースケース(外部査読中, 管理者);

      expect(result.受理済み資源評価.作業ステータス).toBe("外部査読受理済み");
      expect(result.受理済み.変化前).toBe("外部査読中");
      expect(result.受理済み.変化後).toBe("外部査読受理済み");
    });
  });
});

describe("受理取り消しユースケース", () => {
  describe("内部査読受理取り消し", () => {
    it("外部公開可能の資源評価を内部査読中に戻す", () => {
      const 内部査読受理済み = create内部査読受理済みの資源評価();
      const 管理者 = create認証済み資源評価管理者();

      const result = 内部査読受理取り消しユースケース(内部査読受理済み, 管理者);

      expect(result.内部査読中資源評価!.作業ステータス).toBe("内部査読中");
      expect(result.受理取り消し済み.変化前).toBe("外部公開可能");
      expect(result.受理取り消し済み.変化後).toBe("内部査読中");
    });
  });

  describe("外部査読受理取り消し", () => {
    it("外部査読受理済みの資源評価を外部査読中に戻す", () => {
      const 外部査読受理済み = create外部査読受理済みの資源評価();
      const 管理者 = create認証済み資源評価管理者();

      const result = 外部査読受理取り消しユースケース(外部査読受理済み, 管理者);

      expect(result.外部査読中資源評価!.作業ステータス).toBe("外部査読中");
      expect(result.受理取り消し済み.変化前).toBe("外部査読受理済み");
      expect(result.受理取り消し済み.変化後).toBe("外部査読中");
    });
  });
});

describe("新年度評価開始ユースケース", () => {
  it("新年度のすべての資源評価を未着手状態で初期化する", () => {
    const 年度 = 2025;

    const result = 新年度評価開始ユースケース(年度);

    expect(result.年度).toBe(年度);
    const 全資源名 = Object.values(資源名s);
    expect(result.評価一覧.size).toBe(全資源名.length);

    for (const 資源名 of 全資源名) {
      const 評価 = result.評価一覧.get(資源名);
      expect(評価).toBeDefined();
      expect(評価!.作業ステータス).toBe("未着手");
    }
  });

  it("toString()で初期化結果を文字列化できる", () => {
    const 年度 = 2025;

    const result = 新年度評価開始ユースケース(年度);
    const 資源数 = Object.values(資源名s).length;

    expect(result.toString()).toBe(`${年度}年度 資源評価初期化完了（${資源数}件）`);
  });
});
