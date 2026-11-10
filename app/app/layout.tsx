import type { ReactNode } from "react";
import AppShell from "@/components/app/AppShell";

// every /app page sits beside the history sidebar
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
