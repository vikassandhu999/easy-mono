import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';

// The one back affordance for every Page header (forms, details, lists). Lives
// inside Page.TitleGroup next to the title. Replaces the ArrowLeft 16/18/20 +
// icon-vs-text + Toolbar-vs-TitleGroup drift across the app.

export function BackButton({
  className,
  label = 'Back',
  onPress,
}: {
  className?: string;
  label?: string;
  onPress: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className={className}
      isIconOnly
      onPress={onPress}
      size="md"
      variant="ghost"
    >
      <ArrowLeft size={20} />
    </Button>
  );
}
