import {ChevronRight, FileText, Plus} from 'lucide-react';
import {useState} from 'react';
import {generatePath, Link, useLocation} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useFormTemplates} from '../api/forms';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {NativeSelect, NativeSelectOption} from '../ui/native-select';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

export function Forms() {
  const query = useFormTemplates();
  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState('all');
  const location = useLocation();
  const notice: unknown = location.state;
  const templates = query.data?.data ?? [];
  const filtered = templates.filter(
    (template) =>
      template.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
      (purpose === 'all' || template.purpose === purpose),
  );
  return (
    <Page>
      <PageHeader
        title="Forms"
        description="Ask the right questions, from the first intake to regular check-ins."
        actions={
          <Link
            to={routes.createForm}
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
        <div className="grid gap-2">
          <label
            htmlFor="form-search"
            className="text-sm font-medium"
          >
            Search forms
          </label>
          <Input
            id="form-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
          />
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="form-purpose-filter"
            className="text-sm font-medium"
          >
            Form purpose
          </label>
          <NativeSelect
            id="form-purpose-filter"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          >
            <NativeSelectOption value="all">All forms</NativeSelectOption>
            <NativeSelectOption value="intake">Intake</NativeSelectOption>
            <NativeSelectOption value="check_in">Check-in</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      {query.isPending ? (
        <Surface>
          <p
            role="status"
            className="py-8 text-muted-foreground"
          >
            Loading forms…
          </p>
        </Surface>
      ) : query.isError ? (
        <Surface className="space-y-4">
          <FormError message={errorMessage(query.error, "We couldn't load your forms. Please try again.")} />
          <Button
            variant="outline"
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Try again
          </Button>
        </Surface>
      ) : filtered.length === 0 ? (
        <Surface className="space-y-2 py-10 text-center">
          <h2 className="section-title">{templates.length ? 'No matching forms' : 'Create your first form'}</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length ? 'Try a different name or purpose.' : 'Prepare an intake or check-in for your clients.'}
          </p>
        </Surface>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {filtered.map((template) => (
              <li key={template.id}>
                <Link
                  to={generatePath(routes.editForm, {id: template.id})}
                  className="flex min-h-24 items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/50 focus-visible:-outline-offset-4"
                >
                  <FileText
                    aria-hidden="true"
                    className="hidden size-5 shrink-0 text-muted-foreground sm:block"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{template.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.purpose === 'intake' ? 'Intake' : 'Check-in'} ·{' '}
                      {template.sections.reduce((count, section) => count + section.questions.length, 0)} questions
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
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        Intake forms welcome a client once. Check-ins help you follow their progress over time.
      </p>
    </Page>
  );
}
