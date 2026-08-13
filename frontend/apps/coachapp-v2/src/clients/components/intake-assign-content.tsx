/**
 * Picker body for assigning an intake form. One step: search, pick, assign.
 * Intake has no schedule — unlike PlanAssignContent.
 */
import {Button, SearchField, Typography, toast} from '@heroui/react';
import {ClipboardList, Plus, X} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {BrowseRow} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import {useCreateClientFormAssignmentMutation, useListFormTemplatesQuery} from '@/api/checkins';

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

function questionCount(sections: {questions?: unknown[]}[] | null | undefined): number {
  return (sections ?? []).reduce(
    (sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0),
    0,
  );
}

export default function IntakeAssignContent({clientId, clientName, onClose}: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const query = useListFormTemplatesQuery();
  const assign = useCreateClientFormAssignmentMutation();

  const items = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return (query.data?.data ?? []).filter(
      (template) =>
        template.purpose === 'intake' &&
        template.status === 'active' &&
        (!needle || template.name.toLowerCase().includes(needle)),
    );
  }, [deferredSearch, query.data?.data]);

  const handlePick = async (templateId: string, name: string) => {
    try {
      await assign.mutateAsync({body: {form_template_id: templateId}, clientId});
      toast.success(`"${name}" assigned to ${clientName}`);
      onClose();
    } catch (error) {
      toastMutationError(error, "The intake form wasn't assigned. Try again.");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          Assign intake
        </Typography>
        <Button
          aria-label="Close"
          className="text-muted hover:text-foreground"
          isIconOnly
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="space-y-3">
        <Typography
          color="muted"
          type="body-xs"
        >
          {clientName} will fill this in their app.
        </Typography>
        <div className="sticky top-0 z-10 bg-surface pb-1">
          <SearchField
            aria-label="Search intake forms"
            onChange={setSearch}
            value={search}
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search intake forms…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        <BrowseListBox
          ariaLabel="Intake forms"
          className="max-h-72 gap-0 overflow-y-auto p-0"
          emptyState={
            <ListEmptyState
              createLabel="Create form"
              createRoute={ROUTES.CREATE_CHECKIN}
              emptyDescription="Build an intake form before assigning it to a client."
              hasFilter={deferredSearch.trim().length > 0}
              nounPlural="intake forms"
              onClearFilters={() => setSearch('')}
            />
          }
          fetchNextPage={() => undefined}
          isError={query.isError}
          isLoading={query.isLoading}
          items={items}
          onAction={(key) => {
            const template = items.find((item) => item.id === String(key));
            if (template) {
              handlePick(template.id, template.name).catch(() => undefined);
            }
          }}
          onRetry={() => {
            query.refetch().catch(() => undefined);
          }}
          renderItem={(template) => {
            const count = questionCount(template.sections);
            return (
              <BrowseRow
                icon={<ClipboardList size={16} />}
                iconClassName="bg-accent-soft text-accent"
                id={template.id}
                meta={`${count} question${count === 1 ? '' : 's'}`}
                textValue={template.name}
                title={template.name}
              />
            );
          }}
        />

        <Button
          className="h-auto w-full justify-start gap-2 p-2"
          onPress={() => navigate(ROUTES.CREATE_CHECKIN)}
          variant="outline"
        >
          <span className="grid size-6 place-items-center rounded-panel bg-accent-soft text-accent">
            <Plus size={14} />
          </span>
          Create a new intake form
        </Button>
      </div>
    </div>
  );
}
