import {useCallback, useEffect, useRef, useState} from 'react';
import {
  generatePath,
  Link,
  useBeforeUnload,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {type LibraryKind, type LibraryUsageReference, type UsageKind, useLibraryUsage} from '../api/nutrition-library';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {LibraryAction} from './library-action';

export function LibraryManagement({resource}: {resource: LibraryKind}) {
  const {id = ''} = useParams();
  return (
    <Management
      key={`${resource}:${id}`}
      resource={resource}
      id={id}
    />
  );
}

function Management({resource, id}: {resource: LibraryKind; id: string}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const list = useListLocation(resource === 'food' ? routes.foods : routes.recipes);
  const selected = params.get('kind');
  const kind: UsageKind =
    selected === 'client_plans' || selected === 'templates' ? selected : resource === 'food' ? 'recipes' : 'templates';
  const query = useLibraryUsage(resource, id, kind, params.get('search')?.trim() ?? '');
  const page = query.data?.pages.at(-1);
  const [lastPage, setLastPage] = useState(page);
  if (page && page !== lastPage) {
    setLastPage(page);
  }
  const current = page ?? lastPage;
  const [action, setAction] = useState<'copy' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const leaving = useRef(false);
  const blocker = useBlocker(
    ({currentLocation, nextLocation}) => !leaving.current && busy && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (busy) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [busy],
    ),
  );
  const editor = resource === 'food' ? routes.food : routes.recipe;
  const unavailable = !page || query.isError || query.isFetching || busy;
  const reason = current?.delete_blocked_reason;
  return (
    <Page>
      <PageHeader
        title={current?.item.name ?? `Manage ${resource}`}
        description={`Manage this ${resource}'s uses and saved details.`}
        back={{to: generatePath(editor, {id}), label: `Back to ${resource}`, state: list.state}}
        actions={
          <Button
            variant="outline"
            isDisabled={unavailable}
            onPress={() => setAction('copy')}
          >
            Copy {resource}
          </Button>
        }
      />
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="section-title">Where it's used</h2>
          <p className="text-sm text-muted-foreground">
            Open a recipe or plan to make changes. Archived plans are included.
            {resource === 'food' ? ' Foods inside recipes appear under Recipes; open the recipe to see its plans.' : ''}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              id="usage-kind-label"
              htmlFor="usage-kind"
              className="text-sm font-medium"
            >
              Show uses in
            </label>
            <SelectField
              id="usage-kind"
              value={kind}
              isDisabled={busy}
              onChange={(value) =>
                setParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    next.set('kind', value);
                    next.delete('search');
                    return next;
                  },
                  {state: location.state},
                )
              }
            >
              {resource === 'food' && (
                <SelectItem id="recipes">{`Recipes${current ? ` (${current.counts.recipes})` : ''}`}</SelectItem>
              )}
              <SelectItem id="templates">{`Plan templates${current ? ` (${current.counts.templates})` : ''}`}</SelectItem>
              <SelectItem id="client_plans">{`Client plans${current ? ` (${current.counts.client_plans})` : ''}`}</SelectItem>
            </SelectField>
          </div>
          <ListSearch label="Search uses" />
        </div>
        <InfiniteList
          query={query}
          label="uses"
          singular="use"
          empty={
            <Surface>
              <p>{params.get('search') ? 'No matching uses. Try another name.' : 'No uses in this category.'}</p>
            </Surface>
          }
        >
          {(reference) => (
            <UsageLink
              reference={reference}
              returnTo={location.pathname + location.search}
              returnLabel={`Back to ${resource} usage`}
              returnListSearch={list.state.listSearch}
            />
          )}
        </InfiniteList>
        {current && (
          <Surface className="space-y-3">
            <h2 className="section-title">Remove from library</h2>
            <p className="text-sm text-muted-foreground">
              {reason === 'shared_food'
                ? 'Shared foods belong to the common library. Make a copy to create your own version.'
                : reason === 'in_use'
                  ? 'This item is still in use. Remove or replace it in recipes and plans first. Another coach or the business owner may need to update uses you cannot access.'
                  : `Permanently delete this ${resource}. Previously logged nutrition is kept.`}
            </p>
            <Button
              variant="outline"
              isDisabled={unavailable || reason !== null}
              onPress={() => setAction('delete')}
            >
              Delete {resource}
            </Button>
          </Surface>
        )}
      </div>
      {action && current && (
        <LibraryAction
          action={action}
          resource={resource}
          item={current.item}
          onClose={() => setAction(null)}
          onBusy={setBusy}
          onCopied={(savedId) => {
            leaving.current = true;
            navigate(generatePath(editor, {id: savedId}), {state: list.state});
          }}
          onDeleted={() => {
            leaving.current = true;
            navigate(list.to, {replace: true, state: {...list.state, deleted: current.item.name}});
          }}
        />
      )}
    </Page>
  );
}

function UsageLink({
  reference,
  returnTo,
  returnLabel,
  returnListSearch,
}: {
  reference: LibraryUsageReference;
  returnTo: string;
  returnLabel: string;
  returnListSearch: string;
}) {
  const to =
    reference.kind === 'recipe'
      ? generatePath(routes.recipe, {id: reference.id})
      : reference.kind === 'template'
        ? generatePath(routes.editNutritionPlan, {id: reference.id})
        : reference.client_id
          ? generatePath(routes.editClientNutritionPlan, {id: reference.id, clientId: reference.client_id})
          : null;
  const content = (
    <>
      <p className="break-words font-semibold">{reference.name}</p>
      <p className="text-sm text-muted-foreground">
        {reference.kind === 'recipe'
          ? 'Recipe'
          : reference.kind === 'template'
            ? 'Reusable plan template'
            : 'Assigned client plan'}
      </p>
    </>
  );
  return to ? (
    <Link
      className="block space-y-1 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
      to={to}
      state={{returnTo, returnLabel, returnListSearch}}
    >
      {content}
    </Link>
  ) : (
    <div className="space-y-1 px-5 py-4">{content}</div>
  );
}
