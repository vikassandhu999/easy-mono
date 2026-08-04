import {Button} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ArrowLeft} from 'lucide-react';

import {AS_TEXT, NO_GAP} from '@/@components/ua-defaults';

// The one back affordance for every Page header (forms, details, lists). Lives
// inside Page.TitleGroup next to the title. Replaces the ArrowLeft 16/18/20 +
// icon-vs-text + Toolbar-vs-TitleGroup drift across the app.
//
// The redesign draws it as a bordered surface tile — 38px square, 11px radius —
// on all 18 frames that carry a back arrow, so the treatment lives here rather
// than per screen. Mobile keeps the 44px touch target (AGENTS.md UI Rules); the
// design's 38px applies from `sm` up, which is the width the frames specify.

export function BackButton({
  className,
  label = 'Back',
  onPress,
  testId,
}: {
  className?: string;
  label?: string;
  onPress: () => void;
  testId?: string;
}) {
  return (
    <Button
      aria-label={label}
      className={cn(
        // The title gap lives here, not as `gap` on 36 header rows: the button is
        // always followed by a title, and margin travels with it (and disappears
        // with `lg:hidden`). Containers must NOT also set `gap` — they stack.
        'me-3 rounded-control border border-border bg-surface p-0 text-foreground',
        AS_TEXT,
        NO_GAP,
        'sm:size-9.5   sm:p-0',
        className,
      )}
      data-testid={testId}
      isIconOnly
      onPress={onPress}
      size="md"
      variant="ghost"
    >
      <ArrowLeft size={20} />
    </Button>
  );
}
