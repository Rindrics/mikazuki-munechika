import type { ユーザー情報 } from "@/domain/repositories";
import type { FiscalYearInfo } from "./actions";

export type Tab = "fiscal-year" | "users";

export interface FiscalYearData {
  fiscalYears: FiscalYearInfo[];
  currentYear: number | null;
}

export interface UsersData {
  users: ユーザー情報[];
  stockGroups: Array<{ id: string; name: string }>;
}
