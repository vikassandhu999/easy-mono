import {Button} from './button';
import {useOnline} from './connection-status';
import {FormError} from './form-error';

export function ReadState({failed, label, retry}: {failed: boolean; label: string; retry: () => void}) {
  const online = useOnline();
  return failed ? (
    <div className="space-y-3">
      <FormError message={`We couldn't load ${label}. Your saved drafts are still on this device.`} />
      <Button
        variant="outline"
        onPress={retry}
      >
        Try again
      </Button>
    </div>
  ) : (
    <p
      role="status"
      className="py-4 text-muted-foreground"
    >
      {online ? `Loading ${label}…` : `Reconnect to load ${label}. A saved copy is not available on this device.`}
    </p>
  );
}
