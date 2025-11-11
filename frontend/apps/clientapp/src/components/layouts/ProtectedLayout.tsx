import { ReactNode } from "react";
import { MainLayout } from "./MainLayout.tsx/MainLayout";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <MainLayout>{children}</MainLayout>;
}
