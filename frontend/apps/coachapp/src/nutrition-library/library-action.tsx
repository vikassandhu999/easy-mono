import {useEffect, useRef, useState} from 'react';
import {ApiError, errorMessage} from '../api/client';
import {
  type LibraryKind,
  useCopyLibraryItem,
  useDeleteLibraryItem,
  useLibraryCopyCandidates,
} from '../api/nutrition-library';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';

export function LibraryAction({
  action,
  resource,
  item,
  onClose,
  onBusy,
  onCopied,
  onDeleted,
}: {
  action: 'copy' | 'delete';
  resource: LibraryKind;
  item: {id: string; name: string};
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onCopied: (id: string) => void;
  onDeleted: () => void;
}) {
  const copy = useCopyLibraryItem(resource);
  const remove = useDeleteLibraryItem(resource);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  const inUse = remove.error instanceof ApiError && remove.error.code === 'in_use';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (error && !pending) {
      errorRef.current?.focus();
    }
  }, [error, pending]);
  async function submit() {
    if (pending || uncertain || inUse) {
      return;
    }
    setPending(true);
    onBusy(true);
    setError('');
    try {
      if (action === 'copy') {
        const result = await copy.mutateAsync(item.id);
        if (mounted.current) {
          onCopied(result.data.id);
        }
      } else {
        await remove.mutateAsync(item.id);
        if (mounted.current) {
          onDeleted();
        }
      }
    } catch (failure) {
      if (mounted.current) {
        if (action === 'copy' && (!(failure instanceof ApiError) || failure.status >= 500)) {
          setUncertain(true);
          setError('The copy could not be confirmed. Review saved items below before creating another copy.');
        } else {
          setError(
            failure instanceof ApiError && failure.code === 'in_use'
              ? 'This item is now in use. Return to its usage list to see what needs updating.'
              : errorMessage(failure, `Could not ${action} this ${resource}. Please try again.`),
          );
        }
      }
    } finally {
      if (mounted.current) {
        setPending(false);
        onBusy(false);
      }
    }
  }
  return (
    <Dialog
      isOpen
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
      showCloseButton={!pending}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{action === 'copy' ? `Copy ${resource}` : `Delete ${resource}?`}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        <p className="break-words font-semibold">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {action === 'copy'
            ? 'Start with its saved details, then rename and customize an independent copy. Recipes and plans using the original stay the same.'
            : `This permanently removes the ${resource} from your library. Previously logged nutrition is kept.`}
        </p>
        <div
          ref={errorRef}
          tabIndex={-1}
        >
          <FormError message={error} />
        </div>
        {uncertain && (
          <CopyRecovery
            resource={resource}
            item={item}
            onUse={onCopied}
            onRetry={() => {
              setUncertain(false);
              setError('');
            }}
          />
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={onClose}
          >
            {inUse ? 'Review usage' : 'Cancel'}
          </Button>
          {!uncertain && (
            <Button
              variant={action === 'copy' ? 'default' : 'destructive'}
              isPending={pending}
              isDisabled={inUse}
              onPress={submit}
            >
              {action === 'copy' ? 'Create copy' : `Delete ${resource}`}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function CopyRecovery({
  resource,
  item,
  onUse,
  onRetry,
}: {
  resource: LibraryKind;
  item: {id: string; name: string};
  onUse: (id: string) => void;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState(item.name.slice(0, 100));
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  const query = useLibraryCopyCandidates(resource, debounced);
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label
          htmlFor="copy-search"
          className="text-sm font-medium"
        >
          Search saved {resource === 'food' ? 'foods' : 'recipes'}
        </label>
        <Input
          id="copy-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <InfiniteList
        query={query}
        label="matching items"
        singular="matching item"
        empty={<p>No matching saved items.</p>}
      >
        {(saved) => (
          <div className="space-y-2 p-4">
            <p className="break-words font-semibold">{saved.name}</p>
            <p className="text-sm text-muted-foreground">
              {saved.id === item.id ? 'Original item · ' : ''}Created {new Date(saved.inserted_at).toLocaleString()}
            </p>
            <Button
              variant="outline"
              onPress={() => onUse(saved.id)}
            >
              Open saved {resource}
            </Button>
          </div>
        )}
      </InfiniteList>
      {query.isSuccess && !query.isFetching && !query.hasNextPage && debounced === search.trim() && (
        <Button
          variant="outline"
          onPress={onRetry}
        >
          Create a separate copy
        </Button>
      )}
    </div>
  );
}
