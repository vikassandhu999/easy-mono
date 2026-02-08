import {
  IconBuilding,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconCreditCard,
  IconExternalLink,
  IconShare,
  IconUser,
} from "@tabler/icons-react";
import { FC, useState } from "react";
import { Link } from "react-router";

import { Avatar, Button, Spinner } from "@heroui/react";

import PageContentWrapper from "@/components/PageContentWrapper";
import PageWrapper from "@/components/PageWrapper";
import { DRAWER_KEYS } from "@/configs";
import { useAuthActions } from "@/hooks/useAuthActions";
import useParamsDrawer from "@/hooks/useParamDrawer";
import { useGetMyCoachQuery } from "@/services/coach";
import { useGetBusinessSettingsQuery } from "@/services/settings/settings";
import { selectUser } from "@/slices/authSlice";
import { useAppSelector } from "@/store";
import { notifyInfo, notifySuccess } from "@/utils/notification";

import { LEGAL_LINKS, LegalLink } from "../config/ui";

export default function SettingsPage() {
  const { logout } = useAuthActions();
  const { openDrawer } = useParamsDrawer({});
  const user = useAppSelector(selectUser);
  const { data: coach, isLoading: coachLoading } = useGetMyCoachQuery();
  const { data: settings } = useGetBusinessSettingsQuery();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleSettingClick = (id: string) => {
    switch (id) {
      case "profile":
        openDrawer(DRAWER_KEYS.COACH_PROFILE_VIEW);
        break;
      case "business":
        openDrawer(DRAWER_KEYS.BUSINESS_EDIT);
        break;
      default:
        notifyInfo("This feature is coming soon!", { title: "Coming Soon" });
        break;
    }
  };

  if (coachLoading) {
    return (
      <PageWrapper>
        <PageContentWrapper>
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        </PageContentWrapper>
      </PageWrapper>
    );
  }

  const displayName =
    coach?.name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
  const displayEmail = user?.email ?? "";
  const initials = getInitials(displayName);

  return (
    <PageWrapper>
      <PageContentWrapper>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <Avatar.Fallback className="bg-blue-100 text-blue-700 font-semibold">
                {initials}
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-lg font-semibold text-foreground truncate">
                {displayName}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-default-500 truncate">
                  {displayEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Share Page Card */}
          {settings?.public_join_url && (
            <SharePageCard joinUrl={settings.public_join_url} />
          )}

          {/* Settings List */}
          <SettingsList onItemClick={handleSettingClick} />

          {/* Logout */}
          {showLogoutConfirm ? (
            <div className="flex flex-col gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4">
              <p className="text-sm text-danger-700 font-medium">
                Are you sure you want to logout?
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-danger-600 text-white"
                  onPress={confirmLogout}
                  size="sm"
                >
                  Logout
                </Button>
                <Button
                  className="flex-1"
                  onPress={() => setShowLogoutConfirm(false)}
                  size="sm"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="w-full rounded-xl border border-danger-300 bg-transparent px-4 py-3 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-50 active:bg-danger-100"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          )}

          <hr className="border-default-200" />

          {/* Legal Links */}
          <LegalLinks links={LEGAL_LINKS} />
        </div>
      </PageContentWrapper>
    </PageWrapper>
  );
}

/* ---- Helpers ---- */

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 0 || !parts[0]) return "";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  const firstInitial = parts[0]?.[0] ?? "";
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return (firstInitial + lastInitial).toUpperCase();
}

/* ---- Sub-components ---- */

const SETTINGS_ITEMS = [
  {
    id: "profile",
    label: "My Profile",
    icon: IconUser,
    color: "text-blue-600 bg-blue-100",
  },
  {
    id: "business",
    label: "Business Profile",
    icon: IconBuilding,
    color: "text-green-600 bg-green-100",
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: IconCreditCard,
    color: "text-violet-600 bg-violet-100",
  },
];

const SettingsList: FC<{ onItemClick: (id: string) => void }> = ({
  onItemClick,
}) => {
  return (
    <div className="rounded-xl border border-default-200 bg-white overflow-hidden">
      {SETTINGS_ITEMS.map((item, index) => (
        <button
          className="flex w-full items-center justify-between px-4 py-3.5 bg-transparent border-none cursor-pointer transition-colors hover:bg-default-100 active:bg-default-200 text-left"
          key={item.id}
          onClick={() => onItemClick(item.id)}
          style={{
            borderBottom:
              index < SETTINGS_ITEMS.length - 1
                ? "1px solid var(--heroui-default-200, #e4e4e7)"
                : "none",
          }}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}
            >
              <item.icon size={16} />
            </div>
            <span className="text-sm font-medium text-foreground">
              {item.label}
            </span>
          </div>
          <IconChevronRight className="text-default-400" size={16} />
        </button>
      ))}
    </div>
  );
};

const SharePageCard: FC<{ joinUrl: string }> = ({ joinUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      notifySuccess("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silent fail
    }
  };

  const handleOpen = () => {
    window.open(joinUrl, "_blank");
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <IconShare className="text-white" size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Share Your Page</p>
            <p className="text-xs text-white/70">Invite clients to join</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-white transition-colors hover:bg-white/20"
            onClick={handleCopy}
            type="button"
          >
            {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-white transition-colors hover:bg-white/20"
            onClick={handleOpen}
            type="button"
          >
            <IconExternalLink size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LegalLinks: FC<{ links: LegalLink[] }> = ({ links }) => {
  return (
    <div className="flex flex-wrap gap-3 py-2">
      {links.map(({ id, label, link }) => (
        <Link
          className="text-xs font-medium uppercase tracking-wide text-default-400 no-underline transition-colors hover:text-default-600"
          key={id}
          to={link}
        >
          {label}
        </Link>
      ))}
    </div>
  );
};
