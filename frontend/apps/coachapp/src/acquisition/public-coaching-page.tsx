import {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type LandingPageApplication,
  type LandingPagePublic,
  useApplyForCoaching,
  usePublicLandingPage,
} from '../api/landing-page';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {Label} from '../ui/label';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {clearApplication, readApplication, saveApplication} from './application-request';
import {CoachingContent} from './coaching-content';
import {landingDraft} from './landing-draft';

export function PublicCoachingPage() {
  const {slug = ''} = useParams();
  return (
    <PublicPage
      key={slug}
      slug={slug}
    />
  );
}

function PublicPage({slug}: {slug: string}) {
  const page = usePublicLandingPage(slug);
  const [pendingRequest] = useState(() => readApplication(slug));
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {pendingRequest ? (
        <ApplicationRecovery
          slug={slug}
          request={pendingRequest}
        />
      ) : page.data ? (
        <>
          {page.isError && (
            <div className="mx-auto max-w-5xl space-y-3 px-5 pt-6">
              <FormError message="Could not refresh this coaching page. The last loaded version is shown." />
              <Button
                variant="outline"
                isPending={page.isFetching}
                onPress={() => {
                  page.refetch();
                }}
              >
                Refresh coaching page
              </Button>
            </div>
          )}
          <PublicContent
            key={page.data.data.id}
            page={page.data.data}
          />
        </>
      ) : (
        <div className="mx-auto max-w-xl space-y-5 px-5 py-16">
          <h1 className="text-3xl font-semibold">
            {page.isPending ? 'Opening coaching page…' : 'This page is unavailable'}
          </h1>
          {page.isPending ? (
            <p role="status">Loading…</p>
          ) : (
            <>
              <p className="text-muted-foreground">
                {page.error instanceof ApiError && page.error.status === 404
                  ? 'This link may have changed, or the coach has taken the page offline. Contact the coach for their latest link.'
                  : 'We couldn’t load this page. Check your connection and try again.'}
              </p>
              <Button
                variant="outline"
                isPending={page.isFetching}
                onPress={() => {
                  page.refetch();
                }}
              >
                Try again
              </Button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function PublicContent({page}: {page: LandingPagePublic}) {
  const [application, setApplication] = useState<{programId: string | null} | null>(() =>
    readApplication(page.slug) ? {programId: null} : null,
  );
  return (
    <>
      <CoachingContent
        content={landingDraft(page, page.slug)}
        businessName={page.business_name}
        onApply={(programId) => setApplication({programId})}
      />
      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
        Coaching with {page.business_name}
      </footer>
      {application && (
        <ApplicationForm
          page={page}
          programId={application.programId}
          close={() => setApplication(null)}
        />
      )}
    </>
  );
}

function ApplicationForm({
  page: initialPage,
  programId,
  close,
}: {
  page: LandingPagePublic;
  programId: string | null;
  close: () => void;
}) {
  const [page, setPage] = useState(initialPage);
  const apply = useApplyForCoaching(page.slug);
  const currentPage = usePublicLandingPage(page.slug);
  const whatsapp = page.whatsapp_number?.replace(/[^0-9]/g, '');
  const [savedRequest, setSavedRequest] = useState(() => readApplication(page.slug));
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [stale, setStale] = useState(false);
  const answers: Record<string, string> = {};
  for (const question of page.application_questions) {
    if (question.id) {
      answers[question.id] = '';
    }
  }
  const form = useForm({
    defaultValues: {
      name: savedRequest?.name ?? '',
      email: savedRequest?.email ?? '',
      phone: savedRequest?.phone ?? '',
      instagram: savedRequest?.instagram ?? '',
      landing_program_id: savedRequest?.landing_program_id ?? programId ?? '',
      answers,
    },
  });
  const errorRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const refreshErrorRef = useRef<HTMLParagraphElement>(null);
  const instagramRef = useRef<HTMLDetailsElement>(null);
  const errors = form.formState.errors;
  const summaryError = [
    error,
    errors.root?.message,
    errors.landing_program_id?.message,
    typeof errors.answers?.message === 'string' ? errors.answers.message : undefined,
  ]
    .join(' ')
    .trim();
  const pending = form.formState.isSubmitting || apply.isPending;
  useEffect(() => {
    if (pending) {
      return;
    }
    if (confirmed) {
      titleRef.current?.focus();
    } else if (summaryError) {
      errorRef.current?.focus();
    } else if (!savedRequest) {
      if (errors.name) {
        form.setFocus('name');
      } else if (errors.email) {
        form.setFocus('email');
      } else if (errors.phone) {
        form.setFocus('phone');
      } else if (errors.instagram) {
        if (instagramRef.current) {
          instagramRef.current.open = true;
        }
        form.setFocus('instagram');
      }
    }
  }, [pending, confirmed, summaryError, savedRequest, errors, form.setFocus]);
  useEffect(() => {
    if (stale && currentPage.isError && !currentPage.isFetching) {
      refreshErrorRef.current?.focus();
    }
  }, [stale, currentPage.isError, currentPage.isFetching]);
  const send = async (body: LandingPageApplication & {request_id: string}) => {
    setError('');
    form.clearErrors();
    try {
      await apply.mutateAsync(body);
      clearApplication(page.slug);
      setSavedRequest(null);
      setConfirmed(true);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500 && reason.status !== 429) {
        clearApplication(page.slug);
        setSavedRequest(null);
        setStale(reason.code === 'stale_revision');
        setFormError(reason, 'Check the details below and try again.', form.setError, [
          'name',
          'email',
          'phone',
          'instagram',
          'landing_program_id',
          'answers',
        ]);
        return;
      }
      setError(
        errorMessage(
          reason,
          'We couldn’t confirm your application. Your details are saved here. Retry to check the same submission.',
        ),
      );
    }
  };
  const submit = form.handleSubmit(async (values) => {
    if (!values.phone.trim() && !values.email.trim()) {
      form.setError('email', {message: 'Enter your email or phone so the coach can reach you.'});
      return;
    }
    const body = {
      ...values,
      landing_program_id: values.landing_program_id || null,
      request_id: crypto.randomUUID(),
      landing_page_id: page.id,
      expected_revision: page.revision,
    };
    try {
      saveApplication(page.slug, body);
    } catch {
      setError('Your browser could not save this application for recovery. Allow session storage and try again.');
      return;
    }
    setSavedRequest(body);
    await send(body);
  });
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !apply.isPending) {
          close();
        }
      }}
      isDismissable={!apply.isPending}
      isKeyboardDismissDisabled={apply.isPending}
      showCloseButton={!apply.isPending}
    >
      <DialogHeader>
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
        >
          {confirmed ? 'Your application is with the coach' : 'Apply for coaching'}
        </DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        {confirmed ? (
          <>
            <p>{page.business_name} will review your application and contact you using the details you provided.</p>
            {whatsapp && (
              <a
                className="text-link block"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                Contact the coach on WhatsApp
              </a>
            )}
            <Button onPress={close}>Done</Button>
          </>
        ) : savedRequest ? (
          <>
            <p>
              Your submission has not been confirmed yet. Retry to check the same application; this won’t create a
              duplicate.
            </p>
            <FormError
              ref={errorRef}
              tabIndex={-1}
              message={summaryError}
            />
            <Button
              isPending={apply.isPending}
              onPress={() => send(savedRequest)}
            >
              Retry application
            </Button>
          </>
        ) : (
          <form
            noValidate
            onSubmit={submit}
            className="space-y-5"
          >
            <p className="text-sm text-muted-foreground">
              Tell {page.business_name} a little about yourself. No account needed.
            </p>
            <fieldset
              disabled={apply.isPending}
              className="min-w-0 space-y-5"
            >
              <div className="space-y-2">
                <Label
                  id="apply-program-label"
                  htmlFor="apply-program"
                >
                  Interested in
                </Label>
                <Controller
                  control={form.control}
                  name="landing_program_id"
                  render={({field}) => (
                    <SelectField
                      id="apply-program"
                      value={field.value || 'general'}
                      triggerRef={field.ref}
                      onBlur={field.onBlur}
                      onChange={(value) => field.onChange(value === 'general' ? '' : value)}
                    >
                      <SelectItem id="general">Help me find the right fit</SelectItem>
                      {page.programs.map((program) => (
                        <SelectItem
                          key={program.id}
                          id={program.id}
                        >
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectField>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                label="Your name"
                isRequired
                autoComplete="name"
                maxLength={255}
              />
              <FormField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                maxLength={255}
              />
              <FormField
                control={form.control}
                name="phone"
                label="Phone"
                type="tel"
                autoComplete="tel"
                description="An email or phone number is enough."
                maxLength={255}
              />
              {page.application_questions.map((question) =>
                question.id && question.label ? (
                  <div
                    key={question.id}
                    className="space-y-2"
                  >
                    {question.type === 'single_select' ? (
                      <>
                        <Label
                          id={`answer-${question.id}-label`}
                          htmlFor={`answer-${question.id}`}
                        >
                          {question.label} <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Controller
                          control={form.control}
                          name={`answers.${question.id}`}
                          render={({field}) => (
                            <SelectField
                              id={`answer-${question.id}`}
                              value={field.value ? `option:${field.value}` : 'skip'}
                              triggerRef={field.ref}
                              onBlur={field.onBlur}
                              onChange={(value) => field.onChange(value === 'skip' ? '' : value.slice(7))}
                            >
                              <SelectItem id="skip">Prefer not to answer</SelectItem>
                              {(question.options ?? []).map((option) => (
                                <SelectItem
                                  key={option}
                                  id={`option:${option}`}
                                >
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectField>
                          )}
                        />
                      </>
                    ) : (
                      <FormField
                        control={form.control}
                        name={`answers.${question.id}`}
                        label={`${question.label} (optional)`}
                        multiline={question.type === 'long_text'}
                        maxLength={4000}
                      />
                    )}
                  </div>
                ) : null,
              )}
              <details
                ref={instagramRef}
                className="space-y-3"
              >
                <summary className="cursor-pointer text-sm font-medium">Add Instagram (optional)</summary>
                <FormField
                  control={form.control}
                  name="instagram"
                  label="Instagram username"
                  maxLength={255}
                />
              </details>
            </fieldset>
            <FormError
              ref={errorRef}
              tabIndex={-1}
              message={summaryError}
            />
            {stale ? (
              <div className="space-y-3">
                <p className="text-sm">
                  The coach has updated this page. Review the latest programs and questions before applying.
                </p>
                {currentPage.isError && (
                  <FormError
                    ref={refreshErrorRef}
                    tabIndex={-1}
                    message="Could not load the updated page. Your answers are still here."
                  />
                )}
                <Button
                  variant="outline"
                  isPending={currentPage.isFetching}
                  onPress={async () => {
                    const result = await currentPage.refetch();
                    if (result.data && !result.isError) {
                      const previous = form.getValues('answers');
                      const updated: Record<string, string> = {};
                      for (const question of result.data.data.application_questions) {
                        if (question.id) {
                          const value = previous[question.id] ?? '';
                          updated[question.id] =
                            question.type === 'single_select' && !question.options?.includes(value) ? '' : value;
                        }
                      }
                      setPage(result.data.data);
                      form.setValue('answers', updated);
                      form.setValue('landing_program_id', '');
                      form.clearErrors();
                      form.setFocus('landing_program_id');
                      setStale(false);
                      setError('');
                    }
                  }}
                >
                  Review updated page
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                isPending={apply.isPending}
              >
                Send application
              </Button>
            )}
          </form>
        )}
      </div>
    </Dialog>
  );
}

function ApplicationRecovery({slug, request}: {slug: string; request: LandingPageApplication & {request_id: string}}) {
  const apply = useApplyForCoaching(slug);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!apply.isPending) {
      if (confirmed) {
        titleRef.current?.focus();
      } else if (error) {
        errorRef.current?.focus();
      }
    }
  }, [apply.isPending, confirmed, error]);
  return (
    <div className="mx-auto max-w-xl space-y-5 px-5 py-16">
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="text-3xl font-semibold"
      >
        {confirmed ? 'Your application is with the coach' : 'Check your application'}
      </h1>
      <p>
        {confirmed
          ? `${confirmed} will contact you using the details you provided. You can close this page.`
          : 'Your previous submission is awaiting confirmation. Check the same application without sending another.'}
      </p>
      <FormError
        ref={errorRef}
        tabIndex={-1}
        message={error}
      />
      {!confirmed && (
        <Button
          isPending={apply.isPending}
          onPress={async () => {
            setError('');
            try {
              const result = await apply.mutateAsync(request);
              clearApplication(slug);
              setConfirmed(result.data.business_name);
            } catch (reason) {
              setError(
                reason instanceof ApiError && reason.status === 404
                  ? 'This coaching page is unavailable and we could not confirm your application. Contact the coach for their latest link.'
                  : errorMessage(reason, 'Could not confirm your application. Try again.'),
              );
            }
          }}
        >
          Check application
        </Button>
      )}
    </div>
  );
}
