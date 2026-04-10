import {Alert, Button, Card, Input, Label, Separator, Spinner, TextArea, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, ClipboardCopy, MessageCircle, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {type Client, useInviteClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';

const schema = z
  .object({
    email: z.string().email('Invalid email address').or(z.literal('')).optional(),
    name: z.string().min(1, 'Name is required'),
    notes: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => (data.email && data.email.length > 0) || (data.phone && data.phone.length > 0), {
    message: 'At least one of email or phone is required',
  });

type InviteClientFormValues = z.infer<typeof schema>;

/**
 * Split a single name string into first_name and last_name.
 * First word becomes first_name, the rest becomes last_name.
 */
function splitName(name: string): {firstName: string; lastName?: string} {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return {firstName: trimmed};
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim() || undefined,
  };
}

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '';
}

function getWhatsAppUrl(phone: string | undefined, name: string, inviteUrl: string): string {
  const message = name
    ? `Hi ${name}, I've set up your coaching profile! Use this link to get started: ${inviteUrl}`
    : `I've set up your coaching profile! Use this link to get started: ${inviteUrl}`;
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = phone?.replace(/\D/g, '');
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Confirmation screen shown after a successful invite.
 * Displays the invite link with copy and WhatsApp share options.
 */
function InviteConfirmation({client, onInviteAnother}: {client: Client; onInviteAnother: () => void}) {
  const navigate = useNavigate();
  const inviteUrl = client.invite_url;
  const fullName = getFullName(client.first_name, client.last_name);
  const contactLabel = client.email || client.phone || 'your client';

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard');
    } catch {
      toast.danger('Failed to copy link');
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-6">
      {/* Success header */}
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Invite sent to {contactLabel}</Alert.Title>
          <Alert.Description>
            {client.email
              ? 'The email invite has been sent automatically. You can also share the link below directly.'
              : 'Share the link below with your client to get them started.'}
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Invite link section */}
      {inviteUrl ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Share the invite link with your client:</p>
          <Card>
            <Card.Content className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-foreground-500">{inviteUrl}</p>
              <Button
                aria-label="Copy invite link"
                onPress={handleCopyLink}
                size="sm"
                variant="ghost"
              >
                <ClipboardCopy size={16} />
              </Button>
            </Card.Content>
          </Card>

          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm font-medium transition-colors hover:bg-default-100 active:bg-default-200"
              href={getWhatsAppUrl(client.phone ?? undefined, fullName, inviteUrl)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle size={16} />
              Share via WhatsApp
            </a>
            <Button
              onPress={handleCopyLink}
              variant="secondary"
            >
              <ClipboardCopy size={16} />
              Copy link
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <Card.Content>
            <p className="text-sm text-foreground-500">
              The invite has been sent. The invite link will be available once the backend is updated to return it.
            </p>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex flex-wrap gap-2 pt-4">
        <Button onPress={() => navigate(`/clients/${client.id}`)}>View client</Button>
        <Button
          onPress={onInviteAnother}
          variant="secondary"
        >
          <UserPlus size={16} />
          Invite another
        </Button>
      </div>
    </div>
  );
}

export default function InviteClient() {
  const navigate = useNavigate();
  const [inviteClient, {isLoading}] = useInviteClientMutation();
  const [inviteResult, setInviteResult] = useState<Client | null>(null);

  const {
    formState: {errors},
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<InviteClientFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: InviteClientFormValues) => {
    try {
      const {firstName, lastName} = splitName(data.name);
      const result = await inviteClient({
        email: data.email || undefined,
        first_name: firstName,
        last_name: lastName,
        notes: data.notes || undefined,
        phone: data.phone || undefined,
      }).unwrap();
      setInviteResult(result.data);
    } catch (err) {
      applyFormErrors(err, 'Failed to invite client. Please try again.', setError);
    }
  };

  const handleInviteAnother = () => {
    setInviteResult(null);
    reset();
  };

  return (
    <PageLayout
      description={inviteResult ? undefined : 'Send an invitation to a new client.'}
      title={inviteResult ? 'Invite Sent' : 'Invite Client'}
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.CLIENTS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      {inviteResult ? (
        <InviteConfirmation
          client={inviteResult}
          onInviteAnother={handleInviteAnother}
        />
      ) : (
        <form
          className="flex max-w-lg flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Name <span className="text-danger">*</span>
            </Label>
            <Input
              autoComplete="name"
              id="name"
              placeholder="Vikas Sandhu"
              {...register('name')}
            />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              placeholder="client@example.com"
              type="email"
              {...register('email')}
            />
            {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              autoComplete="tel"
              id="phone"
              placeholder="+91 98765 43210"
              type="tel"
              {...register('phone')}
            />
            {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
          </div>

          <p className="text-xs text-foreground-400">At least one of email or phone is required.</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <TextArea
              id="notes"
              placeholder="Any notes about this client..."
              rows={3}
              {...register('notes')}
            />
            {errors.notes ? <p className="text-xs text-danger">{errors.notes.message}</p> : null}
          </div>

          {errors.root ? <p className="text-sm text-danger">{errors.root.message}</p> : null}

          <div className="flex flex-row gap-2 pt-2">
            <Button
              isPending={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Spinner
                    color="current"
                    size="sm"
                  />
                  Sending invite...
                </>
              ) : (
                'Send Invite'
              )}
            </Button>
            <Button
              onPress={() => navigate(ROUTES.CLIENTS)}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </PageLayout>
  );
}
