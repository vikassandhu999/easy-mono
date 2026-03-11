import {Button, Card} from '@heroui/react';

type NotFoundCardProps = {
  backLabel: string;
  description?: string;
  onBack: () => void;
  title: string;
};

export default function NotFoundCard({backLabel, description, onBack, title}: NotFoundCardProps) {
  return (
    <Card className="rounded-xl border border-separator bg-surface p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
        <Button
          className="min-h-11"
          onPress={onBack}
          variant="secondary"
        >
          {backLabel}
        </Button>
      </div>
    </Card>
  );
}
