import { BookOpen, LogOut, Settings, Sheet, Users } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  path: string;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  showInMobile?: boolean;
  isDisabled?: boolean;
};

export type UtilityItem = {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isLogout?: boolean;
  isDisabled?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    icon: Users,
    label: "Clients",
    path: "/clients",
    shortLabel: "Clients",
    showInMobile: true,
  },
  {
    icon: BookOpen,
    label: "Library",
    path: "/library",
    shortLabel: "Library",
    showInMobile: true,
  },
  {
    icon: Sheet,
    label: "My Page",
    path: "/page",
    shortLabel: "Page",
    showInMobile: true,
  },
];

export const UTILITY_ITEMS: UtilityItem[] = [
  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
  },
  {
    icon: LogOut,
    isLogout: true,
    label: "Logout",
    path: "#",
  },
];
