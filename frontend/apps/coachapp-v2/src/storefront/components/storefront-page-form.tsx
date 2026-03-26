import {Button, Description, Input, Label, ListBox, Select, Spinner, Switch, TextArea, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Check, ExternalLink, Plus, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Controller, useFieldArray, useForm} from 'react-hook-form';
import {z} from 'zod';

import type {StoreProfile} from '@/api/storefront';

import {applyFormErrors} from '@/api/shared';
import {useCheckSlugAvailabilityMutation, useUpsertStoreProfileMutation} from '@/api/storefront';

// ── Schema ───────────────────────────────────────────────────

const intakeQuestionSchema = z.object({
  label: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  type: z.enum(['text', 'number', 'select']),
});

const schema = z.object({
  bio: z.string().optional(),
  cover_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  display_name: z.string().min(1, 'Display name is required'),
  intake_questions: z.array(intakeQuestionSchema),
  instagram: z.string().optional(),
  is_published: z.boolean(),
  photo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  slug: z
    .string()
    .min(3, 'At least 3 characters')
    .max(60, 'Maximum 60 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Lowercase letters, numbers, and hyphens only. Must start and end with a letter or number.',
    ),
  theme_color: z.enum(['orange', 'blue', 'green', 'purple']),
  whatsapp: z.string().optional(),
  youtube: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const THEME_COLORS = [
  {color: 'bg-orange-500', label: 'Orange', value: 'orange'},
  {color: 'bg-blue-500', label: 'Blue', value: 'blue'},
  {color: 'bg-green-500', label: 'Green', value: 'green'},
  {color: 'bg-purple-500', label: 'Purple', value: 'purple'},
] as const;

const QUESTION_TYPES = [
  {label: 'Text', value: 'text'},
  {label: 'Number', value: 'number'},
  {label: 'Select (dropdown)', value: 'select'},
] as const;

// ── Helpers ──────────────────────────────────────────────────

function profileToFormValues(profile: StoreProfile): FormValues {
  return {
    bio: profile.bio ?? '',
    cover_image_url: profile.cover_image_url ?? '',
    display_name: profile.display_name,
    instagram: profile.social_links?.instagram ?? '',
    intake_questions: (profile.intake_questions ?? []).map((q) => ({
      label: q.label ?? '',
      options: q.options ?? [],
      required: q.required ?? false,
      type: q.type ?? 'text',
    })),
    is_published: profile.is_published,
    photo_url: profile.photo_url ?? '',
    slug: profile.slug,
    theme_color: (['blue', 'green', 'orange', 'purple'].includes(profile.theme_color)
      ? profile.theme_color
      : 'orange') as FormValues['theme_color'],
    whatsapp: profile.social_links?.whatsapp ?? '',
    youtube: profile.social_links?.youtube ?? '',
  };
}

const DEFAULT_VALUES: FormValues = {
  bio: '',
  cover_image_url: '',
  display_name: '',
  instagram: '',
  intake_questions: [],
  is_published: false,
  photo_url: '',
  slug: '',
  theme_color: 'orange',
  whatsapp: '',
  youtube: '',
};

// ── Component ────────────────────────────────────────────────

export default function StorefrontPageForm({profile}: {profile: null | StoreProfile}) {
  const [upsertProfile, {isLoading: isSaving}] = useUpsertStoreProfileMutation();
  const [checkSlug] = useCheckSlugAvailabilityMutation();
  const [slugStatus, setSlugStatus] = useState<'available' | 'checking' | 'taken' | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<FormValues>({
    defaultValues: profile ? undefined : DEFAULT_VALUES,
    resolver: zodResolver(schema),
    values: profile ? profileToFormValues(profile) : undefined,
  });

  const {append, fields, remove} = useFieldArray({control, name: 'intake_questions'});

  const slugValue = watch('slug');
  const originalSlug = profile?.slug;

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(
    (slug: string) => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
      if (!slug || slug.length < 3 || slug === originalSlug) {
        setSlugStatus(null);
        return;
      }
      setSlugStatus('checking');
      slugTimerRef.current = setTimeout(async () => {
        try {
          const result = await checkSlug({slug}).unwrap();
          setSlugStatus(result.available ? 'available' : 'taken');
        } catch {
          setSlugStatus(null);
        }
      }, 300);
    },
    [checkSlug, originalSlug],
  );

  useEffect(() => {
    checkSlugAvailability(slugValue);
    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, [slugValue, checkSlugAvailability]);

  const onSubmit = async (data: FormValues) => {
    const socialLinks: Record<string, string> = {};
    if (data.instagram) socialLinks.instagram = data.instagram;
    if (data.youtube) socialLinks.youtube = data.youtube;
    if (data.whatsapp) socialLinks.whatsapp = data.whatsapp;

    try {
      await upsertProfile({
        bio: data.bio || undefined,
        cover_image_url: data.cover_image_url || undefined,
        display_name: data.display_name,
        intake_questions: data.intake_questions.map((q) => ({
          label: q.label,
          options: q.type === 'select' ? (q.options ?? []).filter(Boolean) : undefined,
          required: q.required ?? false,
          type: q.type,
        })),
        is_published: data.is_published,
        photo_url: data.photo_url || undefined,
        slug: data.slug,
        social_links: socialLinks,
        theme_color: data.theme_color,
      }).unwrap();
      toast.success('Profile saved');
    } catch (err) {
      applyFormErrors(err, 'Failed to save profile. Please try again.', setError);
    }
  };

  const pageUrl = slugValue ? `coachapp.com/coach/${slugValue}` : '';

  return (
    <form
      className="flex max-w-2xl flex-col gap-8"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* ── Publish toggle + preview ─────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-divider bg-content1 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Controller
          control={control}
          name="is_published"
          render={({field}) => (
            <Switch
              isSelected={field.value}
              onChange={field.onChange}
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <span className="text-sm font-medium">{field.value ? 'Published' : 'Unpublished'}</span>
              </Switch.Content>
            </Switch>
          )}
        />
        {pageUrl && (
          <a
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary hover:underline"
            href={`https://${pageUrl}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink size={14} />
            {pageUrl}
          </a>
        )}
      </div>

      {/* ── Profile section ──────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Profile</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">Display name *</Label>
          <Input
            id="display_name"
            placeholder="Fitness Junction"
            {...register('display_name')}
          />
          {errors.display_name && <p className="text-xs text-danger">{errors.display_name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Page URL *</Label>
          <div className="flex items-center gap-2">
            <span className="hidden whitespace-nowrap text-sm text-foreground-500 sm:inline">coachapp.com/coach/</span>
            <div className="flex-1">
              <Input
                id="slug"
                placeholder="fitness-junction"
                {...register('slug')}
              />
            </div>
            {slugStatus === 'checking' && <Spinner size="sm" />}
            {slugStatus === 'available' && (
              <Check
                className="text-success"
                size={18}
              />
            )}
            {slugStatus === 'taken' && (
              <X
                className="text-danger"
                size={18}
              />
            )}
          </div>
          <Description className="sm:hidden">coachapp.com/coach/{slugValue || '...'}</Description>
          {slugStatus === 'taken' && <p className="text-xs text-danger">This slug is already taken</p>}
          {errors.slug && <p className="text-xs text-danger">{errors.slug.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <TextArea
            id="bio"
            placeholder="Certified personal trainer with 6+ years of experience..."
            rows={3}
            {...register('bio')}
          />
          {errors.bio && <p className="text-xs text-danger">{errors.bio.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photo_url">Photo URL</Label>
            <Input
              id="photo_url"
              placeholder="https://cdn.example.com/photo.jpg"
              type="url"
              {...register('photo_url')}
            />
            {errors.photo_url && <p className="text-xs text-danger">{errors.photo_url.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cover_image_url">Cover image URL</Label>
            <Input
              id="cover_image_url"
              placeholder="https://cdn.example.com/cover.jpg"
              type="url"
              {...register('cover_image_url')}
            />
            {errors.cover_image_url && <p className="text-xs text-danger">{errors.cover_image_url.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Theme color</Label>
          <Controller
            control={control}
            name="theme_color"
            render={({field}) => (
              <div className="flex gap-3">
                {THEME_COLORS.map((tc) => (
                  <button
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-full ${tc.color} transition-transform ${field.value === tc.value ? 'ring-2 ring-offset-2 ring-offset-background' : 'opacity-60'}`}
                    key={tc.value}
                    onClick={() => field.onChange(tc.value)}
                    title={tc.label}
                    type="button"
                  >
                    {field.value === tc.value && (
                      <Check
                        className="text-white"
                        size={16}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.theme_color && <p className="text-xs text-danger">{errors.theme_color.message}</p>}
        </div>
      </fieldset>

      {/* ── Social links section ─────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Social links</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            placeholder="https://instagram.com/fitness_junction"
            type="url"
            {...register('instagram')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="youtube">YouTube</Label>
          <Input
            id="youtube"
            placeholder="https://youtube.com/@fitnessjunction"
            type="url"
            {...register('youtube')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="+91 98765 43210"
            {...register('whatsapp')}
          />
        </div>
      </fieldset>

      {/* ── Intake form questions section ────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Intake form questions</legend>
        <p className="text-xs text-foreground-500">
          Default fields (Name, Email, Phone, Instagram) are always shown. Add custom questions below.
        </p>

        {fields.map((field, index) => (
          <IntakeQuestionRow
            control={control}
            errors={errors}
            index={index}
            key={field.id}
            onRemove={() => remove(index)}
            register={register}
            watch={watch}
          />
        ))}

        <Button
          className="self-start"
          onPress={() => append({label: '', options: [], required: false, type: 'text'})}
          size="sm"
          variant="ghost"
        >
          <Plus size={16} />
          Add question
        </Button>
      </fieldset>

      {/* ── Footer ───────────────────────────────────────────── */}
      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          isPending={isSaving}
          type="submit"
        >
          {isSaving ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </form>
  );
}

// ── Intake Question Row ──────────────────────────────────────

function IntakeQuestionRow({
  control,
  errors,
  index,
  onRemove,
  register,
  watch,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors'];
  index: number;
  onRemove: () => void;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  watch: ReturnType<typeof useForm<FormValues>>['watch'];
}) {
  const questionType = watch(`intake_questions.${index}.type`);
  const questionErrors = errors.intake_questions?.[index];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-divider p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Input
              placeholder="Question text"
              {...register(`intake_questions.${index}.label`)}
            />
            {questionErrors?.label && <p className="text-xs text-danger">{questionErrors.label.message}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Controller
              control={control}
              name={`intake_questions.${index}.type`}
              render={({field}) => (
                <Select
                  className="w-full sm:w-48"
                  onSelectionChange={(key) => field.onChange(key)}
                  placeholder="Type"
                  selectedKey={field.value || null}
                >
                  <Label>Type</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {QUESTION_TYPES.map((qt) => (
                        <ListBox.Item
                          id={qt.value}
                          key={qt.value}
                          textValue={qt.label}
                        >
                          {qt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            />
            <Controller
              control={control}
              name={`intake_questions.${index}.required`}
              render={({field}) => (
                <Switch
                  isSelected={field.value ?? false}
                  onChange={field.onChange}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <span className="text-xs">Required</span>
                  </Switch.Content>
                </Switch>
              )}
            />
          </div>
        </div>

        <Button
          isIconOnly
          onPress={onRemove}
          size="sm"
          variant="ghost"
        >
          <X size={14} />
        </Button>
      </div>

      {questionType === 'select' && (
        <SelectOptionsEditor
          control={control}
          index={index}
          watch={watch}
        />
      )}
    </div>
  );
}

// ── Select Options Editor ────────────────────────────────────

function SelectOptionsEditor({
  control,
  index,
  watch,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  index: number;
  watch: ReturnType<typeof useForm<FormValues>>['watch'];
}) {
  const options = watch(`intake_questions.${index}.options`) ?? [];
  const {append, remove} = useFieldArray({
    control,
    // @ts-expect-error — nested field array path typing limitation with string arrays
    name: `intake_questions.${index}.options`,
  });

  return (
    <div className="flex flex-col gap-2 pl-2">
      <Label className="text-xs text-foreground-500">Options</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option, optionIndex) => (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-default-100 px-3 py-1 text-xs"
            key={optionIndex}
          >
            {option || `Option ${optionIndex + 1}`}
            <button
              className="ml-1 flex min-h-7 min-w-7 items-center justify-center rounded-full hover:bg-default-200 active:bg-default-300"
              onClick={() => remove(optionIndex)}
              type="button"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {/* @ts-expect-error — useFieldArray append types don't support nested string arrays well */}
      <OptionAdder onAdd={(value) => append(value)} />
    </div>
  );
}

function OptionAdder({onAdd}: {onAdd: (value: string) => void}) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder="Add option..."
        value={value}
      />
      <Button
        isDisabled={!value.trim()}
        onPress={handleAdd}
        size="sm"
        variant="ghost"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
