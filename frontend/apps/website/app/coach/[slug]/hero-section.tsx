import {Instagram, MessageCircle, Youtube} from 'lucide-react';

import type {PublicStoreProfile} from './types';

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  youtube: Youtube,
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
};

export default function HeroSection({profile}: {profile: PublicStoreProfile}) {
  const socialEntries = Object.entries(profile.social_links).filter(([, url]) => Boolean(url));

  return (
    <section className="relative">
      {/* Cover image */}
      {profile.cover_image_url ? (
        <div className="h-40 w-full bg-default-200 sm:h-52 md:h-64">
          <img
            alt=""
            className="h-full w-full object-cover"
            src={profile.cover_image_url}
          />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-default-200 to-default-300 sm:h-52 md:h-64" />
      )}

      {/* Profile info */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="-mt-12 flex flex-col items-center gap-4 text-center sm:-mt-16">
          {/* Avatar */}
          {profile.photo_url ? (
            <img
              alt={profile.display_name}
              className="size-24 rounded-full border-4 border-white object-cover shadow-md sm:size-32"
              src={profile.photo_url}
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full border-4 border-white bg-default-300 text-3xl font-bold text-default-600 shadow-md sm:size-32 sm:text-4xl">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-bold sm:text-3xl">{profile.display_name}</h1>

          {profile.bio && (
            <p className="max-w-lg text-sm text-gray-600 sm:text-base">{profile.bio}</p>
          )}

          {/* Social links */}
          {socialEntries.length > 0 && (
            <div className="flex gap-3">
              {socialEntries.map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key];
                const label = SOCIAL_LABELS[key] ?? key;
                const href = key === 'whatsapp' ? `https://wa.me/${url.replace(/\D/g, '')}` : url;

                return (
                  <a
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    href={href}
                    key={key}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {Icon && <Icon size={16} />}
                    {label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
