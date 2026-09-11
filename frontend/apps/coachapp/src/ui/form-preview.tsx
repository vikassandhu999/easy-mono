import {X} from 'lucide-react';
import {useId} from 'react';
import type {FormTemplateCreate, FormTemplateQuestion} from '../api/forms';
import {Button} from './button';
import {Checkbox} from './checkbox';
import {Dialog, DialogClose, DialogHeader, DialogTitle, DialogTrigger} from './dialog';
import {Input} from './input';
import {SelectItem} from './select';
import {SelectField} from './select-field';
import {Textarea} from './textarea';

function PreviewAnswer({question}: {question: FormTemplateQuestion}) {
  const id = useId();
  const label = question.label.trim() || 'Untitled question';
  const options = 'options' in question ? (question.options ?? []) : [];
  const heading = (
    <span>
      {label}
      {question.required && <span className="ml-1 text-muted-foreground">(required)</span>}
    </span>
  );
  if (question.type === 'multi_select' || question.type === 'service_type') {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{heading}</legend>
        {(question.type === 'service_type' ? ['Training', 'Nutrition'] : options).map((option, index) => (
          <Checkbox key={`${index}-${option}`}>{option || 'Untitled choice'}</Checkbox>
        ))}
      </fieldset>
    );
  }
  return (
    <div className="grid gap-2">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="text-sm font-medium"
      >
        {heading}
      </label>
      {question.type === 'text' ? (
        <Textarea
          id={id}
          aria-label={label}
          required={question.required ?? false}
        />
      ) : question.type === 'select' || question.type === 'boolean' || question.type === 'rating' ? (
        <SelectField
          id={id}
          aria-label={label}
          defaultValue=""
          isRequired={question.required ?? false}
        >
          <SelectItem
            id=""
            isDisabled
          >
            Choose an answer
          </SelectItem>
          {(question.type === 'boolean'
            ? ['Yes', 'No']
            : question.type === 'rating'
              ? ['1', '2', '3', '4', '5']
              : options
          ).map((option, index) => (
            <SelectItem
              key={`${index}-${option}`}
              id={String(index)}
            >
              {option || 'Untitled choice'}
            </SelectItem>
          ))}
        </SelectField>
      ) : question.type === 'photo' ? (
        <>
          <Input
            id={id}
            aria-label={label}
            type="file"
            accept="image/*"
          />
          <p className="text-xs text-muted-foreground">Preview only. Photos are not uploaded.</p>
        </>
      ) : question.type === 'weight' ? (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Input
            id={id}
            aria-label={label}
            type="number"
            inputMode="decimal"
            step="any"
          />
          <SelectField
            aria-label="Weight unit"
            defaultValue="kg"
          >
            <SelectItem id="kg">kg</SelectItem>
            <SelectItem id="lb">lb</SelectItem>
          </SelectField>
        </div>
      ) : (
        <Input
          id={id}
          aria-label={label}
          type={question.type === 'date' ? 'date' : 'number'}
          required={question.required ?? false}
        />
      )}
    </div>
  );
}

export function FormPreview({values}: {values: FormTemplateCreate}) {
  return (
    <DialogTrigger>
      <Button variant="outline">Preview form</Button>
      <Dialog showCloseButton={false}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{values.name.trim() || 'Untitled form'}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">Try the questions. Preview answers are not saved.</p>
          </div>
          <DialogClose
            aria-label="Close preview"
            size="icon-sm"
          >
            <X aria-hidden="true" />
          </DialogClose>
        </DialogHeader>
        <div
          className="dialog-body space-y-8"
          role="region"
          aria-label="Form questions"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: This scroll region must be reachable by keyboard.
          tabIndex={0}
        >
          {values.sections.map((section, index) => (
            <section
              key={section.questions.map((question) => question.id).join(':') || `empty-${index}`}
              className="space-y-5"
            >
              {section.title && <h3 className="section-title break-words">{section.title}</h3>}
              {section.questions.map((question) => (
                <PreviewAnswer
                  key={question.id}
                  question={question}
                />
              ))}
            </section>
          ))}
        </div>
      </Dialog>
    </DialogTrigger>
  );
}
