import { IconApple, IconBarbell, IconCalendarEvent } from '@tabler/icons-react';

interface KindIconProps {
  kind?: string;
  size?: number;
}

/**
 * Returns the appropriate Tabler icon component for a schedule item kind.
 * Defaults to a calendar icon when kind is unknown.
 */
export function KindIcon({ kind, size = 16 }: KindIconProps) {
  switch (kind) {
    case 'training':
      return <IconBarbell size={size} />;
    case 'nutrition':
      return <IconApple size={size} />;
    default:
      return <IconCalendarEvent size={size} />;
  }
}
