import { 資源名s, 資源タイプs, ロールs } from "../../constants";
import { create資源情報, create資源評価 } from "../../helpers";
import { 作業着手, 内部査読依頼, 外部公開, 再検討依頼 } from "./index";
import {
  create評価担当者,
  create資源評価管理者,
  to認証済評価担当者,
  主担当者,
  副担当者,
  to認証済資源評価管理者,
} from "../user";
import { describe, it, expect } from "vitest";

describe("資源情報", () => {
  it("期待通りの情報を保持している", () => {
    const maiwashiPacific = create資源情報(資源名s.マイワシ太平洋);

    expect(maiwashiPacific.呼称).toBe("マイワシ");
    expect(maiwashiPacific.系群名).toBe("太平洋系群");
    expect(maiwashiPacific.資源タイプ).toBe(資源タイプs["1系"]);
  });
});

describe("作業着手", () => {
  const create未着手の資源評価 = () => {
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    return create資源評価(資源情報);
  };
  
  it("資源評価のステータスを「未着手」から「作業中」に変更する", () => {
    // Arrange
    const 未着手の資源評価 = create未着手の資源評価();
    const 主担当者 = create評価担当者("user-1", "マイワシ太郎", "maiwashi-taro@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    });
    const 認証済み主担当者 = to認証済評価担当者(主担当者) as 主担当者;
    const 着手日時 = new Date("2025-01-01T09:00:00Z");

    // Act
    const { 進行中資源評価 } = 作業着手(未着手の資源評価, 着手日時, 認証済み主担当者);

    // Assert
    expect(進行中資源評価.作業ステータス).toBe("作業中");
    expect(進行中資源評価.対象).toEqual(未着手の資源評価.対象);
  });

  it("作業着手イベントを正しく生成する", () => {
    // Arrange
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    const 未着手の資源評価 = create未着手の資源評価();
    const 主担当者 = create評価担当者("user-1", "マイワシ太郎", "maiwashi-taro@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    });
    const 認証済み主担当者 = to認証済評価担当者(主担当者) as 主担当者;
    const 着手日時 = new Date("2025-01-01T09:00:00Z");

    // Act
    const { 作業着手済み } = 作業着手(未着手の資源評価, 着手日時, 認証済み主担当者);

    // Assert
    expect(作業着手済み.変化前).toBe("未着手");
    expect(作業着手済み.変化後).toBe("作業中");
    expect(作業着手済み.変化理由).toBe("作業着手");
    expect(作業着手済み.日時).toEqual(着手日時);
    expect(作業着手済み.操作者).toBe(認証済み主担当者);
  });

  it("作業着手イベントのtoStringが正しく動作する", () => {
    // Arrange
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    const 未着手の資源評価 = create未着手の資源評価();
    const 主担当者 = create評価担当者("user-1", "マイワシ太郎", "maiwashi-taro@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    });
    const 認証済み主担当者 = to認証済評価担当者(主担当者) as 主担当者;
    const 着手日時 = new Date("2025-01-01T09:00:00Z");

    // Act
    const { 作業着手済み } = 作業着手(未着手の資源評価, 着手日時, 認証済み主担当者);

    // Assert
    expect(作業着手済み.toString()).toBe(
      "未着手 → 作業中 by マイワシ太郎 at 2025-01-01T09:00:00.000Z"
    );
  });

  it("immutableな操作", () => {
    // Arrange
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    const 未着手の資源評価 = create未着手の資源評価();
    const 主担当者 = create評価担当者("user-1", "マイワシ太郎", "maiwashi-taro@example.com", {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    });
    const 認証済み主担当者 = to認証済評価担当者(主担当者) as 主担当者;

    // Act
    作業着手(未着手の資源評価, new Date(), 認証済み主担当者);

    // Assert - original should remain unchanged
    expect(未着手の資源評価.作業ステータス).toBe("未着手");
  });

  it.each([
    {
      name: "認証済みの副担当者",
      createUser: () =>
        to認証済評価担当者(
          create評価担当者("user-1", "認証済副担当", "test@example.com", {
            [資源名s.マイワシ太平洋]: ロールs.副担当,
          })
        ),
    },
    {
      name: "担当資源がないユーザー",
      createUser: () =>
        to認証済評価担当者(create評価担当者("user-2", "無担当ユーザー", "test@example.com", {})),
    },
  ])("$name は作業着手できない（主担当者のみ）", ({ createUser }) => {
    const 未着手の資源評価 = create未着手の資源評価();
    const user = createUser();

    expect(() => 作業着手(未着手の資源評価, new Date(), user)).toThrow(
      "主担当者のみが操作できます"
    );
  });

  it("認証済みの主担当者のみが作業着手できる", () => {
    const 未着手の資源評価 = create未着手の資源評価();
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    );

    expect(() => 作業着手(未着手の資源評価, new Date(), 認証済み主担当者)).not.toThrow();
  });
});

describe("内部査読依頼", () => {
  const create作業中の資源評価 = () => {
    const 未着手 = create資源評価(create資源情報(資源名s.マイワシ太平洋));
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    ) as 主担当者;
    const { 進行中資源評価 } = 作業着手(未着手, new Date(), 認証済み主担当者);
    return 進行中資源評価;
  };

  it("資源評価のステータスを「作業中」から「内部査読中」に変更する", () => {
    const 作業中の資源評価 = create作業中の資源評価();
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    );
    const 日時 = new Date("2025-01-01T09:00:00Z");

    const { 内部査読待ち資源評価 } = 内部査読依頼(作業中の資源評価, 日時, 認証済み主担当者);
    expect(内部査読待ち資源評価.作業ステータス).toBe("内部査読中");
    expect(内部査読待ち資源評価.対象).toEqual(作業中の資源評価.対象);
  });

  it("内部査読依頼イベントを正しく生成する", () => {
    const 作業中の資源評価 = create作業中の資源評価();
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    );
    const 日時 = new Date("2025-01-01T09:00:00Z");

    const { 内部査読依頼済み } = 内部査読依頼(作業中の資源評価, 日時, 認証済み主担当者);
    expect(内部査読依頼済み.変化前).toBe("作業中");
    expect(内部査読依頼済み.変化後).toBe("内部査読中");
    expect(内部査読依頼済み.変化理由).toBe("内部査読依頼");
    expect(内部査読依頼済み.日時).toEqual(日時);
    expect(内部査読依頼済み.操作者).toBe(認証済み主担当者);
  });

  it.each([
    {
      name: "認証済みの副担当者",
      createUser: () =>
        to認証済評価担当者(
          create評価担当者("user-1", "認証済副担当", "test@example.com", {
            [資源名s.マイワシ太平洋]: ロールs.副担当,
          })
        ),
      expectedError: "主担当者のみが操作できます",
    },
    {
      name: "担当資源がないユーザー",
      createUser: () =>
        to認証済評価担当者(create評価担当者("user-2", "無担当ユーザー", "test@example.com", {})),
      expectedError: "主担当者のみが操作できます",
    },
  ])("$name は内部査読依頼できない（主担当者のみ）", ({ createUser }) => {
    const 作業中の資源評価 = create作業中の資源評価();
    const user = createUser();

    expect(() => 内部査読依頼(作業中の資源評価, new Date(), user)).toThrow(
      "主担当者のみが操作できます"
    );
  });

  it("認証済みの主担当者のみが内部査読依頼できる", () => {
    const 作業中の資源評価 = create作業中の資源評価();
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    );

    expect(() => 内部査読依頼(作業中の資源評価, new Date(), 認証済み主担当者)).not.toThrow();
  });
});

describe("外部公開", () => {
  // Helper to create 内部査読中資源評価 (requires 作業着手 -> 内部査読依頼)
  const create内部査読中の資源評価 = () => {
    const 未着手 = create資源評価(create資源情報(資源名s.マイワシ太平洋));
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    ) as 主担当者;
    const { 進行中資源評価 } = 作業着手(未着手, new Date(), 認証済み主担当者);
    const { 内部査読待ち資源評価 } = 内部査読依頼(進行中資源評価, new Date(), 認証済み主担当者);
    return 内部査読待ち資源評価;
  };

  it("資源評価のステータスを「内部査読中」から「外部査読中」に変更する", () => {
    const 内部査読中の資源評価 = create内部査読中の資源評価();
    const 認証済み資源評価管理者 = to認証済資源評価管理者(
      create資源評価管理者("user-1", "認証済資源評価管理者", "test@example.com")
    );
    const 日時 = new Date("2025-01-01T09:00:00Z");

    const { 外部査読中資源評価 } = 外部公開(内部査読中の資源評価, 日時, 認証済み資源評価管理者);
    expect(外部査読中資源評価.作業ステータス).toBe("外部査読中");
    expect(外部査読中資源評価.対象).toEqual(内部査読中の資源評価.対象);
  });

  it("外部公開イベントを正しく生成する", () => {
    const 内部査読中の資源評価 = create内部査読中の資源評価();
    const 認証済み資源評価管理者 = to認証済資源評価管理者(
      create資源評価管理者("user-1", "認証済資源評価管理者", "test@example.com")
    );
    const 日時 = new Date("2025-01-01T09:00:00Z");

    const { 外部公開済み } = 外部公開(内部査読中の資源評価, 日時, 認証済み資源評価管理者);
    expect(外部公開済み.変化前).toBe("内部査読中");
    expect(外部公開済み.変化後).toBe("外部査読中");
    expect(外部公開済み.変化理由).toBe("外部公開");
    expect(外部公開済み.日時).toEqual(日時);
    expect(外部公開済み.操作者).toBe(認証済み資源評価管理者);
  });
});

describe("再検討依頼", () => {
  const create内部査読中資源評価 = () => {
    const 未着手 = create資源評価(create資源情報(資源名s.マイワシ太平洋));
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", {
        [資源名s.マイワシ太平洋]: ロールs.主担当,
      })
    ) as 主担当者;
    const { 進行中資源評価 } = 作業着手(未着手, new Date(), 認証済み主担当者);
    const { 内部査読待ち資源評価 } = 内部査読依頼(進行中資源評価, new Date(), 認証済み主担当者);
    return 内部査読待ち資源評価;
  };

  const create外部査読中資源評価 = () => {
    const 内部査読中 = create内部査読中資源評価();
    const 認証済み管理者 = to認証済資源評価管理者(
      create資源評価管理者("admin-1", "管理者", "admin@example.com")
    );
    const { 外部査読中資源評価 } = 外部公開(内部査読中, new Date(), 認証済み管理者);
    return 外部査読中資源評価;
  };

  describe("外部査読中からの再検討依頼", () => {
    it("資源評価のステータスを「外部査読中」から「再検討中」に変更する", () => {
      const 外部査読中の資源評価 = create外部査読中資源評価();
      const 認証済み資源評価管理者 = to認証済資源評価管理者(
        create資源評価管理者("user-1", "認証済資源評価管理者", "test@example.com")
      );
      const 日時 = new Date("2025-01-01T09:00:00Z");

      const { 再検討待ち資源評価 } = 再検討依頼(外部査読中の資源評価, 日時, 認証済み資源評価管理者);
      expect(再検討待ち資源評価.作業ステータス).toBe("再検討中");
      expect(再検討待ち資源評価.対象).toEqual(外部査読中の資源評価.対象);
    });

    it("再検討依頼イベントを正しく生成する", () => {
      const 外部査読中の資源評価 = create外部査読中資源評価();
      const 認証済み資源評価管理者 = to認証済資源評価管理者(
        create資源評価管理者("user-1", "認証済資源評価管理者", "test@example.com")
      );
      const 日時 = new Date("2025-01-01T09:00:00Z");

      const { 再検討依頼済み } = 再検討依頼(外部査読中の資源評価, 日時, 認証済み資源評価管理者);
      expect(再検討依頼済み.変化前).toBe("外部査読中");
      expect(再検討依頼済み.変化後).toBe("再検討中");
      expect(再検討依頼済み.変化理由).toBe("再検討依頼");
      expect(再検討依頼済み.日時).toEqual(日時);
      expect(再検討依頼済み.操作者).toBe(認証済み資源評価管理者);
    });

    it("副担当者は外部査読中の資源評価に再検討依頼できない", () => {
      const 外部査読中の資源評価 = create外部査読中資源評価();
      const 認証済み副担当者 = to認証済評価担当者(
        create評価担当者("user-2", "認証済副担当", "test@example.com", {
          [資源名s.マイワシ太平洋]: ロールs.副担当,
        })
      ) as 副担当者;
      const 日時 = new Date("2025-01-01T09:00:00Z");

      expect(() => 再検討依頼(外部査読中の資源評価, 日時, 認証済み副担当者)).toThrow(
        "外部査読中の再検討依頼は資源評価管理者のみが操作できます"
      );
    });
  });

  describe("内部査読中からの再検討依頼", () => {
    it("資源評価管理者は内部査読中の資源評価に再検討依頼できる", () => {
      const 内部査読中の資源評価 = create内部査読中資源評価();
      const 認証済み資源評価管理者 = to認証済資源評価管理者(
        create資源評価管理者("user-1", "認証済資源評価管理者", "test@example.com")
      );
      const 日時 = new Date("2025-01-01T09:00:00Z");

      const { 再検討待ち資源評価 } = 再検討依頼(内部査読中の資源評価, 日時, 認証済み資源評価管理者);
      expect(再検討待ち資源評価.作業ステータス).toBe("再検討中");
    });

    it("副担当者は内部査読中の資源評価に再検討依頼できる", () => {
      const 内部査読中の資源評価 = create内部査読中資源評価();
      const 認証済み副担当者 = to認証済評価担当者(
        create評価担当者("user-2", "認証済副担当", "test@example.com", {
          [資源名s.マイワシ太平洋]: ロールs.副担当,
        })
      ) as 副担当者;
      const 日時 = new Date("2025-01-01T09:00:00Z");

      const { 再検討待ち資源評価 } = 再検討依頼(内部査読中の資源評価, 日時, 認証済み副担当者);
      expect(再検討待ち資源評価.作業ステータス).toBe("再検討中");
    });
  });
});