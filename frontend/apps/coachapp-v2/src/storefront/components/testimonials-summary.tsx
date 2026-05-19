import {Button} from '@heroui/react';
import {Camera, MessageSquareQuote, Star} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import type {Testimonial} from '@/api/testimonials';

import {ROUTES} from '@/@config/routes';

export default function TestimonialsSummary({testimonials}: {testimonials: Testimonial[]}) {
  const navigate = useNavigate();
  const featured = testimonials.filter((t) => t.is_featured);
  const withPhotos = testimonials.filter((t) => t.before_image_url && t.after_image_url);

  if (testimonials.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground-500">
          No testimonials yet. Add client results and reviews to build trust.
        </p>
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
          size="sm"
          variant="secondary"
        >
          <MessageSquareQuote size={14} />
          Go to Testimonials
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-foreground-400">Testimonials are managed on a separate page.</p>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-foreground-500">
          <Star
            className="fill-warning text-warning"
            size={14}
          />
          {featured.length} featured
        </span>
        <span className="inline-flex items-center gap-1.5 text-foreground-500">
          <Camera size={14} />
          {withPhotos.length} with photos
        </span>
        <span className="text-foreground-400">{testimonials.length} total</span>
      </div>

      {featured.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground-400">Featured (shown as spotlight):</p>
          {featured.map((t) => (
            <div
              className="flex items-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm"
              key={t.id}
            >
              <Star
                className="shrink-0 fill-warning text-warning"
                size={12}
              />
              <span className="min-w-0 flex-1 truncate">{t.client_name}</span>
              {t.result_tag ? <span className="shrink-0 text-xs text-foreground-400">{t.result_tag}</span> : null}
              {t.before_image_url && t.after_image_url ? (
                <Camera
                  className="shrink-0 text-foreground-400"
                  size={12}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <Button
        onPress={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
        size="sm"
        variant="secondary"
      >
        <MessageSquareQuote size={14} />
        Manage Testimonials
      </Button>
    </div>
  );
}
