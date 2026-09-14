import {FileText} from 'lucide-react';
import {useState} from 'react';
import {ApiError, errorMessage} from '../api/client';
import {useFormSubmission} from '../api/forms';
import {Button} from '../ui/button';
import {Dialog, DialogClose, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {SubmissionAnswers} from '../ui/submission-answers';

export function SharedResponse({clientId, id, title}: {clientId: string; id: string; title: string}) {
  const [open, setOpen] = useState(false);
  const query = useFormSubmission(clientId, id, open);
  const response = query.data?.data;
  const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 422);
  return (
    <>
      <Button
        variant="outline"
        className="h-auto max-w-full justify-start py-3 whitespace-normal text-left"
        onPress={() => setOpen(true)}
      >
        <FileText aria-hidden="true" />
        <span className="min-w-0 break-words">
          <span className="block">{title}</span>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">View shared response</span>
        </span>
      </Button>
      <Dialog
        isOpen={open}
        onOpenChange={setOpen}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>{response?.form_assignment.form_template.name || title}</DialogTitle>
        </DialogHeader>
        <div
          className="dialog-body space-y-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          role="region"
          aria-label="Shared form response"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable response region must support keyboard scrolling.
          tabIndex={0}
        >
          {!response ? (
            query.isPending ? (
              <p role="status">Loading response…</p>
            ) : (
              <div className="space-y-3">
                <FormError
                  message={
                    missing
                      ? 'This response is unavailable or you no longer have access to it.'
                      : errorMessage(query.error, 'Could not load this response.')
                  }
                />
                {!missing && (
                  <Button
                    onPress={() => {
                      query.refetch();
                    }}
                  >
                    Retry response
                  </Button>
                )}
              </div>
            )
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Submitted{' '}
                <time dateTime={response.submitted_at}>
                  {new Date(response.submitted_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
                </time>
              </p>
              <SubmissionAnswers submission={response} />
            </>
          )}
          <DialogClose>Back to conversation</DialogClose>
        </div>
      </Dialog>
    </>
  );
}
