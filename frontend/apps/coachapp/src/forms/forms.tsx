import {ChevronRight, FileText, Plus} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useFormTemplates} from '../api/forms';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {NativeSelect, NativeSelectOption} from '../ui/native-select';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

export function Forms() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search')?.trim() ?? '';
  const selectedPurpose = params.get('purpose');
  const purpose = selectedPurpose === 'intake' || selectedPurpose === 'check_in' ? selectedPurpose : undefined;
  const query = useFormTemplates({search, ...(purpose ? {purpose} : {})});
  const location = useLocation();
  const notice: unknown = location.state;
  return (
    <Page>
      <PageHeader
        title="Forms"
        description="Ask the right questions, from the first intake to regular check-ins."
        actions={
          <Link
            to={routes.createForm}
            state={{listSearch: location.search}}
            className={buttonVariants()}
          >
            <Plus aria-hidden="true" />
            Create form
          </Link>
        }
      />
      {notice !== null && typeof notice === 'object' && 'saved' in notice && typeof notice.saved === 'string' && (
        <p
          role="status"
          className="rounded-xl bg-muted px-4 py-3 text-sm"
        >
          {notice.saved} saved.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <ListSearch label="Search forms" />
        <div className="grid gap-2">
          <label
            htmlFor="form-purpose-filter"
            className="text-sm font-medium"
          >
            Form purpose
          </label>
          <NativeSelect
            id="form-purpose-filter"
            value={purpose ?? 'all'}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value === 'all') {
                next.delete('purpose');
              } else {
                next.set('purpose', event.target.value);
              }
              setParams(next, {preventScrollReset: true});
            }}
          >
            <NativeSelectOption value="all">All forms</NativeSelectOption>
            <NativeSelectOption value="intake">Intake</NativeSelectOption>
            <NativeSelectOption value="check_in">Check-in</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      <InfiniteList
        query={query}
        label="forms"
        singular="form"
        empty={
          <Surface className="space-y-2 py-10 text-center">
            <h2 className="section-title">{search || purpose ? 'No matching forms' : 'Create your first form'}</h2>
            <p className="text-sm text-muted-foreground">
              {search || purpose
                ? 'Try a different name or purpose.'
                : 'Prepare an intake or check-in for your clients.'}
            </p>
          </Surface>
        }
      >
        {(template) => (
          <Link
            to={generatePath(routes.editForm, {id: template.id})}
            state={{listSearch: location.search}}
            className="flex min-h-24 items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <FileText
              aria-hidden="true"
              className="hidden size-5 shrink-0 text-muted-foreground sm:block"
            />
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{template.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {template.purpose === 'intake' ? 'Intake' : 'Check-in'} · {template.question_count}{' '}
                {template.question_count === 1 ? 'question' : 'questions'}
              </p>
              {(template.is_default_intake || template.status === 'archived') && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.status === 'archived' ? (
                    <StatusBadge>Archived</StatusBadge>
                  ) : (
                    template.is_default_intake && <StatusBadge tone="positive">Default intake</StatusBadge>
                  )}
                </div>
              )}
            </div>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        )}
      </InfiniteList>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Intake forms welcome a client once. Check-ins help you follow their progress over time.
      </p>
    </Page>
  );
}
