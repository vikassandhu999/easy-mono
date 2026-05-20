import {Alert, Button, Form, Spinner, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, Eye, Save} from 'lucide-react';
import {useRef, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {Link} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import type {Offer} from '@/api/offers';
import {useListOffersQuery} from '@/api/offers';
import {applyFormErrors} from '@/api/shared';
import type {StoreProfile} from '@/api/storefront';
import {useGetStoreProfileQuery, useUpsertStoreProfileMutation} from '@/api/storefront';
import type {Testimonial} from '@/api/testimonials';
import {useListTestimonialsQuery} from '@/api/testimonials';
import EditorPanel from '@/storefront/components/editor-panel';
import {type EditorFormValues, editorSchema} from '@/storefront/components/editor-schema';
import PreviewPanel from '@/storefront/components/preview-panel';

const PREVIEW_BASE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'https://coacheasy.app';

export function getPreviewUrl(slug: string) {
  return `${PREVIEW_BASE_URL}/coach/${slug}?preview=true`;
}

function profileToFormValues(profile: StoreProfile): EditorFormValues {
  return {
    bio: profile.bio ?? '',
    cover_image_url: profile.cover_image_url ?? '',
    display_name: profile.display_name,
    faq_items: profile.faq_items,
    headline: profile.headline ?? '',
    instagram: profile.social_links?.instagram ?? '',
    intake_questions: profile.intake_questions.map((q) => ({
      label: q.label,
      options: q.options ?? [],
      required: q.required ?? false,
      type: q.type,
    })),
    is_published: profile.is_published,
    photo_url: profile.photo_url ?? '',
    slug: profile.slug,
    theme_color: profile.theme_color,
    trust_stats: profile.trust_stats,
    whatsapp: profile.social_links?.whatsapp ?? '',
    whatsapp_cta_enabled: profile.whatsapp_cta_enabled,
    whatsapp_cta_message: profile.whatsapp_cta_message ?? '',
    youtube: profile.social_links?.youtube ?? '',
  };
}

const DEFAULT_VALUES: EditorFormValues = {
  bio: '',
  cover_image_url: '',
  display_name: '',
  faq_items: [],
  headline: '',
  instagram: '',
  intake_questions: [],
  is_published: false,
  photo_url: '',
  slug: '',
  theme_color: 'orange',
  trust_stats: [],
  whatsapp: '',
  whatsapp_cta_enabled: false,
  whatsapp_cta_message: '',
  youtube: '',
};

export default function StorefrontEditor() {
  const {data, isError, isLoading} = useGetStoreProfileQuery();
  const {data: offersData} = useListOffersQuery();
  const {data: testimonialsData} = useListTestimonialsQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Spinner color="accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-20">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load profile</Alert.Title>
            <Alert.Description>Please try again later.</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const profile = data?.data ?? null;
  const offers = offersData?.data ?? [];
  const testimonials = testimonialsData?.data ?? [];

  return (
    <EditorInner
      offers={offers}
      profile={profile}
      testimonials={testimonials}
    />
  );
}

function EditorInner({
  offers,
  profile,
  testimonials,
}: {
  offers: Offer[];
  profile: null | StoreProfile;
  testimonials: Testimonial[];
}) {
  const [upsertProfile, {isLoading: isSaving}] = useUpsertStoreProfileMutation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const form = useForm<EditorFormValues>({
    defaultValues: profile ? undefined : DEFAULT_VALUES,
    resolver: zodResolver(editorSchema),
    values: profile ? profileToFormValues(profile) : undefined,
  });

  const slugValue = useWatch({control: form.control, name: 'slug'});

  const onSubmit = async (data: EditorFormValues) => {
    const socialLinks: Record<string, string> = {};
    if (data.instagram) {
      socialLinks.instagram = data.instagram;
    }
    if (data.youtube) {
      socialLinks.youtube = data.youtube;
    }
    if (data.whatsapp) {
      socialLinks.whatsapp = data.whatsapp;
    }

    try {
      await upsertProfile({
        bio: data.bio || undefined,
        cover_image_url: data.cover_image_url || undefined,
        display_name: data.display_name,
        faq_items: data.faq_items.filter((f) => f.question && f.answer),
        headline: data.headline || undefined,
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
        trust_stats: data.trust_stats.filter((s) => s.value && s.label),
        whatsapp_cta_enabled: data.whatsapp_cta_enabled,
        whatsapp_cta_message: data.whatsapp_cta_message || undefined,
      }).unwrap();
      toast.success('Profile saved');
      // Reload preview iframe after ISR revalidation
      setTimeout(() => {
        const iframe = iframeRef.current;
        if (iframe) {
          const url = iframe.src;
          iframe.src = '';
          iframe.src = url;
        }
      }, 500);
    } catch (err) {
      applyFormErrors(err, "Profile wasn't saved. Check the details and try again", form.setError);
    }
  };

  if (showMobilePreview) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
          <Button
            onPress={() => setShowMobilePreview(false)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back to editor
          </Button>
        </div>
        <div className="flex-1">
          {slugValue ? (
            <iframe
              className="h-full w-full border-0"
              src={getPreviewUrl(slugValue)}
              title="Storefront preview"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-foreground-500">
              Set a page URL slug to see your preview.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Form
      className="flex h-[calc(100vh-64px)] flex-col gap-0 lg:h-screen"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit(onSubmit)(event);
      }}
    >
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            className="flex min-h-11 items-center text-sm font-medium text-foreground-500 hover:text-foreground active:text-foreground"
            to={ROUTES.STOREFRONT}
          >
            <ArrowLeft size={16} />
          </Link>
          <Typography weight="semibold">Edit page</Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="lg:hidden"
            onPress={() => setShowMobilePreview(true)}
            size="sm"
            variant="ghost"
          >
            <Eye size={16} />
            Preview
          </Button>
          <Button
            isPending={isSaving}
            size="sm"
            type="submit"
          >
            {isSaving ? (
              <>
                <Spinner
                  color="current"
                  size="sm"
                />
                Saving
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-full overflow-y-auto lg:w-2/5 lg:border-r lg:border-divider">
          <EditorPanel
            form={form}
            offers={offers}
            originalSlug={profile?.slug}
            testimonials={testimonials}
          />
        </div>
        <div className="hidden lg:flex lg:w-3/5 lg:flex-col">
          <PreviewPanel
            iframeRef={iframeRef}
            slug={slugValue}
          />
        </div>
      </div>

      {form.formState.errors.root ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{form.formState.errors.root.message}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}
    </Form>
  );
}
