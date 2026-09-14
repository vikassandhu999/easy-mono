import {ArrowDown, ArrowUp, Plus, Trash2} from 'lucide-react';
import {Controller, useFieldArray, useFormContext, useWatch} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Label} from '../ui/label';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import type {LandingDraft} from './landing-draft';

function RowActions({
  index,
  length,
  move,
  remove,
  label,
}: {
  index: number;
  length: number;
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Move ${label} up`}
        isDisabled={index === 0}
        onPress={() => move(index, index - 1)}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Move ${label} down`}
        isDisabled={index === length - 1}
        onPress={() => move(index, index + 1)}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Remove ${label}`}
        onPress={() => remove(index)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

export function ProgramFields() {
  const {control} = useFormContext<LandingDraft>();
  const programs = useFieldArray({control, name: 'programs'});
  const values = useWatch({control, name: 'programs'});
  return (
    <div className="space-y-5">
      {programs.fields.map((program, index) => (
        <section
          key={program.id}
          className="space-y-4 border-t border-border pt-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 break-words text-base font-semibold">
              {values[index]?.name || `Program ${index + 1}`}
            </h3>
            <RowActions
              index={index}
              length={programs.fields.length}
              move={programs.move}
              remove={programs.remove}
              label={`program ${index + 1}`}
            />
          </div>
          <FormField
            control={control}
            name={`programs.${index}.name`}
            label="Program name"
            isRequired
            maxLength={255}
          />
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name={`programs.${index}.audience`}
              label="Who is it for?"
              maxLength={255}
            />
            <FormField
              control={control}
              name={`programs.${index}.price_display`}
              label="Price or pricing note"
              description="For example, ₹8,000/month or Contact for pricing."
              maxLength={255}
            />
          </div>
          <details className="space-y-4">
            <summary className="cursor-pointer text-sm font-medium">Add program details</summary>
            <FormField
              control={control}
              name={`programs.${index}.promise`}
              label="What will you work towards?"
              maxLength={255}
            />
            <FormField
              control={control}
              name={`programs.${index}.description`}
              label="What’s included?"
              multiline
              maxLength={255}
            />
          </details>
        </section>
      ))}
      <Button
        variant="outline"
        isDisabled={programs.fields.length >= 3}
        onPress={() =>
          programs.append({programRef: '', name: '', audience: '', promise: '', description: '', price_display: ''})
        }
      >
        <Plus
          className="size-4"
          aria-hidden="true"
        />{' '}
        Add program
      </Button>
      <p className="text-sm text-muted-foreground">Up to 3 programs. Visitors can also apply without choosing one.</p>
    </div>
  );
}

export function QuestionFields() {
  const {control, formState} = useFormContext<LandingDraft>();
  const questions = useFieldArray({control, name: 'application_questions'});
  const values = useWatch({control, name: 'application_questions'});
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        We already ask for their name and email or phone. Add up to 5 optional questions to understand what they need.
      </p>
      {questions.fields.map((question, index) => (
        <section
          key={question.id}
          className="space-y-4 border-t border-border pt-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Question {index + 1}</h3>
            <RowActions
              index={index}
              length={questions.fields.length}
              move={questions.move}
              remove={questions.remove}
              label={`question ${index + 1}`}
            />
          </div>
          <FormField
            control={control}
            name={`application_questions.${index}.label`}
            label="Question"
            isRequired
            maxLength={255}
          />
          <Controller
            control={control}
            name={`application_questions.${index}.type`}
            render={({field}) => (
              <div className="space-y-2">
                <Label
                  id={`question-type-${index}-label`}
                  htmlFor={`question-type-${index}`}
                >
                  Answer format
                </Label>
                <SelectField
                  id={`question-type-${index}`}
                  value={field.value}
                  triggerRef={field.ref}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                >
                  <SelectItem id="long_text">Long answer</SelectItem>
                  <SelectItem id="short_text">Short answer</SelectItem>
                  <SelectItem id="single_select">Choose one</SelectItem>
                </SelectField>
              </div>
            )}
          />
          {values[index]?.type === 'single_select' && (
            <FormField
              control={control}
              name={`application_questions.${index}.optionsText`}
              label="Choices"
              description="One choice per line. Add at least 2."
              multiline
              isRequired
            />
          )}
        </section>
      ))}
      <FormError message={formState.errors.application_questions?.message} />
      <Button
        variant="outline"
        isDisabled={questions.fields.length >= 5}
        onPress={() =>
          questions.append({questionId: crypto.randomUUID(), label: '', type: 'long_text', optionsText: ''})
        }
      >
        <Plus
          className="size-4"
          aria-hidden="true"
        />{' '}
        Add question
      </Button>
    </div>
  );
}

export function SupportingFields() {
  const {control} = useFormContext<LandingDraft>();
  const proof = useFieldArray({control, name: 'proof_points'});
  const fit = useFieldArray({control, name: 'fit_points'});
  return (
    <details className="space-y-5 border-t border-border pt-5">
      <summary className="cursor-pointer text-sm font-medium">More about your coaching</summary>
      <FormField
        control={control}
        name="eyebrow"
        label="Short introduction"
        description="A few words above your headline, such as Strength coaching."
        maxLength={255}
      />
      <FormField
        control={control}
        name="coach_intro"
        label="About you"
        multiline
        maxLength={255}
      />
      <FormField
        control={control}
        name="hero_image_url"
        label="Photo address"
        type="url"
        description="A public http or https image address."
        maxLength={255}
      />
      <div className="space-y-4">
        <h3 className="font-medium">Who you help</h3>
        {fit.fields.map((point, index) => (
          <div
            key={point.id}
            className="flex items-end gap-3"
          >
            <div className="min-w-0 flex-1">
              <FormField
                control={control}
                name={`fit_points.${index}.value`}
                label={`A good fit for ${index + 1}`}
                isRequired
                maxLength={255}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove fit point ${index + 1}`}
              onPress={() => fit.remove(index)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          isDisabled={fit.fields.length >= 8}
          onPress={() => fit.append({value: ''})}
        >
          Add who you help
        </Button>
      </div>
      <div className="space-y-4">
        <h3 className="font-medium">Experience at a glance</h3>
        <p className="text-sm text-muted-foreground">
          Use facts you can stand behind, such as years of experience or a qualification.
        </p>
        {proof.fields.map((point, index) => (
          <div
            key={point.id}
            className="space-y-3 border-t border-border pt-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={control}
                name={`proof_points.${index}.value`}
                label={`Fact ${index + 1}`}
                isRequired
                maxLength={255}
              />
              <FormField
                control={control}
                name={`proof_points.${index}.label`}
                label="What does it describe?"
                isRequired
                maxLength={255}
              />
            </div>
            <Button
              variant="ghost"
              onPress={() => proof.remove(index)}
            >
              Remove fact {index + 1}
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          isDisabled={proof.fields.length >= 6}
          onPress={() => proof.append({value: '', label: ''})}
        >
          Add a fact
        </Button>
      </div>
      <Controller
        control={control}
        name="template"
        render={({field}) => (
          <div className="space-y-2">
            <Label
              id="page-layout-label"
              htmlFor="page-layout"
            >
              What comes after your introduction?
            </Label>
            <SelectField
              id="page-layout"
              value={field.value}
              triggerRef={field.ref}
              onBlur={field.onBlur}
              onChange={field.onChange}
            >
              <SelectItem id="coach_story">Your story</SelectItem>
              <SelectItem id="problem_fit">Who you help</SelectItem>
              <SelectItem id="proof_first">Your experience</SelectItem>
            </SelectField>
          </div>
        )}
      />
    </details>
  );
}
