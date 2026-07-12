/**
 * Form template builder: name + titled sections of typed questions.
 * Draft state lives here; the create/edit wrappers own the mutation.
 */
import {
  Button,
  ErrorMessage,
  Fieldset,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {ArrowDown, ArrowUp, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';
import {FieldRow, FormActions, FormLayout} from '@/@components/form-fields';
import {
  FORM_QUESTION_TYPE_LABELS,
  type FormQuestionType,
  newQuestion,
  newSection,
  type QuestionDraft,
  type SectionDraft,
  type TemplateDraft,
} from '@/api/checkins';
import {QUESTION_PRESETS} from '@/checkins/question-presets';

const FIELD_TYPES = Object.keys(FORM_QUESTION_TYPE_LABELS) as FormQuestionType[];

function QuestionEditor({
  question,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  count: number;
  index: number;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  question: QuestionDraft;
}) {
  const showOptions = question.type === 'select' || question.type === 'multi_select';

  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3">
      <div className="mb-3 flex items-center gap-1">
        <Typography
          className="flex-1"
          color="muted"
          type="body-xs"
          weight="medium"
        >
          Question {index + 1}
        </Typography>
        <Button
          aria-label="Move question up"
          isDisabled={index === 0}
          isIconOnly
          onPress={() => onMove(-1)}
          size="sm"
          variant="ghost"
        >
          <ArrowUp size={15} />
        </Button>
        <Button
          aria-label="Move question down"
          isDisabled={index === count - 1}
          isIconOnly
          onPress={() => onMove(1)}
          size="sm"
          variant="ghost"
        >
          <ArrowDown size={15} />
        </Button>
        <Button
          aria-label="Remove question"
          isIconOnly
          onPress={onRemove}
          size="sm"
          variant="ghost"
        >
          <Trash2 size={15} />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <TextField
          onChange={(value) => onChange({label: value})}
          value={question.label}
          variant="secondary"
        >
          <Label>Question</Label>
          <Input placeholder="e.g. How was your energy this week?" />
        </TextField>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            onChange={(key) => {
              if (!key) {
                return;
              }
              onChange({type: key as FormQuestionType});
            }}
            value={question.type}
            variant="secondary"
          >
            <Label>Answer type</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {FIELD_TYPES.map((t) => (
                  <ListBox.Item
                    id={t}
                    key={t}
                    textValue={FORM_QUESTION_TYPE_LABELS[t]}
                  >
                    {FORM_QUESTION_TYPE_LABELS[t]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="flex items-end pb-1">
            <Switch
              isSelected={question.required}
              onChange={(value) => onChange({required: value})}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Required
              </Switch.Content>
            </Switch>
          </div>
        </div>

        {showOptions ? (
          <TextField
            onChange={(value) =>
              onChange({
                options: value
                  .split('\n')
                  .map((o) => o.trim())
                  .filter(Boolean),
              })
            }
            value={question.options.join('\n')}
            variant="secondary"
          >
            <Label>Options</Label>
            <TextArea
              placeholder={'One option per line'}
              rows={3}
            />
          </TextField>
        ) : null}
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  canRemove,
  onChange,
  onRemove,
}: {
  canRemove: boolean;
  onChange: (section: SectionDraft) => void;
  onRemove: () => void;
  section: SectionDraft;
}) {
  const setQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    onChange({...section, questions: section.questions.map((q, i) => (i === index ? {...q, ...patch} : q))});
  };

  const removeQuestion = (index: number) => {
    onChange({...section, questions: section.questions.filter((_, i) => i !== index)});
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= section.questions.length) {
      return;
    }
    const questions = [...section.questions];
    const current = questions[index];
    const swap = questions[target];
    if (!current || !swap) {
      return;
    }
    questions[index] = swap;
    questions[target] = current;
    onChange({...section, questions});
  };

  const addPreset = (presetKey: string) => {
    const preset = QUESTION_PRESETS.find((item) => item.key === presetKey);
    if (!preset) {
      return;
    }
    onChange({
      ...section,
      questions: [
        ...section.questions,
        {...newQuestion(), label: preset.label, required: preset.required, type: preset.type},
      ],
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <TextField
          className="flex-1"
          onChange={(value) => onChange({...section, title: value})}
          value={section.title}
          variant="secondary"
        >
          <Label className="sr-only">Section title</Label>
          <Input placeholder="Section title" />
        </TextField>
        {canRemove ? (
          <Button
            aria-label="Remove section"
            isIconOnly
            onPress={onRemove}
            size="sm"
            variant="ghost"
          >
            <Trash2 size={16} />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {section.questions.map((question, index) => (
          <QuestionEditor
            count={section.questions.length}
            index={index}
            key={question.key}
            onChange={(patch) => setQuestion(index, patch)}
            onMove={(dir) => moveQuestion(index, dir)}
            onRemove={() => removeQuestion(index)}
            question={question}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Button
          onPress={() => onChange({...section, questions: [...section.questions, newQuestion()]})}
          size="sm"
          variant="ghost"
        >
          <Plus size={16} />
          Add question
        </Button>
        <Select
          className="w-full sm:max-w-72"
          onChange={(key) => key && addPreset(String(key))}
          placeholder="Choose a common question"
          value={null}
          variant="secondary"
        >
          <Label>Add common question</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {QUESTION_PRESETS.map((preset) => (
                <ListBox.Item
                  id={preset.key}
                  key={preset.key}
                  textValue={`${preset.category}: ${preset.label}`}
                >
                  <span className="text-muted">{preset.category}</span> · {preset.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </div>
  );
}

interface Props {
  initialDraft: TemplateDraft;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (draft: TemplateDraft) => void;
  submitLabel: string;
  submittingLabel: string;
}

export default function CheckinBuilder({
  initialDraft,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: Props) {
  const [draft, setDraft] = useState<TemplateDraft>(initialDraft);
  const [error, setError] = useState<null | string>(null);

  const setSection = (index: number, section: SectionDraft) => {
    setDraft((d) => ({...d, sections: d.sections.map((s, i) => (i === index ? section : s))}));
  };

  const validate = (): null | string => {
    if (!draft.name.trim()) {
      return 'Give the check-in a name.';
    }
    const questions = draft.sections.flatMap((s) => s.questions);
    if (questions.length === 0) {
      return 'Add at least one question.';
    }
    if (questions.some((q) => !q.label.trim())) {
      return 'Every question needs a label.';
    }
    if (questions.some((q) => (q.type === 'select' || q.type === 'multi_select') && q.options.length === 0)) {
      return 'Select questions need at least one option.';
    }
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();
    setError(validationError);
    if (!validationError) {
      onSubmit(draft);
    }
  };

  return (
    <FormLayout
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Fieldset>
        <FieldRow>
          <TextField
            onChange={(value) => setDraft((d) => ({...d, name: value}))}
            value={draft.name}
            variant="secondary"
          >
            <Label>Name</Label>
            <Input placeholder="e.g. Weekly check-in" />
          </TextField>
        </FieldRow>
      </Fieldset>

      <div className="flex flex-col gap-4">
        {draft.sections.map((section, index) => (
          <SectionEditor
            canRemove={draft.sections.length > 1}
            key={section.key}
            onChange={(next) => setSection(index, next)}
            onRemove={() => setDraft((d) => ({...d, sections: d.sections.filter((_, i) => i !== index)}))}
            section={section}
          />
        ))}
      </div>

      <Button
        className="self-start"
        onPress={() => setDraft((d) => ({...d, sections: [...d.sections, newSection()]}))}
        size="sm"
        variant="secondary"
      >
        <Plus size={16} />
        Add section
      </Button>

      {error ? <ErrorMessage>{error}</ErrorMessage> : null}

      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
