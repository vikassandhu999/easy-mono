import type {UseFormReturn} from 'react-hook-form';

import {
  Button,
  Card,
  Description,
  FieldError,
  Fieldset,
  Input,
  Label,
  Spinner,
  Switch,
  TextField,
  Typography,
} from '@heroui/react';
import {Check, ExternalLink, X} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import {Controller} from 'react-hook-form';

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
    watch,
  } = form;
  const [checkSlug] = useCheckSlugAvailabilityMutation();
  const [slugStatus, setSlugStatus] = useState<'available' | 'checking' | 'taken' | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const slugValue = watch('slug');
  const isPublished = watch('is_published');
  const pageUrl = slugValue ? `coacheasy.app/coach/${slugValue}` : '';

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

  return (
    <Fieldset>
      <Fieldset.Legend>Page settings</Fieldset.Legend>
      <Description>Set your storefront URL, theme, and publishing status</Description>

      <Fieldset.Group>
        <Controller
          control={control}
          name="slug"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!errors.slug || slugStatus === 'taken'}
              isRequired
              name={field.name}
              onBlur={field.onBlur}
              onChange={(value) => {
                field.onChange(value);
                handleSlugChange(value);
              }}
              value={field.value}
            >
              <Label>Page URL (required)</Label>
              <Description>coacheasy.app/coach/{slugValue || 'your-page'}</Description>
              {slugStatus === 'taken' && <FieldError>This URL is already taken</FieldError>}
              {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
              <div className="flex items-center gap-2">
                <span className="hidden whitespace-nowrap text-sm text-foreground-500 sm:inline">
                  coacheasy.app/coach/
                </span>
                <Input />
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
            </TextField>
          )}
        />

        <Fieldset>
          <Fieldset.Legend>Theme color</Fieldset.Legend>
          <Controller
            control={control}
            name="theme_color"
            render={({field}) => (
              <Fieldset.Actions>
                {THEME_COLORS.map((themeColor) => (
                  <Button
                    aria-label={themeColor.label}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-full ${themeColor.color} transition-transform ${field.value === themeColor.value ? 'ring-2 ring-offset-2 ring-offset-background' : 'opacity-60'}`}
                    isIconOnly
                    key={themeColor.value}
                    onPress={() => field.onChange(themeColor.value)}
                    size="sm"
                    variant="ghost"
                  >
                    {field.value === themeColor.value ? (
                      <Check
                        className="text-white"
                        size={16}
                      />
                    ) : null}
                  </Button>
                ))}
              </Fieldset.Actions>
            )}
          />
        </Fieldset>

        <Fieldset>
          <Fieldset.Legend>WhatsApp button</Fieldset.Legend>
          <Fieldset.Group>
            <Controller
              control={control}
              name="whatsapp_cta_enabled"
              render={({field}) => (
                <Switch
                  isSelected={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <Typography type="body-sm">Show floating WhatsApp button on my page</Typography>
                  </Switch.Content>
                </Switch>
              )}
            />

            <Controller
              control={control}
              name="whatsapp_cta_message"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.whatsapp_cta_message}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Pre-filled message (optional)</Label>
                  <Description>Message visitors see when they tap the WhatsApp button</Description>
                  {errors.whatsapp_cta_message && <FieldError>{errors.whatsapp_cta_message.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </Fieldset.Group>
        </Fieldset>

        <Card>
          <Card.Content className="flex flex-col gap-3">
            <Controller
              control={control}
              name="is_published"
              render={({field}) => (
                <Switch
                  isSelected={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <Typography
                      type="body-sm"
                      weight="medium"
                    >
                      {field.value ? 'Published' : 'Unpublished'}
                    </Typography>
                  </Switch.Content>
                </Switch>
              )}
            />

            {isPublished ? (
              <div className="flex flex-col gap-1">
                <Typography
                  className="text-success"
                  type="body-xs"
                >
                  Your page is live. Changes appear within 60 seconds after saving.
                </Typography>
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
              <Typography
                color="muted"
                type="body-xs"
              >
                Your page is not visible. Toggle on and save to make it live.
              </Typography>
            )}
          </Card.Content>
        </Card>
      </Fieldset.Group>
    </Fieldset>
  );
}
