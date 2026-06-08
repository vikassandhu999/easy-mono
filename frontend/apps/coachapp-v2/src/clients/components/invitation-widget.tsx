import {AlertDialog, Button, Card, Separator, toast} from '@heroui/react';
import {ClipboardCopy, MessageCircle, Send, Trash2} from 'lucide-react';

import {type Client, useResendClientInviteMutation, useRevokeInvitationMutation} from '@/api/clients';
import {getApiErrorMessage} from '@/api/shared';
import {
  buildInvitationWhatsAppUrl,
  formatInvitationExpiresIn,
  formatInvitationSentAgo,
} from '@/domain/client-invitations';

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
      <Card>
        <Card.Content className="p-4">
          <p className="text-sm text-danger">
            Invitation link unavailable. Refresh the page; if the problem persists, revoke and re-invite.
          </p>
        </Card.Content>
      </Card>
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
  const sentAgo = client.invitation_sent_at ? formatInvitationSentAgo(client.invitation_sent_at) : null;
  const expiresIn = client.invitation_expires_at ? formatInvitationExpiresIn(client.invitation_expires_at) : null;

  const resendDisabled = !client.email || isResending;

  return (
    <Card>
      <Card.Content className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Invitation</h3>
          <p className="text-xs text-foreground-500">Share this link with {displayName} to onboard them:</p>
        </div>

        <div className="flex min-h-11 items-center gap-2 rounded-lg border border-divider bg-content2 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-foreground-500">{inviteUrl}</p>
          <Button
            aria-label="Copy invite link"
            onPress={handleCopy}
            size="sm"
            variant="ghost"
          >
            <ClipboardCopy size={16} />
            Copy
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700 transition-colors hover:bg-success-100 active:bg-success-200"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle size={16} />
            Share on WhatsApp
          </a>
          <Button
            isDisabled={resendDisabled}
            isPending={isResending}
            onPress={handleResend}
            variant="secondary"
          >
            <Send size={16} />
            Resend email
          </Button>
        </div>
        {!client.email ? (
          <p className="text-xs text-foreground-400">No email on file — use WhatsApp to share the link.</p>
        ) : null}

        {sentAgo || expiresIn ? (
          <div className="flex flex-col gap-0.5 text-xs text-foreground-500">
            {sentAgo ? <p>Invited {sentAgo}.</p> : null}
            {expiresIn ? <p>Invitation expires {expiresIn}.</p> : null}
          </div>
        ) : null}

        <Separator />
        <AlertDialog>
          <Button
            size="sm"
            variant="ghost"
          >
            <Trash2 size={16} />
            Revoke invitation
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
                        {displayName === 'your client' ? 'Their' : `${displayName}'s`} link will no longer work. You can
                        re-invite them later.
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
      </Card.Content>
    </Card>
  );
}
