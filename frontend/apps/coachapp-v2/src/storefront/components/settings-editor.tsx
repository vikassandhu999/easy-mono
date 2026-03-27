import {Card, Description, Input, Label, Spinner, Switch} from '@heroui/react';
import {Check, ExternalLink, X} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import {Controller, type UseFormReturn} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

import {useCheckSlugAvailabilityMutation} from '@/api/storefront';

const THEME_COLORS = [
  {color: 'bg-orange-500', label: 'Orange', value: 'orange'},
  {color: 'bg-blue-500', label: 'Blue', value: 'blue'},
  {color: 'bg-green-500', label: 'Green', value: 'green'},
  {color: 'bg-purple-500', label: 'Purple', value: 'purple'},
] as const;

export default function SettingsEditor({
  form,
  originalSlug,
}: {
  form: UseFormReturn<EditorFormValues>;
  originalSlug: string | undefined;
}) {
  const {
    control,
    formState: {errors},
    register,
    watch,
  } = form;
  const [checkSlug] = useCheckSlugAvailabilityMutation();
  const [slugStatus, setSlugStatus] = useState<'available' | 'checking' | 'taken' | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const slugValue = watch('slug');
  const isPublished = watch('is_published');
  const pageUrl = slugValue ? `coacheasy.app/coach/${slugValue}` : '';

  // Debounced slug check — called from the onChange handler, not from useEffect
  const handleSlugChange = useCallback(
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

  const slugRegistration = register('slug');

  return (
    <div className="flex flex-col gap-5">
      {/* Page URL */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Page URL *</Label>
        <div className="flex items-center gap-2">
          <span className="hidden whitespace-nowrap text-sm text-foreground-500 sm:inline">coacheasy.app/coach/</span>
          <div className="flex-1">
            <Input
              id="slug"
              placeholder="fitness-junction"
              {...slugRegistration}
              onChange={(e) => {
                slugRegistration.onChange(e);
                handleSlugChange(e.target.value);
              }}
            />
          </div>
          {slugStatus === 'checking' ? <Spinner size="sm" /> : null}
          {slugStatus === 'available' ? (
            <Check
              className="text-success"
              size={18}
            />
          ) : null}
          {slugStatus === 'taken' ? (
            <X
              className="text-danger"
              size={18}
            />
          ) : null}
        </div>
        <Description className="sm:hidden">coacheasy.app/coach/{slugValue || '...'}</Description>
        {slugStatus === 'taken' ? <p className="text-xs text-danger">This slug is already taken</p> : null}
        {errors.slug ? <p className="text-xs text-danger">{errors.slug.message}</p> : null}
      </div>

      {/* Theme color */}
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
                  {field.value === tc.value ? (
                    <Check
                      className="text-white"
                      size={16}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* WhatsApp CTA */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">WhatsApp button</p>
        <Controller
          control={control}
          name="whatsapp_cta_enabled"
          render={({field}) => (
            <Switch
              isSelected={field.value}
              onChange={field.onChange}
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <span className="text-sm">Show floating WhatsApp button on my page</span>
              </Switch.Content>
            </Switch>
          )}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="whatsapp_cta_message">Pre-filled message</Label>
          <Input
            id="whatsapp_cta_message"
            placeholder="Hi! I'm interested in your coaching services."
            {...register('whatsapp_cta_message')}
          />
          <Description>Message visitors see when they tap the WhatsApp button.</Description>
        </div>
      </div>

      {/* Publish toggle */}
      <Card>
        <Card.Content className="flex flex-col gap-3">
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

          {isPublished ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-success">Your page is live. Changes appear within 60 seconds after saving.</p>
              {pageUrl ? (
                <a
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary hover:underline"
                  href={`https://${pageUrl}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={14} />
                  {pageUrl}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-foreground-400">Your page is not visible. Toggle on and save to make it live.</p>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
