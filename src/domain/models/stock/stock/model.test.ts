import { 資源名s, 資源タイプs } from "@/domain/constants";
import { create資源情報 } from "@/domain/helpers";
import { describe, it, expect } from "vitest";

describe("資源情報", () => {
  it("期待通りの情報を保持している", () => {
    const maiwashiPacific = create資源情報(資源名s.マイワシ太平洋);

    expect(maiwashiPacific.呼称).toBe("マイワシ");
    expect(maiwashiPacific.系群名).toBe("太平洋系群");
    expect(maiwashiPacific.資源タイプ).toBe(資源タイプs["1系"]);
  });
});
