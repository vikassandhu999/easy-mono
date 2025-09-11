import { Icon } from "@phosphor-icons/react";

export type NavItemScreen = "sm" | "md" | "lg" | "all";

export interface NavItem {
  icon: Icon;
  label: string;
  href: string;
  badge?: string | number;
  screens?: string[]; // for all screen you can pass 'all' or leave it undefined
}
