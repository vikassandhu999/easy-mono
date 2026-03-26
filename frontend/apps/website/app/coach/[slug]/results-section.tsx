import {Star} from 'lucide-react';

import type {PublicTestimonial} from './types';

export default function ResultsSection({testimonials}: {testimonials: PublicTestimonial[]}) {
  if (testimonials.length === 0) return null;

  // Categorize testimonials
  const featured = testimonials.filter((t) => t.is_featured && t.before_image_url && t.after_image_url);
  const photoGrid = testimonials.filter((t) => !t.is_featured && t.before_image_url && t.after_image_url);
  const textOnly = testimonials.filter((t) => !t.before_image_url && !t.after_image_url && t.quote);

  const hasPhotos = featured.length > 0 || photoGrid.length > 0;
  const sectionTitle = hasPhotos ? 'Results' : 'What Clients Say';

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">{sectionTitle}</h2>

      {/* Component 1: Transformation spotlight (featured + photos) */}
      {featured.length > 0 && (
        <div className="flex flex-col gap-8">
          {featured.map((t) => (
            <TransformationSpotlight
              key={t.id}
              testimonial={t}
            />
          ))}
        </div>
      )}

      {/* Component 2: Transformation grid (non-featured + photos) */}
      {photoGrid.length > 0 && (
        <div className={featured.length > 0 ? 'mt-10' : ''}>
          {featured.length > 0 && (
            <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">More Results</h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {photoGrid.map((t) => (
              <TransformationGridCard
                key={t.id}
                testimonial={t}
              />
            ))}
          </div>
        </div>
      )}

      {/* Component 3: Text testimonial quotes */}
      {textOnly.length > 0 && (
        <div className={hasPhotos ? 'mt-10' : ''}>
          {hasPhotos && (
            <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">What Clients Say</h3>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {textOnly.map((t) => (
              <TextTestimonialCard
                key={t.id}
                testimonial={t}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Transformation Spotlight (featured) ──────────────────────

function TransformationSpotlight({testimonial}: {testimonial: PublicTestimonial}) {
  const subtitle = [testimonial.result_tag, testimonial.duration_text, testimonial.program_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Photos — stack on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="relative aspect-[3/4]">
          <img
            alt="Before"
            className="h-full w-full object-cover"
            src={testimonial.before_image_url!}
          />
          <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white">
            Before
            {testimonial.before_weight && ` · ${testimonial.before_weight} kg`}
          </span>
        </div>
        <div className="relative aspect-[3/4]">
          <img
            alt="After"
            className="h-full w-full object-cover"
            src={testimonial.after_image_url!}
          />
          <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white">
            After
            {testimonial.after_weight && ` · ${testimonial.after_weight} kg`}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline gap-2">
          <p className="text-base font-semibold">{testimonial.client_name}</p>
          {testimonial.client_handle && (
            <span className="text-sm text-gray-400">{testimonial.client_handle}</span>
          )}
          {testimonial.rating && <StarRating rating={testimonial.rating} />}
        </div>

        {subtitle && <p className="mt-1 text-sm font-medium text-gray-600">{subtitle}</p>}

        {testimonial.quote && (
          <p className="mt-3 line-clamp-3 text-sm italic text-gray-600">
            &ldquo;{testimonial.quote}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ── Transformation Grid Card ─────────────────────────────────

function TransformationGridCard({testimonial}: {testimonial: PublicTestimonial}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="grid grid-cols-2">
        <img
          alt="Before"
          className="aspect-[3/4] w-full object-cover"
          src={testimonial.before_image_url!}
        />
        <img
          alt="After"
          className="aspect-[3/4] w-full object-cover"
          src={testimonial.after_image_url!}
        />
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold">{testimonial.client_name}</p>
        {testimonial.result_tag && (
          <p className="truncate text-xs text-gray-500">
            {testimonial.result_tag}
            {testimonial.duration_text && ` · ${testimonial.duration_text}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Text Testimonial Card ────────────────────────────────────

function TextTestimonialCard({testimonial}: {testimonial: PublicTestimonial}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
      {testimonial.rating && <StarRating rating={testimonial.rating} />}

      {testimonial.quote && (
        <p className="line-clamp-4 text-sm italic text-gray-600">&ldquo;{testimonial.quote}&rdquo;</p>
      )}

      <div className="mt-auto pt-2">
        <p className="text-sm font-semibold text-gray-800">&mdash; {testimonial.client_name}</p>
        {(testimonial.program_name || testimonial.duration_text) && (
          <p className="text-xs text-gray-400">
            {[testimonial.program_name, testimonial.duration_text].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Star Rating ──────────────────────────────────────────────

function StarRating({rating}: {rating: number}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
          key={star}
          size={14}
        />
      ))}
    </div>
  );
}
