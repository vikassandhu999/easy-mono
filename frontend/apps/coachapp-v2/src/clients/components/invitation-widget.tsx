import {AlertDialog, Button, Typography, toast} from '@heroui/react';
import {ClipboardCopy, Mail, MessageCircle, Send, Trash2} from 'lucide-react';

import {type Client, useResendClientInviteMutation, useRevokeInvitationMutation} from '@/api/clients';
import {getApiErrorMessage} from '@/api/shared';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function formatInvitationExpiresIn(expiresAt: string): string {
  const expiresMs = new Date(expiresAt).getTime();
  const diffMs = expiresMs - Date.now();
  if (Number.isNaN(diffMs)) {
    return '';
  }
  if (diffMs <= 0) {
    return 'expired';
  }
  const days = Math.ceil(diffMs / MS_PER_DAY);
  if (days <= 1) {
    return 'today';
  }
  return `in ${days} days`;
}

function buildInvitationWhatsAppUrl({
  firstName,
  inviteUrl,
  phone,
}: {
  firstName: null | string;
  inviteUrl: string;
  phone: null | string;
}): string {
  const message = firstName
    ? `Hi ${firstName}, I've set up your coaching profile. Tap this link to get started: ${inviteUrl}`
    : `I've set up your coaching profile. Tap this link to get started: ${inviteUrl}`;
  const encoded = encodeURIComponent(message);
  const cleanPhone = phone?.replace(/\D/g, '');
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

interface InvitationWidgetProps {
  client: Client;
  /**
   * Called after a successful revoke. The client row is hard-deleted at this
   * point, so the parent is expected to navigate away (the widget no longer
   * has a valid client to render). If omitted, nothing happens after success
   * — useful for tests.
   */
  onRevoked?: () => void;
}

/**
 * The "Share invitation" widget shown at the top of a pending client's detail
 * page. Disappears once the client accepts (status flips to active — the
 * parent hides this component).
 *
 * Actions:
 *   - Copy URL to clipboard (toast on success)
 *   - WhatsApp deep-link (uses client.phone if available)
 *   - Resend invitation email (disabled if no email)
 *   - Revoke invitation (destructive, confirmation required)
 *
 * Navigation is NOT owned by the widget — the parent receives callbacks and
 * decides what to do next. This keeps the widget composable and testable.
 *
 * Copy is kept verbatim from the UX spec v2 § "The 'Share invitation' Widget".
 */
export default function InvitationWidget({client, onRevoked}: InvitationWidgetProps) {
  const [resendInvite, {isLoading: isResending}] = useResendClientInviteMutation();
  const [revokeInvitation, {isLoading: isRevoking}] = useRevokeInvitationMutation();

  const inviteUrl = client.invite_url;
  const firstName = client.first_name;
  const displayName = firstName ?? 'your client';

  // Backend contract says pending clients always have invite_url. If it's
  // missing we surface an explicit error rather than hiding silently — a
  // silent null would leave the coach stuck with no way to onboard the
  // client and no hint why.
  if (!inviteUrl) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
        <Typography
          className="text-danger"
          type="body-sm"
        >
          Invitation link unavailable. Refresh the page; if the problem persists, revoke and re-invite.
        </Typography>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied');
    } catch {
      toast.danger('Failed to copy link');
    }
  };

  // No cooldown on coach-side resend: coach is a trusted / internal user,
  // the button is disabled via `isResending` while the request is in flight
  // (preventing double-taps), and if a real rate limit becomes necessary it
  // belongs server-side. The client-side OTP screen DOES throttle, since
  // that's a public endpoint hit by end users.
  const handleResend = async () => {
    try {
      await resendInvite(client.id).unwrap();
      toast.success(`Invitation email sent to ${client.email}`);
    } catch (err) {
      toast.danger(getApiErrorMessage(err, 'Failed to resend invitation.'));
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeInvitation(client.id).unwrap();
      toast.success('Invitation revoked');
      onRevoked?.();
    } catch (err) {
      toast.danger(getApiErrorMessage(err, 'Failed to revoke invitation.'));
    }
  };

  const whatsappUrl = buildInvitationWhatsAppUrl({phone: client.phone, firstName, inviteUrl});
  const expiresIn = client.invitation_expires_at ? formatInvitationExpiresIn(client.invitation_expires_at) : null;

  const resendDisabled = !client.email || isResending;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Send size={15} />
          </span>
          <div className="min-w-0">
            <Typography
              type="body-sm"
              weight="semibold"
            >
              Invitation pending
            </Typography>
            {expiresIn ? (
              <Typography
                color="muted"
                type="body-xs"
              >
                Expires {expiresIn}
              </Typography>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-success/10 px-3 text-sm font-medium text-success transition-colors hover:bg-success/20 active:bg-success/20"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
          <Button
            onPress={handleCopy}
            size="sm"
            variant="secondary"
          >
            <ClipboardCopy size={15} />
            Copy link
          </Button>
          <Button
            isDisabled={resendDisabled}
            isPending={isResending}
            onPress={handleResend}
            size="sm"
            variant="ghost"
          >
            <Mail size={15} />
            Resend
          </Button>
          <AlertDialog>
            <Button
              aria-label="Revoke invitation"
              className="text-danger"
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <Trash2 size={15} />
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  {/*
                  Using the render-prop form so we can call `close()`
                  programmatically after a revoke attempt. On success the
                  parent nav unmounts this tree anyway; on failure the
                  explicit close hides the dialog so the error toast is
                  actually visible.
                */}
                  {({close}) => (
                    <>
                      <AlertDialog.CloseTrigger />
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>Revoke this invitation?</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        <p>
                          {displayName === 'your client' ? 'Their' : `${displayName}'s`} link will no longer work. You
                          can re-invite them later.
                        </p>
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button
                          slot="close"
                          variant="tertiary"
                        >
                          Cancel
                        </Button>
                        <Button
                          isPending={isRevoking}
                          onPress={async () => {
                            await handleRevoke();
                            close();
                          }}
                          variant="danger"
                        >
                          {isRevoking ? 'Revoking...' : 'Revoke'}
                        </Button>
                      </AlertDialog.Footer>
                    </>
                  )}
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      </div>
      {!client.email ? (
        <Typography
          className="mt-2"
          color="muted"
          type="body-xs"
        >
          No email on file — use WhatsApp to share the link.
        </Typography>
      ) : null}
    </div>
  );
}
