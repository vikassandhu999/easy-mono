import {Button, Card} from '@heroui/react';
import {AlertCircle, ArrowLeft} from 'lucide-react';
import {type FormEvent, type ReactNode, useState} from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';

type HeaderProps = {
  breadcrumb: string;
  description?: string;
  title: string;
};

type StateProps = {
  hasPendingChanges?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
};

type ActionsProps = {
  deleteLabel?: string;
  entityName?: string;
  isDeleting?: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onDelete?: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
};

type FormPageShellProps = {
  actions: ActionsProps;
  children: ReactNode;
  formError: null | string;
  header: HeaderProps;
  state: StateProps;
};

export default function FormPageShell({actions, children, formError, header, state}: FormPageShellProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const {breadcrumb, description, title} = header;
  const {hasPendingChanges = false, isError = false, isLoading = false, onRetry} = state;
  const {
    deleteLabel = 'Delete',
    entityName,
    isDeleting = false,
    isSubmitting,
    onBack,
    onDelete,
    onSubmit,
    submitLabel,
  } = actions;

  if (isLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">Could not load data</p>
          <p className="text-sm text-muted">Please retry. If this continues, check API connectivity.</p>
          <div className="flex gap-2">
            {onRetry ? (
              <Button
                className="min-h-11"
                onPress={onRetry}
                size="md"
                variant="outline"
              >
                Retry
              </Button>
            ) : null}
            <Button
              className="min-h-11"
              onPress={onBack}
              size="md"
              variant="ghost"
            >
              Back
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const handleBack = () => {
    if (hasPendingChanges) {
      setIsLeaveOpen(true);
    } else {
      onBack();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Button
          className="min-h-11 w-fit gap-2 px-2"
          onPress={handleBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{breadcrumb}</span>
        </Button>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={onSubmit}
      >
        {children}

        {formError ? (
          <div className="flex items-start gap-2 rounded-lg border border-separator bg-surface-secondary p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <p className="text-sm text-foreground">{formError}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-separator pt-4 sm:flex-row sm:justify-end">
          <Button
            className="min-h-11 w-full sm:order-last sm:w-auto"
            isDisabled={isSubmitting}
            size="md"
            type="submit"
            variant="primary"
          >
            {isSubmitting ? (submitLabel.startsWith('Save') ? 'Saving...' : 'Creating...') : submitLabel}
          </Button>
          <Button
            className="min-h-11 w-full sm:w-auto"
            onPress={handleBack}
            size="md"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          {onDelete ? (
            <Button
              className="min-h-11 w-full sm:order-first sm:mr-auto sm:w-auto"
              onPress={() => setIsDeleteOpen(true)}
              size="md"
              type="button"
              variant="danger"
            >
              {deleteLabel}
            </Button>
          ) : null}
        </div>
      </form>

      {onDelete ? (
        <ConfirmDialog
          confirmLabel={deleteLabel}
          description={`Are you sure you want to delete ${entityName ?? 'this item'}? This cannot be undone.`}
          isLoading={isDeleting}
          isOpen={isDeleteOpen}
          onConfirm={onDelete}
          onOpenChange={setIsDeleteOpen}
          title={deleteLabel}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Leave"
        confirmVariant="primary"
        description="You have unsaved changes. Leave without saving?"
        isOpen={isLeaveOpen}
        onConfirm={() => {
          setIsLeaveOpen(false);
          onBack();
        }}
        onOpenChange={setIsLeaveOpen}
        title="Unsaved changes"
      />
    </div>
  );
}
