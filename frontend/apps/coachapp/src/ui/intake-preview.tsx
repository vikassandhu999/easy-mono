import {FileText, X} from 'lucide-react';
import type {FormTemplate} from '../api/forms';
import {Button} from './button';
import {Dialog, DialogClose, DialogHeader, DialogTitle, DialogTrigger} from './dialog';
import {Surface} from './page';

export function IntakePreview({template}: {template: FormTemplate}) {
  return (
    <Surface>
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
          <FileText
            size={20}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <h2 className="section-title break-words">{template.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.question_count} {template.question_count === 1 ? 'question' : 'questions'}
          </p>
        </div>
      </div>
      <DialogTrigger>
        <Button
          variant="outline"
          className="mt-5 w-full"
        >
          Preview intake
        </Button>
        <Dialog showCloseButton={false}>
          <DialogHeader>
            <div className="min-w-0">
              <DialogTitle>{template.name}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Your client answers these questions in their app.</p>
            </div>
            <DialogClose
              aria-label="Close preview"
              size="icon-sm"
            >
              <X aria-hidden="true" />
            </DialogClose>
          </DialogHeader>
          <div
            role="region"
            aria-label="Intake questions"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: The scroll region needs focus for keyboard scrolling.
            tabIndex={0}
            className="dialog-body space-y-8"
          >
            {template.sections.map((section, index) => (
              <section key={section.questions.map((question) => question.id).join(':') || `empty-${index}`}>
                {section.title && <h3 className="mb-4 text-base font-semibold">{section.title}</h3>}
                <ol className="space-y-5">
                  {section.questions.map((question) => (
                    <li
                      key={question.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <p className="break-words text-sm font-medium leading-relaxed">{question.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {question.required ? 'Required' : 'Optional'}
                        {question.type === 'service_type' ? ' · Training, Nutrition, or both' : ''}
                      </p>
                      {'options' in question && question.options && question.options.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {question.options.map((option) => (
                            <li
                              key={option}
                              className="rounded-lg bg-muted px-2.5 py-1.5 text-sm text-muted-foreground"
                            >
                              {option}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </Dialog>
      </DialogTrigger>
    </Surface>
  );
}
