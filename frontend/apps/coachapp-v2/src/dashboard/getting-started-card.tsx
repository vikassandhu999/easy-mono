import {Typography} from '@heroui/react';
import {ArrowRight, Check, Dumbbell, Globe, type LucideIcon, UserPlus, UserRound, X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
// ponytail: generated standard list queries used for existence checks only — they
// coexist with the hand-written infinite list hooks (different names), per api AGENTS.
import {useListFormTemplatesQuery} from '@/api/checkins';
import {useListClientsQuery} from '@/api/clients';
import {useListNutritionPlansQuery, useListTrainingPlansQuery} from '@/api/generated';
import {useGetLandingPageQuery} from '@/api/landing-page';
import {useGetCoachProfileQuery} from '@/api/profile';

type Step = {
  key: string;
  label: string;
  why: string;
  icon: LucideIcon;
  route: string;
  done: boolean;
};

/**
 * Getting-started completion derived live from real data — never a stored flag,
 * so a step un-checks if the coach later deletes the thing that satisfied it.
 * `loading` stays true until every input has resolved, so we never flash a step
 * as incomplete before its data arrives.
 */
export function useGettingStarted(): {steps: Step[]; doneCount: number; loading: boolean} {
  const profile = useGetCoachProfileQuery();
  const clients = useListClientsQuery({limit: 1});
  const training = useListTrainingPlansQuery({limit: 1});
  const nutrition = useListNutritionPlansQuery({limit: 1});
  const checkins = useListFormTemplatesQuery();
  const landing = useGetLandingPageQuery();

  const loading =
    profile.isLoading ||
    clients.isLoading ||
    training.isLoading ||
    nutrition.isLoading ||
    checkins.isLoading ||
    landing.isLoading;

  const coach = profile.data?.data;
  const hasContact = Boolean(coach?.phone || coach?.business.whatsapp_number);
  const hasClient = (clients.data?.count ?? 0) > 0;
  const hasContent =
    (training.data?.count ?? 0) > 0 || (nutrition.data?.count ?? 0) > 0 || (checkins.data?.data.length ?? 0) > 0;
  const landingPublished = landing.data?.data?.status === 'published';

  const steps: Step[] = [
    {
      key: 'profile',
      label: 'Complete your profile',
      why: 'Add your contact details so clients can reach you.',
      icon: UserRound,
      route: ROUTES.SETTINGS,
      done: hasContact,
    },
    {
      key: 'client',
      label: 'Invite your first client',
      why: 'They get an app to log training and check in with you.',
      icon: UserPlus,
      route: ROUTES.INVITE_CLIENT,
      done: hasClient,
    },
    {
      key: 'content',
      label: 'Build content',
      why: 'Create a plan or check-in to assign to your clients.',
      icon: Dumbbell,
      route: ROUTES.LIBRARY,
      done: hasContent,
    },
    {
      key: 'landing',
      label: 'Publish your landing page',
      why: 'Share a public page so prospects can apply.',
      icon: Globe,
      route: ROUTES.SETTINGS_LANDING_PAGE,
      done: landingPublished,
    },
  ];

  return {steps, doneCount: steps.filter((s) => s.done).length, loading};
}

/** Dismissible card listing the four setup paths; done rows sink to the bottom. */
export function GettingStartedCard({
  steps,
  doneCount,
  onDismiss,
}: {
  steps: Step[];
  doneCount: number;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const ordered = [...steps].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <Typography weight="semibold">Get set up</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            {doneCount} of {steps.length} done
          </Typography>
        </div>
        <button
          aria-label="Dismiss getting started"
          className="-me-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover"
          onClick={onDismiss}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="divide-y divide-border">
        {ordered.map((step) => (
          <li key={step.key}>
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:pointer-events-none"
              disabled={step.done}
              onClick={() => navigate(step.route)}
              type="button"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  step.done ? 'bg-accent/10 text-accent' : 'bg-surface-hover text-muted'
                }`}
              >
                {step.done ? <Check size={16} /> : <step.icon size={16} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <Typography
                  className={step.done ? 'text-muted line-through' : undefined}
                  weight="medium"
                >
                  {step.label}
                </Typography>
                {!step.done ? (
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    {step.why}
                  </Typography>
                ) : null}
              </span>
              {!step.done ? (
                <ArrowRight
                  className="ms-auto shrink-0 text-muted"
                  size={16}
                />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
