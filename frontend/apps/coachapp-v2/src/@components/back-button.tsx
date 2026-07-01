import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';

// The one back affordance for every Page header (forms, details, lists). Lives
// inside Page.TitleGroup next to the title. Replaces the ArrowLeft 16/18/20 +
// icon-vs-text + Toolbar-vs-TitleGroup drift across the app.

export function BackButton({label = 'Back', onPress}: {label?: string; onPress: () => void}) {
  return (
    <Button
      aria-label={label}
      isIconOnly
      onPress={onPress}
      size="md"
      variant="ghost"
    >
      <ArrowLeft size={20} />
    </Button>
  );
}
