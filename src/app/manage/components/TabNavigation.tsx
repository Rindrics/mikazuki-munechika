"use client";

import { useRouter } from "next/navigation";
import type { Tab } from "../types";

interface TabNavigationProps {
  currentTab: Tab;
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "fiscal-year", label: "年度管理" },
  { id: "users", label: "ユーザー管理" },
];

export function TabNavigation({ currentTab }: TabNavigationProps) {
  const router = useRouter();

  return (
    <div className="flex border-b mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() =>
            router.push(tab.id === "fiscal-year" ? "/manage" : `/manage?tab=${tab.id}`)
          }
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            currentTab === tab.id
              ? "border-primary text-primary font-medium"
              : "border-transparent text-secondary hover:text-primary hover:border-primary/50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
