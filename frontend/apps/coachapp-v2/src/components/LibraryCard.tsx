import type {ReactNode} from 'react';

import {Card} from '@heroui/react';

type LibraryCardProps = {
  badge?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  onPress: () => void;
  subtitle: string;
  title: string;
};

export default function LibraryCard({badge, children, icon, onPress, subtitle, title}: LibraryCardProps) {
  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={onPress}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
              {icon}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">{title}</span>
              <span className="truncate text-sm text-muted">{subtitle}</span>
            </div>
          </div>
          {badge ?? null}
        </div>

        {children}
      </div>
    </Card>
  );
}
