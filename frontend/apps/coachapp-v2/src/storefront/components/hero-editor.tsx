import {Description, Fieldset, Typography} from '@heroui/react';
import type {UseFormReturn} from 'react-hook-form';
import {useWatch} from 'react-hook-form';

import {FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function HeroEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {control} = form;

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
            <FormTextField
              control={control}
              fullWidth
              label="Photo URL (optional)"
              name="photo_url"
              type="url"
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
            <FormTextField
              control={control}
              fullWidth
              label="Cover image URL (optional)"
              name="cover_image_url"
              type="url"
            />
          </div>
        </Fieldset.Group>

        <FormTextField
          control={control}
          fullWidth
          isRequired
          label="Display name (required)"
          name="display_name"
        />

        <FormTextField
          control={control}
          description="A short statement about what you help clients achieve"
          fullWidth
          label="Headline (optional)"
          name="headline"
        />

        <FormTextAreaField
          control={control}
          description="Use 2–3 sentences about who you are and what you do"
          fullWidth
          label="Bio (optional)"
          name="bio"
          textAreaProps={{rows: 3}}
        />
      </Fieldset.Group>

      <Fieldset>
        <Fieldset.Legend>Social links</Fieldset.Legend>
        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            label="Instagram (optional)"
            name="instagram"
            type="url"
          />

          <FormTextField
            control={control}
            fullWidth
            label="YouTube (optional)"
            name="youtube"
            type="url"
          />

          <FormTextField
            control={control}
            fullWidth
            label="WhatsApp (optional)"
            name="whatsapp"
          />
        </Fieldset.Group>
      </Fieldset>
    </Fieldset>
  );
}
