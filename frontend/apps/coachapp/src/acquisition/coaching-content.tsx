import {ArrowRight, Check} from 'lucide-react';
import {useState} from 'react';
import {Button} from '../ui/button';
import type {LandingDraft} from './landing-draft';

export function CoachingContent({
  content,
  businessName,
  onApply,
}: {
  content: LandingDraft;
  businessName: string;
  onApply?: (programId: string | null) => void;
}) {
  const Heading = onApply ? 'h1' : 'h2';
  const [failedImage, setFailedImage] = useState('');
  const heroUrl =
    /^https?:\/\//i.test(content.hero_image_url) && content.hero_image_url !== failedImage
      ? content.hero_image_url
      : '';
  const proof = content.proof_points.length > 0 && (
    <dl className="grid gap-6 border-y border-border py-8 sm:grid-cols-3">
      {content.proof_points.map((point, index) => (
        <div
          key={`${index}-${point.label}`}
          className="space-y-1"
        >
          <dd className="text-3xl font-semibold tracking-tight">{point.value}</dd>
          <dt className="text-sm text-muted-foreground">{point.label}</dt>
        </div>
      ))}
    </dl>
  );
  const fit = content.fit_points.length > 0 && (
    <section className="space-y-5">
      <h2 className="text-2xl font-semibold tracking-tight">Is this for you?</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {content.fit_points.map((point, index) => (
          <li
            key={`${index}-${point.value}`}
            className="flex items-start gap-3"
          >
            <Check
              className="mt-1 size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="whitespace-pre-wrap">{point.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
  const story = content.coach_intro && (
    <section className="max-w-2xl space-y-5">
      <h2 className="text-2xl font-semibold tracking-tight">Meet your coach</h2>
      <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{content.coach_intro}</p>
    </section>
  );
  return (
    <article className="mx-auto max-w-5xl space-y-12 [overflow-wrap:anywhere] px-5 py-8 sm:space-y-16 sm:px-10 sm:py-12">
      <p className="text-lg font-semibold tracking-tight">{businessName}</p>
      <section className={`grid items-center gap-8 ${heroUrl ? 'md:grid-cols-[1.3fr_1fr]' : ''}`}>
        <div className="space-y-6">
          {content.eyebrow && (
            <p className="text-sm font-medium tracking-wide text-muted-foreground">{content.eyebrow}</p>
          )}
          <Heading className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {content.headline || 'Your coaching headline'}
          </Heading>
          {content.subheadline && (
            <p className="max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">
              {content.subheadline}
            </p>
          )}
          <Button
            isDisabled={!onApply}
            onPress={() => onApply?.(null)}
          >
            Apply for coaching{' '}
            <ArrowRight
              aria-hidden="true"
              className="size-4"
            />
          </Button>
        </div>
        {heroUrl && (
          // biome-ignore lint/a11y/noNoninteractiveElementInteractions: This handles image loading failure, not user interaction.
          <img
            src={heroUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedImage(heroUrl)}
            className="aspect-[4/5] w-full rounded-2xl object-cover"
          />
        )}
      </section>
      {content.template === 'proof_first' && (
        <>
          {proof}
          {fit}
          {story}
        </>
      )}
      {content.template === 'problem_fit' && (
        <>
          {fit}
          {story}
          {proof}
        </>
      )}
      {content.template === 'coach_story' && (
        <>
          {story}
          {fit}
          {proof}
        </>
      )}
      {content.programs.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">Ways to work together</h2>
          <div className="grid items-start gap-5 md:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
            {content.programs.map((program, index) => (
              <section
                key={program.programRef || index}
                className="flex max-w-xl flex-col gap-4 rounded-2xl bg-muted/50 p-6"
              >
                <h3 className="text-xl font-semibold tracking-tight">{program.name || 'Program name'}</h3>
                {program.audience && <p className="text-sm text-muted-foreground">{program.audience}</p>}
                {program.promise && <p className="font-medium">{program.promise}</p>}
                {program.description && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {program.description}
                  </p>
                )}
                {program.price_display && <p className="font-semibold">{program.price_display}</p>}
                <Button
                  className="mt-auto h-auto min-h-12 whitespace-normal py-3"
                  variant="outline"
                  aria-label={`Apply for ${program.name || 'this program'}`}
                  isDisabled={!onApply}
                  onPress={() => onApply?.(program.programRef || null)}
                >
                  Apply for this program
                </Button>
              </section>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
