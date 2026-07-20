/**
 * Form template builder (FB): name + type, then titled sections of typed
 * questions. Draft state lives here; the create/edit wrappers own the mutation
 * and supply the header's back affordance / extra actions.
 *
 * Layout follows design-handoff refs/FB.png: a page header carrying the live
 * `{n} questions · {m} required · {k} sections` summary, a details card, one
 * card per section holding collapsed question rows, and dashed "Add question" /
 * "Add section" affordances.
 *
 * Reordering is menu-based (Move up / Move down) per GAPS.md #11 — the
 * prototype draws drag grips but implements menus, so no grip icon and no DnD
 * library.
 */
import {
  Button,
  Chip,
  Dropdown,
  ErrorMessage,
  Input,
  Label,
  ListBox,
  Select,
  Separator,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import {cn} from '@heroui/styles';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Folder,
  FolderPlus,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {type ReactNode, useState} from 'react';

import {FormActions, FormLayout} from '@/@components/form-fields';
import {Page} from '@/@components/page';
import {
  type FormPurpose,
  newQuestion,
  newSection,
  PURPOSE_LABELS,
  PURPOSES,
  type QuestionDraft,
  type SectionDraft,
  type TemplateDraft,
} from '@/api/checkins';
import AddQuestionControl from '@/checkins/question-palette';
import {
  QUESTION_TYPE_ICONS,
  QUESTION_TYPE_ORDER,
  QUESTION_TYPES_WITH_OPTIONS,
  questionTypeLabel,
} from '@/checkins/question-type-meta';

// RECIPES.md R3 — segmented control. HeroUI signals selection with
// `data-selected="true"`; the `selected:` Tailwind prefix is a no-op here.
const SEGMENT_GROUP_CLASS = 'flex w-full gap-0.5 rounded-control border border-border bg-surface p-0.5';
const SEGMENT_BUTTON_CLASS =
  'min-h-11 flex-1 rounded-chip border-0 bg-transparent px-3 py-2 text-pill font-medium text-muted ' +
  'data-[selected=true]:bg-ink data-[selected=true]:font-semibold data-[selected=true]:text-ink-foreground';

const CARD_CLASS = 'rounded-card border border-border bg-surface p-4 sm:p-5';
const DASHED_BUTTON_CLASS = 'w-full rounded-control border border-dashed border-border';

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function summarize(draft: TemplateDraft): string {
  const questions = draft.sections.flatMap((section) => section.questions);
  const required = questions.filter((question) => question.required).length;
  return `${pluralize(questions.length, 'question')} · ${required} required · ${pluralize(draft.sections.length, 'section')}`;
}

function moveInList<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= items.length) {
    return items;
  }
  const next = [...items];
  const current = next[index];
  const swap = next[target];
  if (!current || !swap) {
    return items;
  }
  next[index] = swap;
  next[target] = current;
  return next;
}

function MenuItemBody({icon, label}: {icon: ReactNode; label: string}) {
  return (
    <>
      <div className="flex items-start justify-center pt-px">{icon}</div>
      <Label>{label}</Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// Options editor (Select / Multi-select only)
// ---------------------------------------------------------------------------

function OptionsEditor({onChange, options}: {onChange: (options: string[]) => void; options: string[]}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Options</Label>
      {options.map((option, index) => (
        <div
          className="flex items-center gap-2"
          // Option rows have no stable identity — the array index IS the
          // identity here, same as the serving-size rows in food-form.
          key={index}
        >
          <TextField
            aria-label={`Option ${index + 1}`}
            className="min-w-0 flex-1"
            onChange={(value) => onChange(options.map((o, i) => (i === index ? value : o)))}
            value={option}
          >
            <Input placeholder={`Option ${index + 1}`} />
          </TextField>
          <Button
            aria-label={`Remove option ${index + 1}`}
            isIconOnly
            onPress={() => onChange(options.filter((_, i) => i !== index))}
            size="sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        className="self-start"
        onPress={() => onChange([...options, ''])}
        size="sm"
        variant="ghost"
      >
        <Plus className="size-4" />
        Add option
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question row (collapsed header + expanded editor)
// ---------------------------------------------------------------------------

function QuestionRow({
  count,
  index,
  isExpanded,
  onChange,
  onDuplicate,
  onMove,
  onRemove,
  onToggle,
  question,
}: {
  count: number;
  index: number;
  isExpanded: boolean;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onToggle: () => void;
  question: QuestionDraft;
}) {
  const Icon = QUESTION_TYPE_ICONS[question.type];
  const showOptions = QUESTION_TYPES_WITH_OPTIONS.includes(question.type);

  return (
    <div className="rounded-control border border-border bg-surface">
      <div className="flex min-h-11 items-center gap-2.5 px-2.5 py-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-chip bg-surface-secondary">
          <Icon className="size-4 text-muted" />
        </span>

        <span className={cn('min-w-0 flex-1 truncate text-sm', question.label ? 'text-foreground' : 'text-muted-2')}>
          {question.label || 'Untitled question'}
        </span>

        <Chip
          className="hidden rounded-chip border border-border bg-surface sm:flex"
          size="sm"
          variant="secondary"
        >
          {questionTypeLabel(question.type)}
        </Chip>

        {question.required ? (
          <Typography
            className="shrink-0 uppercase text-danger"
            type="body-xs"
            weight="bold"
          >
            REQ
          </Typography>
        ) : null}

        <Dropdown>
          <Button
            aria-label={`Question actions: ${question.label || 'Untitled question'}`}
            isIconOnly
            size="sm"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'move-up') {
                  onMove(-1);
                } else if (key === 'move-down') {
                  onMove(1);
                } else if (key === 'duplicate') {
                  onDuplicate();
                } else if (key === 'remove') {
                  onRemove();
                }
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item
                  id="move-up"
                  isDisabled={index === 0}
                  textValue="Move up"
                >
                  <MenuItemBody
                    icon={<ArrowUp className="size-4 shrink-0 text-muted" />}
                    label="Move up"
                  />
                </Dropdown.Item>
                <Dropdown.Item
                  id="move-down"
                  isDisabled={index === count - 1}
                  textValue="Move down"
                >
                  <MenuItemBody
                    icon={<ArrowDown className="size-4 shrink-0 text-muted" />}
                    label="Move down"
                  />
                </Dropdown.Item>
                <Dropdown.Item
                  id="duplicate"
                  textValue="Duplicate"
                >
                  <MenuItemBody
                    icon={<Copy className="size-4 shrink-0 text-muted" />}
                    label="Duplicate"
                  />
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id="remove"
                  textValue="Remove"
                  variant="danger"
                >
                  <MenuItemBody
                    icon={<Trash2 className="size-4 shrink-0 text-danger" />}
                    label="Remove"
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Button
          aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
          isIconOnly
          onPress={onToggle}
          size="sm"
          variant="ghost"
        >
          <ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />
        </Button>
      </div>

      {isExpanded ? (
        <div className="flex flex-col gap-4 border-t border-separator p-3">
          <TextField
            className="w-full"
            onChange={(value) => onChange({label: value})}
            value={question.label}
          >
            <Label>Question</Label>
            <Input placeholder="Untitled question" />
          </TextField>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Select
              className="min-w-0 flex-1"
              onChange={(key) => key && onChange({type: key as QuestionDraft['type']})}
              value={question.type}
            >
              <Label>Answer type</Label>
              <Select.Trigger>
                <Icon className="size-4 shrink-0 text-muted" />
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {QUESTION_TYPE_ORDER.map((type) => (
                    <ListBox.Item
                      id={type}
                      key={type}
                      textValue={questionTypeLabel(type)}
                    >
                      {questionTypeLabel(type)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <div className="flex min-h-11 shrink-0 items-center">
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
            <OptionsEditor
              onChange={(options) => onChange({options})}
              options={question.options}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function SectionCard({
  count,
  expandedKeys,
  index,
  onChange,
  onExpand,
  onMove,
  onRemove,
  onToggleExpand,
  section,
}: {
  count: number;
  expandedKeys: Set<string>;
  index: number;
  onChange: (section: SectionDraft) => void;
  onExpand: (key: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onToggleExpand: (key: string) => void;
  section: SectionDraft;
}) {
  const setQuestions = (questions: QuestionDraft[]) => onChange({...section, questions});

  const addQuestion = (question: QuestionDraft) => {
    setQuestions([...section.questions, question]);
    onExpand(question.key);
  };

  const duplicateQuestion = (position: number) => {
    const source = section.questions[position];
    if (!source) {
      return;
    }
    const copy: QuestionDraft = {...source, id: '', key: newQuestion().key, options: [...source.options]};
    setQuestions([...section.questions.slice(0, position + 1), copy, ...section.questions.slice(position + 1)]);
    onExpand(copy.key);
  };

  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-center gap-2">
        <Folder className="size-4 shrink-0 text-muted" />
        <TextField
          className="min-w-0 flex-1"
          onChange={(value) => onChange({...section, title: value})}
          value={section.title}
        >
          <Label className="sr-only">Section title</Label>
          {/* Inline title (INTERACTIONS.md § FM/FB) — reads as a heading, not a
              boxed field, until focused. */}
          <Input
            className="border-transparent bg-transparent px-0 font-semibold shadow-none focus:border-border focus:bg-field-background focus:px-3"
            placeholder="Section title"
          />
        </TextField>

        {count > 1 ? (
          <Dropdown>
            <Button
              aria-label={`Section actions: ${section.title || 'Untitled section'}`}
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="size-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'move-section-up') {
                    onMove(-1);
                  } else if (key === 'move-section-down') {
                    onMove(1);
                  } else if (key === 'delete-section') {
                    onRemove();
                  }
                }}
              >
                <Dropdown.Section>
                  <Dropdown.Item
                    id="move-section-up"
                    isDisabled={index === 0}
                    textValue="Move section up"
                  >
                    <MenuItemBody
                      icon={<ArrowUp className="size-4 shrink-0 text-muted" />}
                      label="Move section up"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="move-section-down"
                    isDisabled={index === count - 1}
                    textValue="Move section down"
                  >
                    <MenuItemBody
                      icon={<ArrowDown className="size-4 shrink-0 text-muted" />}
                      label="Move section down"
                    />
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Dropdown.Item
                    id="delete-section"
                    textValue="Delete section"
                    variant="danger"
                  >
                    <MenuItemBody
                      icon={<Trash2 className="size-4 shrink-0 text-danger" />}
                      label="Delete section"
                    />
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {section.questions.length === 0 ? (
          <Typography
            className="py-4 text-center"
            color="muted"
            type="body-sm"
          >
            No questions yet — add one below.
          </Typography>
        ) : (
          section.questions.map((question, position) => (
            <QuestionRow
              count={section.questions.length}
              index={position}
              isExpanded={expandedKeys.has(question.key)}
              key={question.key}
              onChange={(patch) =>
                setQuestions(section.questions.map((q, i) => (i === position ? {...q, ...patch} : q)))
              }
              onDuplicate={() => duplicateQuestion(position)}
              onMove={(dir) => setQuestions(moveInList(section.questions, position, dir))}
              onRemove={() => setQuestions(section.questions.filter((_, i) => i !== position))}
              onToggle={() => onToggleExpand(question.key)}
              question={question}
            />
          ))
        )}
      </div>

      <div className="mt-3">
        <AddQuestionControl onAdd={addQuestion} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

interface Props {
  /** Back affordance rendered by the create/edit wrapper. */
  backSlot?: ReactNode;
  /** Uppercase eyebrow above the live summary (`Editing form` / `New form`). */
  eyebrow: string;
  /** Wrapper-owned header actions (edit screen's Delete). */
  headerExtra?: ReactNode;
  initialDraft: TemplateDraft;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (draft: TemplateDraft) => void;
  submitLabel: string;
  submittingLabel: string;
}

export default function CheckinBuilder({
  backSlot,
  eyebrow,
  headerExtra,
  initialDraft,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: Props) {
  const [draft, setDraft] = useState<TemplateDraft>(initialDraft);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<null | string>(null);

  const expand = (key: string) => setExpandedKeys((keys) => new Set(keys).add(key));

  const toggleExpand = (key: string) =>
    setExpandedKeys((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });

  const setSection = (index: number, section: SectionDraft) => {
    setDraft((d) => ({...d, sections: d.sections.map((s, i) => (i === index ? section : s))}));
  };

  const validate = (): null | string => {
    if (!draft.name.trim()) {
      return 'Give the form a name.';
    }
    const questions = draft.sections.flatMap((s) => s.questions);
    if (questions.length === 0) {
      return 'Add at least one question.';
    }
    if (questions.some((q) => !q.label.trim())) {
      return 'Every question needs a label.';
    }
    if (
      questions.some(
        (q) => QUESTION_TYPES_WITH_OPTIONS.includes(q.type) && q.options.filter((o) => o.trim()).length === 0,
      )
    ) {
      return 'Select questions need at least one option.';
    }
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();
    setError(validationError);
    if (validationError) {
      return;
    }
    // Blank option rows are an editing artifact — drop them on the way out.
    onSubmit({
      ...draft,
      sections: draft.sections.map((section) => ({
        ...section,
        questions: section.questions.map((q) => ({...q, options: q.options.filter((o) => o.trim())})),
      })),
    });
  };

  return (
    <>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center gap-1">
          {backSlot}
          <div className="min-w-0">
            <Typography
              className="uppercase tracking-wide"
              color="muted"
              type="body-xs"
              weight="bold"
            >
              {eyebrow}
            </Typography>
            {/* The summary is the page title, so it must never truncate the
                way a name would — Page.Title's default `truncate` is dropped. */}
            <Page.Title className="overflow-visible text-balance whitespace-normal">{summarize(draft)}</Page.Title>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          {headerExtra}
          {/* Mobile keeps the single sticky save that FormActions already docks
              at the bottom, so this header copy is desktop-only. */}
          <Button
            className="hidden sm:flex"
            isPending={isSubmitting}
            onPress={handleSubmit}
            variant="primary"
          >
            <Check className="size-4" />
            Save form
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content className="pb-6">
        <Page.Frame size="content">
          <FormLayout
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className={cn(CARD_CLASS, 'flex flex-col gap-4')}>
              <TextField
                className="w-full"
                onChange={(value) => setDraft((d) => ({...d, name: value}))}
                value={draft.name}
              >
                <Label>Form name</Label>
                <Input placeholder="e.g. Weekly Check-in" />
              </TextField>

              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <ToggleButtonGroup
                  aria-label="Form type"
                  className={SEGMENT_GROUP_CLASS}
                  isDetached
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) {
                      setDraft((d) => ({...d, purpose: next as FormPurpose}));
                    }
                  }}
                  selectedKeys={[draft.purpose]}
                  selectionMode="single"
                >
                  {PURPOSES.map((purpose) => (
                    <ToggleButton
                      className={SEGMENT_BUTTON_CLASS}
                      id={purpose}
                      key={purpose}
                    >
                      {PURPOSE_LABELS[purpose]}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {draft.sections.map((section, index) => (
                <SectionCard
                  count={draft.sections.length}
                  expandedKeys={expandedKeys}
                  index={index}
                  key={section.key}
                  onChange={(next) => setSection(index, next)}
                  onExpand={expand}
                  onMove={(dir) => setDraft((d) => ({...d, sections: moveInList(d.sections, index, dir)}))}
                  onRemove={() => setDraft((d) => ({...d, sections: d.sections.filter((_, i) => i !== index)}))}
                  onToggleExpand={toggleExpand}
                  section={section}
                />
              ))}

              <Button
                className={DASHED_BUTTON_CLASS}
                onPress={() => setDraft((d) => ({...d, sections: [...d.sections, newSection('New section')]}))}
                variant="ghost"
              >
                <FolderPlus className="size-4" />
                Add section
              </Button>
            </div>

            {error ? <ErrorMessage>{error}</ErrorMessage> : null}

            <FormActions
              isSubmitting={isSubmitting}
              onCancel={onCancel}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
            />
          </FormLayout>
        </Page.Frame>
      </Page.Content>
    </>
  );
}
