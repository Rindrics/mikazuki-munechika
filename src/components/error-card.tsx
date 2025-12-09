import { ReactNode } from "react";

interface ErrorCardProps {
  title: string;
  children: ReactNode;
}

export default function ErrorCard({ title, children }: ErrorCardProps) {
  return (
    <div className="border border-danger rounded-lg p-6 bg-danger-light dark:bg-danger-hover dark:border-danger-dark dark:text-foreground-dark">
      <h2 className="text-danger-dark font-bold mb-2">{title}</h2>
      <div className="text-danger-dark">{children}</div>
    </div>
  );
}
