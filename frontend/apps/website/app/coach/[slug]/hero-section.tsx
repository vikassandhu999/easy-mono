import {Instagram, MessageCircle, Youtube} from 'lucide-react';

import type {PublicStoreProfile} from '@easy/storefront-types';

import HeroCtaButton from './hero-cta-button';

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export default function HeroSection({profile}: {profile: PublicStoreProfile}) {
  const socialEntries = Object.entries(profile.social_links).filter(
    ([key, url]) => Boolean(url) && key !== 'whatsapp',
  );

  const whatsappNumber = profile.social_links.whatsapp;

  return (
    <section
      className="relative"
      id="hero"
    >
      {/* Cover image */}
      {profile.cover_image_url ? (
        <div className="h-32 w-full bg-gray-200 sm:h-52 md:h-64">
          <img
            alt=""
            className="h-full w-full object-cover"
            src={profile.cover_image_url}
          />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-gray-200 to-gray-300 sm:h-52 md:h-64" />
      )}

      {/* Profile info */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="-mt-10 flex flex-col items-center gap-4 pb-8 text-center sm:-mt-16">
          {/* Avatar */}
          {profile.photo_url ? (
            <img
              alt={profile.display_name}
              className="size-20 rounded-full border-4 border-white object-cover shadow-md sm:size-28"
              src={profile.photo_url}
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-gray-300 text-2xl font-bold text-gray-600 shadow-md sm:size-28 sm:text-4xl">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-bold sm:text-3xl">{profile.display_name}</h1>

          {profile.headline ? (
            <p className="max-w-lg text-xl font-semibold text-gray-800 sm:text-2xl">{profile.headline}</p>
          ) : null}

          {profile.bio ? (
            <p className="max-w-lg text-sm text-gray-600 sm:text-base">{profile.bio}</p>
          ) : null}

          {/* CTAs — primary themed (client component for scroll) + secondary WhatsApp (plain link) */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <HeroCtaButton />
            {whatsappNumber ? (
              <a
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            ) : null}
          </div>

          {/* Social links — below CTAs, smaller, muted */}
          {socialEntries.length > 0 ? (
            <div className="flex gap-3">
              {socialEntries.map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key];
                const label = SOCIAL_LABELS[key] ?? key;
                return (
                  <a
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600"
                    href={url}
                    key={key}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {Icon ? <Icon size={14} /> : null}
                    {label}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
