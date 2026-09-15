import {Copy, ExternalLink} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {generatePath, Link} from 'react-router-dom';
import {useBusiness} from '../api/business';
import {errorMessage} from '../api/client';
import {type LandingPage, useLandingPage, useSaveLandingPage} from '../api/landing-page';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {CoachingContent} from './coaching-content';
import {landingDraft, pageInput} from './landing-draft';

export function CoachingPage() {
  const page = useLandingPage();
  const business = useBusiness();
  return (
    <Page>
      <PageHeader
        title="Coaching page"
        description="A place to introduce your coaching and welcome new applications."
        actions={
          <Link
            className="text-link"
            to={routes.applications}
          >
            View applications
          </Link>
        }
      />
      {page.isError || business.isError ? (
        <div className="space-y-3">
          <FormError message="Could not refresh your coaching page." />
          <Button
            variant="outline"
            onPress={() => {
              page.refetch();
              business.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {page.data && business.data ? (
        page.data.data ? (
          <SavedPage
            page={page.data.data}
            businessName={business.data.data.name}
          />
        ) : (
          <Surface className="max-w-2xl space-y-5">
            <h2 className="text-xl font-semibold">Turn interest into a conversation</h2>
            <p className="text-muted-foreground">
              Introduce yourself, describe your programs and let people apply. Start with a headline; add the details
              when you’re ready.
            </p>
            <Link
              to={routes.editCoachingPage}
              className="text-link"
            >
              Create your page
            </Link>
          </Surface>
        )
      ) : page.isPending || business.isPending ? (
        <p role="status">Loading your coaching page…</p>
      ) : null}
    </Page>
  );
}

function SavedPage({page, businessName}: {page: LandingPage; businessName: string}) {
  const save = useSaveLandingPage();
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState<'copied' | 'offline' | null>(null);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const offlineErrorRef = useRef<HTMLParagraphElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!save.isPending) {
      if (error) {
        (offline ? offlineErrorRef : errorRef).current?.focus();
      } else if (!offline && notice === 'offline') {
        noticeRef.current?.focus();
      }
    }
  }, [save.isPending, error, offline, notice]);
  const path = generatePath(routes.publicCoachingPage, {slug: page.slug});
  const url = new URL(path, window.location.origin).href;
  return (
    <>
      <Surface className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusBadge tone={page.status === 'published' ? 'positive' : 'neutral'}>
            {page.status === 'published' ? 'Live' : 'Draft · only visible to your team'}
          </StatusBadge>
          <Link
            className="text-link"
            to={routes.editCoachingPage}
          >
            Edit page
          </Link>
        </div>
        {page.status === 'published' ? (
          <>
            <p className="break-all text-sm text-muted-foreground">{url}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onPress={async () => {
                  setError('');
                  setNotice(null);
                  try {
                    await navigator.clipboard.writeText(url);
                    setNotice('copied');
                  } catch {
                    setError('Could not copy the link. You can select the address above.');
                  }
                }}
              >
                <Copy
                  className="size-4"
                  aria-hidden="true"
                />{' '}
                Copy link
              </Button>
              <a
                href={path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 text-sm font-medium"
              >
                Open live page{' '}
                <ExternalLink
                  className="size-4"
                  aria-hidden="true"
                />
              </a>
              <Button
                variant="ghost"
                onPress={() => {
                  setError('');
                  setNotice(null);
                  setOffline(true);
                }}
              >
                Take page offline
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your page is private. Open the editor to review and publish it.
          </p>
        )}
        {notice && (
          <p
            ref={noticeRef}
            tabIndex={-1}
            role="status"
            className="text-sm"
          >
            {notice === 'copied' ? 'Page link copied.' : 'Your page is now offline.'}
          </p>
        )}
        {!offline && (
          <FormError
            ref={errorRef}
            tabIndex={-1}
            message={error}
          />
        )}
      </Surface>
      <div className="overflow-hidden rounded-xl border border-border">
        <p className="border-b border-border bg-muted/40 px-5 py-3 text-sm text-muted-foreground">
          Visitor preview · application buttons are disabled
        </p>
        <CoachingContent
          content={landingDraft(page, page.slug)}
          businessName={businessName}
        />
      </div>
      <Dialog
        isOpen={offline}
        onOpenChange={(open) => {
          if (!save.isPending) {
            setOffline(open);
            if (!open) {
              setError('');
            }
          }
        }}
        isKeyboardDismissDisabled={save.isPending}
        showCloseButton={!save.isPending}
        isDismissable={!save.isPending}
      >
        <DialogHeader>
          <DialogTitle>Take your page offline?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p>
            People with the link won’t be able to view the page or apply. Your content and existing applications will be
            kept.
          </p>
          <FormError
            ref={offlineErrorRef}
            tabIndex={-1}
            message={error}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              isDisabled={save.isPending}
              onPress={() => {
                setOffline(false);
                setError('');
              }}
            >
              Keep page live
            </Button>
            <Button
              isPending={save.isPending}
              onPress={async () => {
                setError('');
                try {
                  await save.mutateAsync(pageInput(landingDraft(page, page.slug), 'draft'));
                  setOffline(false);
                  setNotice('offline');
                } catch (reason) {
                  setError(errorMessage(reason, 'Could not take the page offline. Try again.'));
                }
              }}
            >
              Take offline
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
