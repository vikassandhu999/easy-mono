import {Button} from './button';
import {useOnline} from './connection-status';

export function CachedRead({
  updatedAt,
  failed,
  refreshing,
  refresh,
}: {
  updatedAt: number;
  failed: boolean;
  refreshing: boolean;
  refresh: () => Promise<unknown>;
}) {
  const online = useOnline();
  if (online && !failed) {
    return null;
  }
  return (
    <div className="mb-6 space-y-2 text-sm text-muted-foreground">
      <p role={failed && online ? 'alert' : 'status'}>
        Showing the copy from {new Date(updatedAt).toLocaleString()}.{' '}
        {online
          ? 'The latest version could not be checked.'
          : 'Changes from your coach will appear when you reconnect.'}
      </p>
      {online && (
        <Button
          variant="outline"
          isPending={refreshing}
          onPress={() => {
            refresh();
          }}
        >
          Check for updates
        </Button>
      )}
    </div>
  );
}
