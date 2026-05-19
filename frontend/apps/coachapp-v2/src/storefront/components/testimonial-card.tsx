import {Chip} from '@heroui/react';
import {Image, MessageSquareQuote} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Testimonial} from '@/api/testimonials';

export default function TestimonialCard({testimonial}: {testimonial: Testimonial}) {
  const hasPhotos = Boolean(testimonial.before_image_url && testimonial.after_image_url);
  const subtitle = [testimonial.result_tag, testimonial.duration_text, testimonial.program_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      className="flex min-h-11 items-start gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/storefront/testimonials/${testimonial.id}/edit`}
    >
      {hasPhotos ? (
        <div className="flex shrink-0 gap-1">
          <img
            alt="Before"
            className="size-10 rounded-md object-cover"
            src={testimonial.before_image_url!}
          />
          <img
            alt="After"
            className="size-10 rounded-md object-cover"
            src={testimonial.after_image_url!}
          />
        </div>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
          {testimonial.quote ? (
            <MessageSquareQuote
              className="text-foreground-400"
              size={20}
            />
          ) : (
            <Image
              className="text-foreground-400"
              size={20}
            />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{testimonial.client_name}</p>
        {subtitle && <p className="truncate text-xs text-foreground-500">{subtitle}</p>}
        {testimonial.quote && (
          <p className="mt-0.5 line-clamp-1 text-xs text-foreground-400">&ldquo;{testimonial.quote}&rdquo;</p>
        )}
      </div>

      <div className="hidden shrink-0 gap-1.5 sm:flex">
        {testimonial.is_featured && (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            Featured
          </Chip>
        )}
        <Chip
          color={testimonial.status === 'active' ? 'success' : 'default'}
          size="sm"
          variant="soft"
        >
          {testimonial.status}
        </Chip>
      </div>
    </Link>
  );
}
