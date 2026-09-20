import {ArrowLeft, ArrowRight, ImageOff} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {clearSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {AuthLayout, FormError} from './auth-layout';
import {getReturnTo} from './return-to';

const slides = [
  {
    id: 'clients',
    feature: 'Your clients',
    title: 'Know the person behind the plan.',
    description: 'Bring intake, plans, and progress together. Open a client and pick up exactly where you left off.',
    caption: 'Client overview · a complete picture of each person',
    alt: 'Client overview with intake, check-ins, and assigned training and nutrition plans.',
  },
  {
    id: 'training',
    feature: 'Training',
    title: 'Build once. Coach each person.',
    description:
      'Create workouts you can reuse, then adjust exercises and targets for each client without changing your template.',
    caption: 'Training builder · reusable plans, personal prescriptions',
    alt: 'Training builder showing a full-body workout with exercises and compact set targets.',
  },
  {
    id: 'nutrition',
    feature: 'Nutrition',
    title: 'Make healthy choices easier.',
    description:
      'Turn nutrition targets into practical meals. Give clients food choices and day variations that fit their routine.',
    caption: 'Nutrition builder · targets, meals, and everyday choices',
    alt: 'Nutrition builder showing daily targets and meals arranged into a weekly plan.',
  },
  {
    id: 'check-ins',
    feature: 'Check-ins',
    title: 'See how the week really went.',
    description:
      'Schedule check-ins and review each client’s responses. See what is working and where they need your help.',
    caption: 'Check-in review · the context behind the progress',
    alt: 'A weekly check-in response with the client’s progress, recovery, and request for support.',
  },
  {
    id: 'messages',
    feature: 'Messages',
    title: 'Keep the conversation close.',
    description:
      'Answer questions, share feedback, and keep coaching conversations together. See who needs a reply without losing the thread.',
    caption: 'Messages · a direct connection with your clients',
    alt: 'A coaching conversation about workout progress and an adjustment for the next session.',
  },
  {
    id: 'workbench',
    feature: 'Your daily workbench',
    title: 'Know who needs you next.',
    description:
      'Replies, reviews, and plan gaps come together in one place. Start with what needs you, then move through your follow-ups.',
    caption: 'Workbench · your next coaching actions, together',
    alt: 'Workbench listing clients awaiting a reply, a check-in review, or a plan.',
  },
];

function readStep(key: string) {
  try {
    const stored = Number(sessionStorage.getItem(key));
    return Number.isInteger(stored) && stored >= 0 && stored < slides.length ? stored : 0;
  } catch {
    return 0;
  }
}

export function Welcome() {
  const profile = useProfile();
  const navigate = useNavigate();
  if (!profile.data) {
    return (
      <AuthLayout
        title="Welcome to Easy"
        description="Let’s take a quick look around your coaching space."
      >
        {profile.isPending ? (
          <p role="status">Opening your account…</p>
        ) : (
          <div className="space-y-4">
            <FormError message={errorMessage(profile.error, 'Your account is saved. Try opening it again.')} />
            <Button
              onPress={() => {
                profile.refetch();
              }}
              isPending={profile.isFetching}
            >
              Try again
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                clearSession();
                navigate(routes.login, {replace: true});
              }}
            >
              Sign out
            </Button>
          </div>
        )}
      </AuthLayout>
    );
  }
  return (
    <WelcomeTour
      key={profile.data.data.id}
      coachId={profile.data.data.id}
    />
  );
}

function WelcomeTour({coachId}: {coachId: string}) {
  const storageKey = `coachapp.welcome.v1:${coachId}`;
  const [step, setStep] = useState(() => readStep(storageKey));
  const [imageFailed, setImageFailed] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const returnTo = getReturnTo(useLocation().search);
  const destination =
    returnTo === routes.home || returnTo.split(/[?#]/)[0] === routes.welcome ? routes.workbench : returnTo;
  const slide = slides[step] ?? slides[0];
  const last = step === slides.length - 1;

  // The heading gives keyboard and screen-reader users the new slide's context.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refocus when the selected slide changes.
  useEffect(() => {
    heading.current?.focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [step]);

  function selectStep(next: number) {
    setStep(next);
    setImageFailed(false);
    try {
      sessionStorage.setItem(storageKey, String(next));
    } catch {
      /* The tour remains usable without storage. */
    }
  }

  function finish() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Navigation does not depend on browser storage. */
    }
    navigate(destination, {replace: true});
  }

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <span className="app-brand">
          easy<span className="sr-only"> Coach</span>
        </span>
        <Button
          variant="ghost"
          onPress={finish}
        >
          Skip tour
        </Button>
      </header>
      <main
        className="welcome-main"
        aria-label="Explore Easy"
        aria-roledescription="carousel"
      >
        <div
          className="welcome-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${step + 1} of ${slides.length}: ${slide.feature}`}
        >
          <div className="welcome-copy">
            <p className="welcome-eyebrow">Welcome to your coaching space</p>
            <p className="welcome-feature">{slide.feature}</p>
            <h1
              ref={heading}
              tabIndex={-1}
              className="welcome-title"
            >
              {slide.title}
            </h1>
            <p className="welcome-description">{slide.description}</p>
          </div>
          <figure className="welcome-preview">
            <div className="welcome-screen">
              {imageFailed ? (
                <div className="welcome-image-error">
                  <ImageOff aria-hidden="true" />
                  <p>Screen preview couldn’t load. You can still continue the tour.</p>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setImageAttempt((value) => value + 1);
                      setImageFailed(false);
                    }}
                  >
                    Retry preview
                  </Button>
                </div>
              ) : (
                <picture key={`${slide.id}-${imageAttempt}`}>
                  <source
                    media="(max-width: 767px)"
                    srcSet={`/welcome/${slide.id}-mobile.jpg`}
                  />
                  {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Image loading recovery is not a user interaction. */}
                  <img
                    src={`/welcome/${slide.id}-desktop.jpg`}
                    alt={slide.alt}
                    width={1088}
                    height={680}
                    onError={() => setImageFailed(true)}
                  />
                </picture>
              )}
            </div>
            <figcaption>
              {slide.caption}
              <span>Illustrative account</span>
            </figcaption>
          </figure>
        </div>
        <footer className="welcome-footer">
          <div
            role="group"
            className="welcome-progress"
            aria-label={`Step ${step + 1} of ${slides.length}`}
          >
            <div
              aria-hidden="true"
              className="welcome-dots"
            >
              {slides.map((item, index) => (
                <span
                  key={item.id}
                  data-current={index === step}
                />
              ))}
            </div>
            <span>
              {step + 1} / {slides.length}
            </span>
          </div>
          <div className="welcome-actions">
            <Button
              variant="ghost"
              isDisabled={step === 0}
              onPress={() => selectStep(step - 1)}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <Button
              className="welcome-next"
              onPress={() => (last ? finish() : selectStep(step + 1))}
            >
              {last ? (destination === routes.workbench ? 'Open my workbench' : 'Continue to your page') : 'Next'}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
