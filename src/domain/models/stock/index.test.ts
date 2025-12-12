import { 資源名s, 資源タイプs, ロールs } from "../../constants";
import { create資源情報, create資源評価 } from "../../helpers";
import { 作業着手 } from "./index";
import { create評価担当者, create資源評価管理者, to認証済評価担当者, 主担当者, 評価担当者, 資源評価管理者 } from "../user";
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
  it("資源評価のステータスを「未着手」から「作業中」に変更する", () => {
    // Arrange
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    const 未着手の資源評価 = create資源評価(資源情報);
    const 主担当者 = create評価担当者(
      "user-1",
      "マイワシ太郎",
      "maiwashi-taro@example.com",
      { [資源名s.マイワシ太平洋]: ロールs.主担当 }
    );
    const 認証済み主担当者 = to認証済評価担当者(主担当者) as 主担当者;
    const 着手日時 = new Date("2025-01-01T09:00:00Z");

    // Act
    const { 進行中資源評価 } = 作業着手(
      未着手の資源評価,
      着手日時,
      認証済み主担当者
    );

    // Assert
    expect(進行中資源評価.作業ステータス).toBe("作業中");
    expect(進行中資源評価.対象).toEqual(未着手の資源評価.対象);
  });

  it("作業着手イベントを正しく生成する", () => {
    // Arrange
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    const 未着手の資源評価 = create資源評価(資源情報);
    const 主担当者 = create評価担当者(
      "user-1",
      "マイワシ太郎",
      "maiwashi-taro@example.com",
      { [資源名s.マイワシ太平洋]: ロールs.主担当 }
    );
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
    const 未着手の資源評価 = create資源評価(資源情報);
    const 主担当者 = create評価担当者(
      "user-1",
      "マイワシ太郎",
      "maiwashi-taro@example.com",
      { [資源名s.マイワシ太平洋]: ロールs.主担当 }
    );
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
    const 未着手の資源評価 = create資源評価(資源情報);
    const 主担当者 = create評価担当者(
      "user-1",
      "マイワシ太郎",
      "maiwashi-taro@example.com",
      { [資源名s.マイワシ太平洋]: ロールs.主担当 }
    );
    const 認証済み主担当者 = to認証済評価担当者(主担当者) as 主担当者;

    // Act
    作業着手(未着手の資源評価, new Date(), 認証済み主担当者);

    // Assert - original should remain unchanged
    expect(未着手の資源評価.作業ステータス).toBe("未着手");
  });

  it.each([
    {
      name: "未認証の主担当者",
      createUser: () => create評価担当者("user-1", "未認証主担当", "test@example.com", { [資源名s.マイワシ太平洋]: ロールs.主担当 }),
      expectError: "未認証のユーザーは作業着手できません",
    },
    {
      name: "未認証の副担当者",
      createUser: () => create評価担当者("user-2", "未認証副担当", "test@example.com", { [資源名s.マイワシ太平洋]: ロールs.副担当 }),
      expectError: "未認証のユーザーは作業着手できません",
    },
    {
      name: "認証済みの副担当者",
      createUser: () => to認証済評価担当者(create評価担当者("user-3", "認証済副担当", "test@example.com", { [資源名s.マイワシ太平洋]: ロールs.副担当 })),
      expectError: "主担当者のみが作業着手できます",
    },
    {
      name: "未認証の管理者",
      createUser: () => create資源評価管理者("user-4", "認証済管理者", "test@example.com"),
      expectError: "未認証のユーザーは作業着手できません",
    },
    {
      name: "認証済みの管理者",
      createUser: () => to認証済評価担当者(create評価担当者("user-5", "認証済管理者", "test@example.com")),
      expectError: "主担当者のみが作業着手できます",
    },
  ])("$name は作業着手できない", ({ createUser, expectError }) => {
    const 未着手の資源評価 = create資源評価(create資源情報(資源名s.マイワシ太平洋));
    const user = createUser();

    expect(() => 作業着手(未着手の資源評価, new Date(), user)).toThrow(expectError);
  });

  it("認証済みの主担当者のみが作業着手できる", () => {
    const 未着手の資源評価 = create資源評価(create資源情報(資源名s.マイワシ太平洋));
    const 認証済み主担当者 = to認証済評価担当者(
      create評価担当者("user-1", "認証済主担当", "test@example.com", { [資源名s.マイワシ太平洋]: ロールs.主担当 })
    );

    expect(() => 作業着手(未着手の資源評価, new Date(), 認証済み主担当者)).not.toThrow();
  });
});
