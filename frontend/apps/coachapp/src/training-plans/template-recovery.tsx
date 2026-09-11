import {useState} from 'react';
import {errorMessage} from '../api/client';
import {type TrainingPlan, useTrainingPlan, useTrainingTemplates} from '../api/training-plans';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';

export function TemplateRecovery({
  name,
  onUse,
  onClose,
}: {
  name: string;
  onUse: (plan: TrainingPlan) => void;
  onClose: () => void;
}) {
  const templates = useTrainingTemplates({search: name.trim()});
  const [selected, setSelected] = useState('');
  const detail = useTrainingPlan(selected);
  const plan = detail.data?.data;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Check training plans</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p className="text-sm text-muted-foreground">
          Your worksheet stays here. If the interrupted save created an empty template, choose it to continue saving
          this draft.
        </p>
        {selected ? (
          <>
            {detail.isError ? (
              <>
                <FormError message={errorMessage(detail.error, "We couldn't check this template.")} />
                <Button
                  onPress={() => {
                    detail.refetch();
                  }}
                  isPending={detail.isFetching}
                >
                  Try again
                </Button>
              </>
            ) : !plan || !detail.isFetchedAfterMount || detail.isFetching ? (
              <p role="status">Checking saved template…</p>
            ) : (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <h3 className="break-words font-semibold">{plan.name}</h3>
                {plan.description && <p className="break-words text-sm text-muted-foreground">{plan.description}</p>}
                {plan.kind === 'template' && plan.status === 'active' && plan.workout_count === 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      This template has no saved workouts. Your current workout draft will be saved to it when you
                      choose Save plan.
                    </p>
                    <Button onPress={() => onUse(plan)}>Use for this draft</Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This template already has workouts or is no longer active. Choose the empty template from the
                    interrupted save.
                  </p>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              onPress={() => setSelected('')}
            >
              Back to results
            </Button>
          </>
        ) : (
          <InfiniteList
            query={templates}
            label="matching templates"
            singular="matching template"
            empty={
              <p className="text-sm text-muted-foreground">
                No saved template found with this name. Return to your draft to retry Save plan.
              </p>
            }
          >
            {(template) => (
              <div className="space-y-2 p-4">
                <p className="break-words font-semibold">{template.name}</p>
                {template.description && (
                  <p className="break-words text-sm text-muted-foreground">{template.description}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {template.workout_count} {template.workout_count === 1 ? 'workout' : 'workouts'}
                </p>
                <Button
                  variant="outline"
                  onPress={() => setSelected(template.id)}
                >
                  Check this template
                </Button>
              </div>
            )}
          </InfiniteList>
        )}
      </div>
      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Return to draft
        </Button>
      </div>
    </Dialog>
  );
}
