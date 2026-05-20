import type {UseFormReturn} from 'react-hook-form';

import {Description, FieldError, Fieldset, Input, Label, TextArea, TextField, Typography} from '@heroui/react';
import {Controller, useWatch} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function HeroEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    control,
    formState: {errors},
  } = form;

  const photoUrl = useWatch({control, name: 'photo_url'});
  const coverUrl = useWatch({control, name: 'cover_image_url'});

  return (
    <Fieldset>
      <Fieldset.Legend>Hero section</Fieldset.Legend>
      <Description>Add the profile content that appears at the top of your storefront</Description>

      <Fieldset.Group>
        <Fieldset.Group>
          <div className="flex flex-col gap-2">
            <Typography weight="medium">Photo</Typography>
            {photoUrl ? (
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-divider bg-default-100">
                <img
                  alt="Profile"
                  className="h-full w-full object-cover"
                  src={photoUrl}
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-divider bg-default-50 text-xs text-foreground-400">
                No photo
              </div>
            )}
            <Controller
              control={control}
              name="photo_url"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.photo_url}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  type="url"
                  value={field.value ?? ''}
                >
                  <Label>Photo URL (optional)</Label>
                  {errors.photo_url && <FieldError>{errors.photo_url.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Typography weight="medium">Cover image</Typography>
            {coverUrl ? (
              <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-divider bg-default-100">
                <img
                  alt="Cover"
                  className="h-full w-full object-cover"
                  src={coverUrl}
                />
              </div>
            ) : (
              <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-divider bg-default-50 text-xs text-foreground-400">
                No cover
              </div>
            )}
            <Controller
              control={control}
              name="cover_image_url"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.cover_image_url}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  type="url"
                  value={field.value ?? ''}
                >
                  <Label>Cover image URL (optional)</Label>
                  {errors.cover_image_url && <FieldError>{errors.cover_image_url.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </div>
        </Fieldset.Group>

        <Controller
          control={control}
          name="display_name"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!errors.display_name}
              isRequired
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value}
            >
              <Label>Display name (required)</Label>
              {errors.display_name && <FieldError>{errors.display_name.message}</FieldError>}
              <Input />
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="headline"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!errors.headline}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value ?? ''}
            >
              <Label>Headline (optional)</Label>
              <Description>A short statement about what you help clients achieve</Description>
              {errors.headline && <FieldError>{errors.headline.message}</FieldError>}
              <Input />
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!errors.bio}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value ?? ''}
            >
              <Label>Bio (optional)</Label>
              <Description>Use 2–3 sentences about who you are and what you do</Description>
              {errors.bio && <FieldError>{errors.bio.message}</FieldError>}
              <TextArea rows={3} />
            </TextField>
          )}
        />
      </Fieldset.Group>

      <Fieldset>
        <Fieldset.Legend>Social links</Fieldset.Legend>
        <Fieldset.Group>
          <Controller
            control={control}
            name="instagram"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.instagram}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="url"
                value={field.value ?? ''}
              >
                <Label>Instagram (optional)</Label>
                {errors.instagram && <FieldError>{errors.instagram.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="youtube"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.youtube}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="url"
                value={field.value ?? ''}
              >
                <Label>YouTube (optional)</Label>
                {errors.youtube && <FieldError>{errors.youtube.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="whatsapp"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.whatsapp}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>WhatsApp (optional)</Label>
                {errors.whatsapp && <FieldError>{errors.whatsapp.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>
    </Fieldset>
  );
}
