/**
 * Form template builder: name + titled sections of typed questions.
 * Question types are the six profile-field types; a question can optionally map
 * its answer onto an existing profile field (custom-field mapping). Draft state
 * lives here; the create/edit wrappers own the mutation.
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
import {newQuestion, newSection, type QuestionDraft, type SectionDraft, type TemplateDraft} from '@/api/checkins';
import {FIELD_TYPE_LABELS, type ProfileFieldType, useListProfileFieldsQuery} from '@/api/client-profile';

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as ProfileFieldType[];
const NONE = '__none__';

interface ProfileFieldOption {
  key: string;
  label: string;
}

function QuestionEditor({
  question,
  index,
  count,
  profileFields,
  onChange,
  onRemove,
  onMove,
}: {
  count: number;
  index: number;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  profileFields: ProfileFieldOption[];
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
            onChange={(key) => key && onChange({type: key as ProfileFieldType})}
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
                    textValue={FIELD_TYPE_LABELS[t]}
                  >
                    {FIELD_TYPE_LABELS[t]}
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

        {profileFields.length > 0 ? (
          <Select
            onChange={(key) => onChange({fieldKey: !key || key === NONE ? null : String(key)})}
            value={question.fieldKey ?? NONE}
            variant="secondary"
          >
            <Label>Save answer to profile field</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item
                  id={NONE}
                  textValue="Don't save"
                >
                  Don't save
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {profileFields.map((f) => (
                  <ListBox.Item
                    id={f.key}
                    key={f.key}
                    textValue={f.label}
                  >
                    {f.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  canRemove,
  profileFields,
  onChange,
  onRemove,
}: {
  canRemove: boolean;
  onChange: (section: SectionDraft) => void;
  onRemove: () => void;
  profileFields: ProfileFieldOption[];
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
            profileFields={profileFields}
            question={question}
          />
        ))}
      </div>

      <Button
        className="mt-3"
        onPress={() => onChange({...section, questions: [...section.questions, newQuestion()]})}
        size="sm"
        variant="ghost"
      >
        <Plus size={16} />
        Add question
      </Button>
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
  const {data: fieldsData} = useListProfileFieldsQuery();
  const profileFields: ProfileFieldOption[] = (fieldsData?.data ?? []).map((f) => ({key: f.key, label: f.label}));

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
            profileFields={profileFields}
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
