import {Button, Typography, toast} from '@heroui/react';
import {ArrowLeft, ExternalLink, Plus, Trash2} from 'lucide-react';
import {type ReactNode, useEffect, useId, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import SectionHeading from '@/@components/section-heading';
import {ROUTES} from '@/@config/routes';
import {
  draftToRequest,
  emptyLandingDraft,
  type FitDraft,
  type LandingDraft,
  landingToDraft,
  type ProgramDraft,
  type QuestionDraft,
  type QuestionType,
  TEMPLATES,
  useGetLandingPageQuery,
  useSaveLandingPageMutation,
} from '@/api/landing-page';
import {useGetCoachProfileQuery} from '@/api/profile';
import {getApiErrorMessage, getValidationErrors} from '@/api/shared';

const MAX_PROGRAMS = 3;
const MAX_QUESTIONS = 5;
const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3000';

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-muted';

const key = () => crypto.randomUUID();

function TextRow({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  description,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  description?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label
        className="mb-1 block text-sm font-medium"
        htmlFor={id}
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          className={`${inputCls} min-h-20 resize-y ${error ? 'border-danger' : ''}`}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className={`${inputCls} ${error ? 'border-danger' : ''}`}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
      {error ? (
        <Typography
          className="mt-1 text-danger"
          type="body-xs"
        >
          {error}
        </Typography>
      ) : description ? (
        <Typography
          className="mt-1 break-words"
          color="muted"
          type="body-xs"
        >
          {description}
        </Typography>
      ) : null}
    </div>
  );
}

function Card({children}: {children: ReactNode}) {
  return <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">{children}</div>;
}

export default function LandingPageEditor() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useGetLandingPageQuery();
  const {data: profile} = useGetCoachProfileQuery();
  const [save, {isLoading: isSaving}] = useSaveLandingPageMutation();

  const [draft, setDraft] = useState<LandingDraft | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Seed the draft once the page loads (or start blank when none exists yet).
  useEffect(() => {
    if (draft === null && !isLoading && !isError) {
      setDraft(data?.data ? landingToDraft(data.data) : emptyLandingDraft());
    }
  }, [data, draft, isError, isLoading]);

  const update = (patch: Partial<LandingDraft>) => setDraft((d) => (d ? {...d, ...patch} : d));

  const whatsappConfigured = Boolean(profile?.data.business.whatsapp_number);

  const handleSave = async (status: 'draft' | 'published') => {
    if (!draft) {
      return;
    }
    setSlugError(null);
    const next = {...draft, status};
    setDraft(next);
    try {
      await save({landingPageUpsertRequest: draftToRequest(next)}).unwrap();
      toast.success(status === 'published' ? 'Page published' : 'Draft saved');
    } catch (error) {
      // Surface a taken slug / second-published-page conflict inline on the field.
      const fields = getValidationErrors(error);
      const slugMsg = fields?.slug?.[0] ?? fields?.status?.[0];
      if (slugMsg) {
        setSlugError(fields?.slug ? slugMsg : null);
        toast.danger(slugMsg);
      } else {
        toast.danger(getApiErrorMessage(error, "Couldn't save the page"));
      }
    }
  };

  const header = (
    <Page.Header>
      <button
        className="mb-2 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        onClick={() => navigate(ROUTES.SETTINGS)}
        type="button"
      >
        <ArrowLeft size={16} /> Settings
      </button>
      <Page.TitleGroup>
        <Page.Title>Landing page</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading || !draft) {
    return (
      <Page>
        {header}
        <Page.Content className="pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        {header}
        <Page.Content className="pb-6">
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Typography
              color="muted"
              type="body-sm"
            >
              Couldn't load your landing page.
            </Typography>
            <Button
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const isPublished = draft.status === 'published';
  const publicUrl = `${PUBLIC_SITE_URL}/${draft.slug}`;

  return (
    <Page>
      {header}
      <Page.Content className="pb-28">
        <div className="flex max-w-2xl flex-col gap-6">
          {/* Template */}
          <section>
            <SectionHeading title="Template" />
            <div className="grid gap-2 sm:grid-cols-3">
              {TEMPLATES.map((tpl) => {
                const selected = draft.template === tpl.value;
                return (
                  <button
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                        : 'border-border bg-surface hover:border-accent/50'
                    }`}
                    key={tpl.value}
                    onClick={() => update({template: tpl.value})}
                    type="button"
                  >
                    <Typography weight="medium">{tpl.label}</Typography>
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {tpl.blurb}
                    </Typography>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Basics */}
          <section>
            <SectionHeading title="Page" />
            <Card>
              <div className="flex flex-col gap-4">
                <TextRow
                  description={slugError ? undefined : `Public address: ${publicUrl}`}
                  error={slugError ?? undefined}
                  label="Slug"
                  onChange={(v) => {
                    setSlugError(null);
                    update({slug: v});
                  }}
                  placeholder="kavya-strength"
                  value={draft.slug}
                />
                <TextRow
                  description="The 'who this is for' line above the headline."
                  label="Eyebrow"
                  onChange={(v) => update({eyebrow: v})}
                  placeholder="Online coaching for busy lifters"
                  value={draft.eyebrow}
                />
                <TextRow
                  label="Headline"
                  onChange={(v) => update({headline: v})}
                  placeholder="Build strength without guessing what to do next."
                  value={draft.headline}
                />
                <TextRow
                  label="Subheadline"
                  onChange={(v) => update({subheadline: v})}
                  placeholder="Personal coaching for people who train hard but need structure."
                  textarea
                  value={draft.subheadline}
                />
                <TextRow
                  description="A coach photo or training image shown in the hero."
                  label="Hero image URL"
                  onChange={(v) => update({hero_image_url: v})}
                  placeholder="https://…/photo.jpg"
                  value={draft.hero_image_url}
                />
                <TextRow
                  description="Shown prominently on the Coach story template."
                  label="Coach intro"
                  onChange={(v) => update({coach_intro: v})}
                  placeholder="Short story, coaching philosophy, who gets the best results."
                  textarea
                  value={draft.coach_intro}
                />
              </div>
            </Card>
          </section>

          {/* Proof points */}
          <ProofPointsEditor
            points={draft.proof_points}
            onChange={(proof_points) => update({proof_points})}
          />

          {/* Fit points (Problem-fit template) */}
          <FitPointsEditor
            onChange={(fit_points) => update({fit_points})}
            points={draft.fit_points}
          />

          {/* Programs */}
          <ProgramsEditor
            programs={draft.programs}
            onChange={(programs) => update({programs})}
          />

          {/* Questions */}
          <QuestionsEditor
            questions={draft.application_questions}
            onChange={(application_questions) => update({application_questions})}
          />

          {/* WhatsApp */}
          <section>
            <SectionHeading title="WhatsApp follow-up" />
            <Card>
              {whatsappConfigured ? (
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Applicants will see a "Send on WhatsApp" button after submitting, using your business number.
                </Typography>
              ) : (
                <div className="flex flex-col gap-2">
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    Add a business WhatsApp number to let applicants message you right after applying.
                  </Typography>
                  <Button
                    className="self-start"
                    onPress={() => navigate(ROUTES.SETTINGS)}
                    size="sm"
                    variant="secondary"
                  >
                    Add in Settings
                  </Button>
                </div>
              )}
            </Card>
          </section>
        </div>
      </Page.Content>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:px-6 lg:left-64 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
          <Button
            isDisabled={!draft.slug || !isPublished}
            onPress={() => window.open(publicUrl, '_blank', 'noopener')}
            size="sm"
            variant="ghost"
          >
            <ExternalLink size={16} /> Preview
          </Button>
          <div className="flex items-center gap-2">
            <Button
              isDisabled={isSaving}
              onPress={() => handleSave('draft')}
              size="sm"
              variant="secondary"
            >
              Save draft
            </Button>
            <Button
              isDisabled={isSaving}
              onPress={() => handleSave('published')}
              size="sm"
            >
              {isPublished ? 'Update' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}

function ProofPointsEditor({
  points,
  onChange,
}: {
  points: LandingDraft['proof_points'];
  onChange: (p: LandingDraft['proof_points']) => void;
}) {
  return (
    <section>
      <SectionHeading title="Proof points" />
      <Card>
        <div className="flex flex-col gap-3">
          {points.length === 0 ? (
            <Typography
              color="muted"
              type="body-sm"
            >
              Numbers that build trust, e.g. "220+ clients coached".
            </Typography>
          ) : null}
          {points.map((point, index) => (
            <div
              className="flex items-end gap-2"
              key={point.key}
            >
              <div className="w-28 shrink-0">
                <TextRow
                  label="Value"
                  onChange={(v) => onChange(points.map((p, i) => (i === index ? {...p, value: v} : p)))}
                  placeholder="220+"
                  value={point.value}
                />
              </div>
              <div className="flex-1 min-w-0">
                <TextRow
                  label="Label"
                  onChange={(v) => onChange(points.map((p, i) => (i === index ? {...p, label: v} : p)))}
                  placeholder="clients coached"
                  value={point.label}
                />
              </div>
              <Button
                isIconOnly
                aria-label="Remove proof point"
                onPress={() => onChange(points.filter((_, i) => i !== index))}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button
            className="self-start"
            onPress={() => onChange([...points, {key: key(), label: '', value: ''}])}
            size="sm"
            variant="ghost"
          >
            <Plus size={16} /> Add proof point
          </Button>
        </div>
      </Card>
    </section>
  );
}

function FitPointsEditor({onChange, points}: {onChange: (p: FitDraft[]) => void; points: FitDraft[]}) {
  return (
    <section>
      <SectionHeading title="Fit list" />
      <Card>
        <div className="flex flex-col gap-3">
          <Typography
            color="muted"
            type="body-xs"
          >
            "This is for you if…" qualifiers — featured on the Problem-fit template.
          </Typography>
          {points.map((point, index) => (
            <div
              className="flex items-center gap-2"
              key={point.key}
            >
              <input
                className={`${inputCls} min-w-0`}
                onChange={(e) => onChange(points.map((p, i) => (i === index ? {...p, value: e.target.value} : p)))}
                placeholder="You have tried plans but can't stay consistent."
                value={point.value}
              />
              <Button
                isIconOnly
                aria-label="Remove fit point"
                onPress={() => onChange(points.filter((_, i) => i !== index))}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button
            className="self-start"
            onPress={() => onChange([...points, {key: crypto.randomUUID(), value: ''}])}
            size="sm"
            variant="ghost"
          >
            <Plus size={16} /> Add fit point
          </Button>
        </div>
      </Card>
    </section>
  );
}

function ProgramsEditor({programs, onChange}: {programs: ProgramDraft[]; onChange: (p: ProgramDraft[]) => void}) {
  const set = (index: number, patch: Partial<ProgramDraft>) =>
    onChange(programs.map((p, i) => (i === index ? {...p, ...patch} : p)));

  return (
    <section>
      <SectionHeading title={`Programs (${programs.length}/${MAX_PROGRAMS})`} />
      <div className="flex flex-col gap-3">
        {programs.map((program, index) => (
          <Card key={program.key}>
            <div className="mb-3 flex items-center justify-between">
              <Typography
                color="muted"
                type="body-xs"
              >
                Program {index + 1}
              </Typography>
              <Button
                isIconOnly
                aria-label="Remove program"
                isDisabled={programs.length === 1}
                onPress={() => onChange(programs.filter((_, i) => i !== index))}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <TextRow
                label="Name"
                onChange={(v) => set(index, {name: v})}
                placeholder="Fat loss coaching"
                value={program.name}
              />
              <TextRow
                label="Audience / promise"
                onChange={(v) => set(index, {audience: v})}
                placeholder="For people who need structure and weekly review."
                value={program.audience}
              />
              <TextRow
                label="Description"
                onChange={(v) => set(index, {description: v})}
                placeholder="What this program includes."
                textarea
                value={program.description}
              />
              <TextRow
                label="Price"
                onChange={(v) => set(index, {price_display: v})}
                placeholder="From ₹6,000 / month"
                value={program.price_display}
              />
            </div>
          </Card>
        ))}
        <Button
          className="self-start"
          isDisabled={programs.length >= MAX_PROGRAMS}
          onPress={() =>
            onChange([...programs, {key: key(), name: '', audience: '', description: '', price_display: ''}])
          }
          size="sm"
          variant="ghost"
        >
          <Plus size={16} /> Add program
        </Button>
      </div>
    </section>
  );
}

const QUESTION_TYPES: {value: QuestionType; label: string}[] = [
  {value: 'short_text', label: 'Short text'},
  {value: 'long_text', label: 'Long text'},
  {value: 'single_select', label: 'Single select'},
];

function QuestionsEditor({questions, onChange}: {questions: QuestionDraft[]; onChange: (q: QuestionDraft[]) => void}) {
  const set = (index: number, patch: Partial<QuestionDraft>) =>
    onChange(questions.map((q, i) => (i === index ? {...q, ...patch} : q)));

  return (
    <section>
      <SectionHeading title={`Application questions (${questions.length}/${MAX_QUESTIONS})`} />
      <div className="flex flex-col gap-3">
        {questions.map((question, index) => (
          <Card key={question.key}>
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-3">
                <TextRow
                  label="Question"
                  onChange={(v) => set(index, {label: v})}
                  placeholder="What is your main goal?"
                  value={question.label}
                />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Answer type</span>
                  <select
                    className={inputCls}
                    onChange={(e) => set(index, {type: e.target.value as QuestionType})}
                    value={question.type}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option
                        key={t.value}
                        value={t.value}
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                {question.type === 'single_select' ? (
                  <TextRow
                    description="Comma-separated options."
                    label="Options"
                    onChange={(v) =>
                      set(index, {
                        options: v
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Beginner, Intermediate, Advanced"
                    value={question.options.join(', ')}
                  />
                ) : null}
              </div>
              <Button
                isIconOnly
                aria-label="Remove question"
                onPress={() => onChange(questions.filter((_, i) => i !== index))}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
        <Button
          className="self-start"
          isDisabled={questions.length >= MAX_QUESTIONS}
          onPress={() => onChange([...questions, {key: key(), id: key(), label: '', type: 'short_text', options: []}])}
          size="sm"
          variant="ghost"
        >
          <Plus size={16} /> Add question
        </Button>
      </div>
    </section>
  );
}
