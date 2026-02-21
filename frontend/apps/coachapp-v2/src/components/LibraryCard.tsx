import type {ReactNode} from 'react';

import {Card} from '@heroui/react';

type LibraryCardMeta = {
  actions?: ReactNode;
  badge?: ReactNode;
  date?: string;
  hint: string;
};

type LibraryCardProps = {
  children: ReactNode;
  icon: ReactNode;
  meta: LibraryCardMeta;
  onPress: () => void;
  subtitle: string;
  title: string;
};

export default function LibraryCard({children, icon, meta, onPress, subtitle, title}: LibraryCardProps) {
  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={onPress}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
              {icon}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">{title}</span>
              <span className="truncate text-sm text-muted">{subtitle}</span>
            </div>
          </div>
          {meta.badge ?? null}
        </div>

        {children}

        <div className="mt-auto flex items-center justify-between border-t border-separator pt-3">
          {meta.actions ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="toolbar"
            >
              {meta.actions}
            </div>
          ) : meta.date ? (
            <span className="text-sm text-muted">{meta.date}</span>
          ) : null}
          <span className="text-xs text-muted">{meta.hint}</span>
        </div>
      </div>
    </Card>
  );
}
