/**
 * Form template builder (FB): titled sections of typed questions. Mirrors the
 * training plan builder's anatomy — the form NAME is the page title, type +
 * live summary are the sub-line, and name/type themselves are edited on the
 * details screen (FB → FE, like TB → TE). The builder edits `sections` only.
 *
 * The draft lives here; the screen shell (`checkin-builder-screen`) owns the
 * fetch, the header's back/Edit details/Delete affordances, and the mutation.
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
import {type ReactNode, useRef, useState} from 'react';
import {FormActions} from '@/@components/form-fields/form-actions';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {Page} from '@/@components/page';
import {type FormPurpose, newQuestion, newSection, type QuestionDraft, type SectionDraft} from '@/api/checkins';
import AddQuestionControl from '@/checkins/question-palette';
import {
  QUESTION_TYPE_ICONS,
  QUESTION_TYPES_WITH_OPTIONS,
  questionIdentityLocked,
  questionTypeLabel,
  questionTypeOrder,
} from '@/checkins/question-type-meta';

const CARD_CLASS = 'rounded-card border border-border bg-surface p-4 sm:p-5';
const DASHED_BUTTON_CLASS = 'w-full rounded-control border border-dashed border-border';

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function summarize(sections: SectionDraft[]): string {
  const questions = sections.flatMap((section) => section.questions);
  const required = questions.filter((question) => question.required).length;
  return `${pluralize(questions.length, 'question')} · ${required} required · ${pluralize(sections.length, 'section')}`;
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
            <X />
          </Button>
        </div>
      ))}
      <Button
        className="self-start"
        onPress={() => onChange([...options, ''])}
        size="sm"
        variant="ghost"
      >
        <Plus />
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
  purpose,
  question,
  serviceTypeExists,
}: {
  count: number;
  index: number;
  isExpanded: boolean;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onToggle: () => void;
  purpose: FormPurpose;
  question: QuestionDraft;
  serviceTypeExists: boolean;
}) {
  const Icon = QUESTION_TYPE_ICONS[question.type];
  const locked = questionIdentityLocked(question.type);
  const showOptions = QUESTION_TYPES_WITH_OPTIONS.includes(question.type);

  return (
    <div className="rounded-control border border-border bg-surface">
      <div className="flex min-h-11 items-center gap-2 px-2 py-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-chip bg-surface-secondary">
          <Icon className="text-muted" />
        </span>

        <span className={cn('min-w-0 flex-1 truncate type-body', question.label ? 'text-foreground' : 'text-muted-2')}>
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
            <MoreVertical />
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
                    icon={<ArrowUp className="shrink-0 text-muted" />}
                    label="Move up"
                  />
                </Dropdown.Item>
                <Dropdown.Item
                  id="move-down"
                  isDisabled={index === count - 1}
                  textValue="Move down"
                >
                  <MenuItemBody
                    icon={<ArrowDown className="shrink-0 text-muted" />}
                    label="Move down"
                  />
                </Dropdown.Item>
                <Dropdown.Item
                  id="duplicate"
                  isDisabled={locked}
                  textValue="Duplicate"
                >
                  <MenuItemBody
                    icon={<Copy className="shrink-0 text-muted" />}
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
                    icon={<Trash2 className="shrink-0 text-danger" />}
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
          <ChevronDown className={cn(' transition-transform', isExpanded && 'rotate-180')} />
        </Button>
      </div>

      {isExpanded ? (
        <div className="flex flex-col gap-4 border-t border-separator p-3">
          <TextField
            className="w-full"
            isDisabled={locked}
            onChange={(value) => onChange({label: value})}
            value={question.label}
          >
            <Label>Question</Label>
            <Input placeholder="Untitled question" />
          </TextField>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Select
              className="min-w-0 flex-1"
              isDisabled={locked}
              onChange={(key) => {
                if (!key) {
                  return;
                }
                const type = key as QuestionDraft['type'];
                onChange({
                  options: QUESTION_TYPES_WITH_OPTIONS.includes(type) ? question.options : [],
                  required: questionIdentityLocked(type) ? true : question.required,
                  type,
                });
              }}
              value={question.type}
            >
              <Label>Answer type</Label>
              <Select.Trigger>
                <Icon className="shrink-0 text-muted" />
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {questionTypeOrder(purpose, locked || !serviceTypeExists).map((type) => (
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
                isDisabled={locked}
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
  purpose,
  section,
  serviceTypeExists,
}: {
  count: number;
  expandedKeys: Set<string>;
  index: number;
  onChange: (section: SectionDraft) => void;
  onExpand: (key: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onToggleExpand: (key: string) => void;
  purpose: FormPurpose;
  section: SectionDraft;
  serviceTypeExists: boolean;
}) {
  const setQuestions = (questions: QuestionDraft[]) => onChange({...section, questions});

  const addQuestion = (question: QuestionDraft) => {
    setQuestions([...section.questions, question]);
    onExpand(question.key);
  };

  const duplicateQuestion = (position: number) => {
    const source = section.questions[position];
    if (!source || questionIdentityLocked(source.type)) {
      return;
    }
    const copy: QuestionDraft = {...source, id: '', key: newQuestion().key, options: [...source.options]};
    setQuestions([...section.questions.slice(0, position + 1), copy, ...section.questions.slice(position + 1)]);
    onExpand(copy.key);
  };

  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-center gap-2">
        <Folder className="shrink-0 text-muted" />
        <TextField
          className="min-w-0 flex-1"
          onChange={(value) => onChange({...section, title: value})}
          value={section.title}
        >
          <Label className="sr-only">Section title</Label>
          {/* Inline title (INTERACTIONS.md § FM/FB) — reads as a heading, not a
              boxed field, until focused. */}
          <Input
            className={cn(
              'border-transparent bg-transparent px-0 font-semibold focus:border-border focus:bg-surface focus:px-3',
            )}
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
              <MoreVertical />
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
                      icon={<ArrowUp className="shrink-0 text-muted" />}
                      label="Move section up"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="move-section-down"
                    isDisabled={index === count - 1}
                    textValue="Move section down"
                  >
                    <MenuItemBody
                      icon={<ArrowDown className="shrink-0 text-muted" />}
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
                      icon={<Trash2 className="shrink-0 text-danger" />}
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
              purpose={purpose}
              question={question}
              serviceTypeExists={serviceTypeExists}
            />
          ))
        )}
      </div>

      <div className="mt-3">
        <AddQuestionControl
          hasServiceType={serviceTypeExists}
          onAdd={addQuestion}
          purpose={purpose}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

interface Props {
  /** Back affordance rendered by the screen shell. */
  backSlot?: ReactNode;
  /** Shell-owned header actions (Delete, Edit details). */
  headerActions?: ReactNode;
  initialSections: SectionDraft[];
  isSubmitting: boolean;
  /** Form name — display only; edited on the details screen. */
  name: string;
  onCancel: () => void;
  onSubmit: (sections: SectionDraft[]) => void;
  purpose: FormPurpose;
  /** Form type label — display only; edited on the details screen. */
  purposeLabel: string;
  submitLabel: string;
  submittingLabel: string;
}

export default function CheckinBuilder({
  backSlot,
  headerActions,
  initialSections,
  isSubmitting,
  name,
  onCancel,
  onSubmit,
  purpose,
  purposeLabel,
  submitLabel,
  submittingLabel,
}: Props) {
  const [sections, setSections] = useState<SectionDraft[]>(initialSections);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<null | string>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const serviceTypeExists = sections.some((section) =>
    section.questions.some((question) => questionIdentityLocked(question.type)),
  );

  const expand = (key: string) => setExpandedKeys((keys) => new Set(keys).add(key));

  const toggleExpand = (key: string) =>
    setExpandedKeys((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });

  const commitSections = (update: (current: SectionDraft[]) => SectionDraft[]) => {
    setError(null);
    setSections(update);
  };

  const setSection = (index: number, section: SectionDraft) => {
    commitSections((current) => current.map((item, i) => (i === index ? section : item)));
  };

  const validate = (): null | string => {
    const questions = sections.flatMap((s) => s.questions);
    if (questions.length === 0) {
      return 'Add at least one question.';
    }
    if (questions.some((q) => !q.label.trim())) {
      return 'Every question needs a label.';
    }
    if (purpose === 'check_in' && questions.some((q) => questionIdentityLocked(q.type))) {
      return 'Service type is only available on Intake forms.';
    }
    if (questions.filter((q) => questionIdentityLocked(q.type)).length > 1) {
      return 'Service type can appear only once.';
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
      // Desktop's Save sits in the sticky header while the message renders at
      // the bottom of a long form — scroll to it or the failure looks silent.
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'}));
      return;
    }
    // Blank option rows are an editing artifact — drop them on the way out.
    onSubmit(
      sections.map((section) => ({
        ...section,
        questions: section.questions.map((q) => ({...q, options: q.options.filter((o) => o.trim())})),
      })),
    );
  };

  return (
    <>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center gap-1">
          {backSlot}
          <div className="min-w-0">
            <Page.Title>{name}</Page.Title>
            <Typography
              className="mt-0.5"
              color="muted"
              type="body-sm"
            >
              {purposeLabel} · {summarize(sections)}
            </Typography>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          {headerActions}
          {/* Mobile keeps the single sticky save that FormActions already docks
              at the bottom, so this header copy is desktop-only. */}
          <Button
            className="hidden sm:flex"
            isPending={isSubmitting}
            onPress={handleSubmit}
            variant="primary"
          >
            <Check />
            Save form
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content
        bare
        className="pb-6"
      >
        <Page.Frame size="content">
          <FormLayout
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="flex flex-col gap-4">
              {sections.map((section, index) => (
                <SectionCard
                  count={sections.length}
                  expandedKeys={expandedKeys}
                  index={index}
                  key={section.key}
                  onChange={(next) => setSection(index, next)}
                  onExpand={expand}
                  onMove={(dir) => commitSections((s) => moveInList(s, index, dir))}
                  onRemove={() => commitSections((s) => s.filter((_, i) => i !== index))}
                  onToggleExpand={toggleExpand}
                  purpose={purpose}
                  section={section}
                  serviceTypeExists={serviceTypeExists}
                />
              ))}

              <Button
                className={DASHED_BUTTON_CLASS}
                onPress={() => commitSections((s) => [...s, newSection('New section')])}
                variant="ghost"
              >
                <FolderPlus />
                Add section
              </Button>
            </div>

            {error ? (
              <div ref={errorRef}>
                <ErrorMessage>{error}</ErrorMessage>
              </div>
            ) : null}

            {/* Desktop's Save lives in the sticky header (FB ref); this row is
                the mobile counterpart, so it must not draw a second one there. */}
            <FormActions
              isSubmitting={isSubmitting}
              mobileOnly
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
