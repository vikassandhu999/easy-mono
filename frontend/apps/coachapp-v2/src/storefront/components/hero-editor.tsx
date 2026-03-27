import type {UseFormReturn} from 'react-hook-form';

import {Description, Input, Label, TextArea} from '@heroui/react';
import {useWatch} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function HeroEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    formState: {errors},
    register,
  } = form;

  const photoUrl = useWatch({control: form.control, name: 'photo_url'});
  const coverUrl = useWatch({control: form.control, name: 'cover_image_url'});

  return (
    <div className="flex flex-col gap-4">
      {/* Photo + Cover thumbnails */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Photo</Label>
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
          <Input
            placeholder="https://cdn.example.com/photo.jpg"
            type="url"
            {...register('photo_url')}
          />
          {errors.photo_url ? <p className="text-xs text-danger">{errors.photo_url.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cover image</Label>
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
          <Input
            placeholder="https://cdn.example.com/cover.jpg"
            type="url"
            {...register('cover_image_url')}
          />
          {errors.cover_image_url ? <p className="text-xs text-danger">{errors.cover_image_url.message}</p> : null}
        </div>
      </div>

      {/* Display name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Display name *</Label>
        <Input
          id="display_name"
          placeholder="Fitness Junction"
          {...register('display_name')}
        />
        {errors.display_name ? <p className="text-xs text-danger">{errors.display_name.message}</p> : null}
      </div>

      {/* Headline */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          placeholder="Transform your body in 12 weeks"
          {...register('headline')}
        />
        <Description>
          A bold statement about what you help clients achieve. e.g. &ldquo;Custom coaching for serious results&rdquo;
        </Description>
        {errors.headline ? <p className="text-xs text-danger">{errors.headline.message}</p> : null}
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <TextArea
          id="bio"
          placeholder="Certified personal trainer with 6+ years of experience..."
          rows={3}
          {...register('bio')}
        />
        <Description>2-3 sentences about who you are and what you do.</Description>
        {errors.bio ? <p className="text-xs text-danger">{errors.bio.message}</p> : null}
      </div>

      {/* Social links */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Social links</p>

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
      </div>
    </div>
  );
}
