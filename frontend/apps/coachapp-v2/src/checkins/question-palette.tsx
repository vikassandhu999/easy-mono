/**
 * AddQuestionControl — the FB "Add question" palette.
 *
 * GAPS.md #10: the palette is a picker, so it renders in the canonical picker
 * shell — `PickerModal` (centered modal on desktop, `KeyboardSheet` on mobile)
 * wrapping ONE shared content component (`QuestionPaletteContent`). Preset
 * lists are a `ListBox` with a `Header` per category.
 *
 * Two parts, per INTERACTIONS.md § FM/FB: a blank-type grid (`New question`)
 * and the `Common questions` presets grouped by category. Picking either appends
 * a question to the section and expands it.
 */
import {Button, Header, Label, ListBox, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useState} from 'react';

import {type FormQuestionType, newQuestion, type QuestionDraft} from '@/api/checkins';
import {PickerModal} from '@/builder-kit/picker-modal';
import {QUESTION_PRESET_CATEGORIES, QUESTION_PRESETS} from '@/checkins/question-presets';
import {
  QUESTION_TYPE_ICONS,
  QUESTION_TYPE_ORDER,
  QUESTION_TYPES_WITH_OPTIONS,
  questionTypeLabel,
} from '@/checkins/question-type-meta';

const PALETTE_TITLE = 'Add question';

/** Select/multi-select questions start with one empty option so the options
 *  editor has a row to type into (INTERACTIONS.md § FM/FB). */
function questionOfType(type: FormQuestionType, label = ''): QuestionDraft {
  return {
    ...newQuestion(),
    label,
    options: QUESTION_TYPES_WITH_OPTIONS.includes(type) ? [''] : [],
    type,
  };
}

function QuestionPaletteContent({onPick}: {onPick: (question: QuestionDraft) => void}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Typography
          className="uppercase tracking-wide"
          color="muted"
          type="body-xs"
          weight="bold"
        >
          New question
        </Typography>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUESTION_TYPE_ORDER.map((type) => {
            const Icon = QUESTION_TYPE_ICONS[type];
            return (
              <Button
                // `button--row` = the theme's release from the control tier: a
                // two-line tile is sized by its content, not the 32px sm height
                // (which made `h-auto` here a no-op and the label overflow).
                // The release zeroes border/background, so the tile re-states them.
                className="button--row w-full flex-col gap-1 rounded-control border border-border px-2 py-2 text-center hover:bg-surface-secondary"
                key={type}
                onPress={() => onPick(questionOfType(type))}
                size="sm"
                variant="outline"
              >
                <Icon className="text-muted" />
                <span className="type-eyebrow font-medium">{questionTypeLabel(type)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Typography
          className="uppercase tracking-wide"
          color="muted"
          type="body-xs"
          weight="bold"
        >
          Common questions
        </Typography>
        <ListBox
          aria-label="Common questions"
          className="p-0"
          onAction={(key) => {
            const preset = QUESTION_PRESETS.find((item) => item.key === String(key));
            if (preset) {
              onPick({...questionOfType(preset.type, preset.label), required: preset.required});
            }
          }}
          selectionMode="none"
        >
          {QUESTION_PRESET_CATEGORIES.map((category) => (
            <ListBox.Section key={category}>
              <Header>{category}</Header>
              {QUESTION_PRESETS.filter((preset) => preset.category === category).map((preset) => {
                const Icon = QUESTION_TYPE_ICONS[preset.type];
                return (
                  <ListBox.Item
                    id={preset.key}
                    key={preset.key}
                    textValue={preset.label}
                  >
                    <Icon className="shrink-0 text-muted" />
                    <Label className="max-w-full truncate">{preset.label}</Label>
                  </ListBox.Item>
                );
              })}
            </ListBox.Section>
          ))}
        </ListBox>
      </div>
    </div>
  );
}

export default function AddQuestionControl({onAdd}: {onAdd: (question: QuestionDraft) => void}) {
  const [open, setOpen] = useState(false);

  const pick = (question: QuestionDraft) => {
    setOpen(false);
    onAdd(question);
  };

  return (
    <>
      <Button
        className="w-full rounded-control border border-dashed border-border text-accent"
        onPress={() => setOpen(true)}
        variant="ghost"
      >
        <Plus />
        {PALETTE_TITLE}
      </Button>
      <PickerModal
        bodyClassName="h-[60vh] overflow-y-auto px-4 pb-4 pt-1"
        onClose={() => setOpen(false)}
        open={open}
        title={PALETTE_TITLE}
      >
        <QuestionPaletteContent onPick={pick} />
      </PickerModal>
    </>
  );
}
