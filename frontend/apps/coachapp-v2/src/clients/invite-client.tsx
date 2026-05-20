import {Alert, Button, Card, Input, Label, Separator, Spinner, TextArea, toast, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, ClipboardCopy, MessageCircle, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
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
 * Schema fields react-hook-form can actually highlight. Backend field keys
 * NOT in this list (e.g. `first_name`, `last_name`, `base`) get hoisted into
 * the form-root message by applyFormErrors — without this, the parser would
 * silently `setError('first_name', ...)` on a form that has no `first_name`
 * registered and the user would see "Please review highlighted fields" with
 * nothing highlighted.
 */
const KNOWN_FIELDS = ['email', 'name', 'notes', 'phone'] as const;

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

      {inviteUrl ? (
        <div className="flex flex-col gap-3">
          <Typography weight="medium">Share the invite link with your client</Typography>
          <Card>
            <Card.Content className="flex items-center gap-2">
              <Typography
                className="min-w-0 flex-1"
                color="muted"
                truncate
                type="body-sm"
              >
                {inviteUrl}
              </Typography>
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
            <Typography
              color="muted"
              type="body-sm"
            >
              The invite has been sent. The invite link will be available once the backend returns it
            </Typography>
          </Card.Content>
        </Card>
      )}

      <Separator />
      <div className="flex flex-wrap gap-2 pt-4">
        <Button onPress={() => navigate(`/clients/${client.id}`, {replace: true})}>View client</Button>
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
  const goBack = useGoBack(ROUTES.CLIENTS);
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
      applyFormErrors(err, "Client wasn't invited. Check the details and try again", setError, KNOWN_FIELDS);
    }
  };

  const handleInviteAnother = () => {
    setInviteResult(null);
    reset();
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>{inviteResult ? 'Invite sent' : 'Invite client'}</Page.Title>
          {!inviteResult && <Page.Description>Send an invite to a new client</Page.Description>}
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Clients
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
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
              {errors.name ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.name.message}
                </Typography>
              ) : null}
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
              {errors.email ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.email.message}
                </Typography>
              ) : null}
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
              {errors.phone ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.phone.message}
                </Typography>
              ) : null}
            </div>

            <Typography
              color="muted"
              type="body-xs"
            >
              Add email or phone
            </Typography>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <TextArea
                id="notes"
                placeholder="Any notes about this client..."
                rows={3}
                {...register('notes')}
              />
              {errors.notes ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.notes.message}
                </Typography>
              ) : null}
            </div>

            {errors.root ? (
              <Typography
                className="text-danger"
                type="body-sm"
              >
                {errors.root.message}
              </Typography>
            ) : null}

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
                    Sending invite
                  </>
                ) : (
                  'Send invite'
                )}
              </Button>
              <Button
                onPress={() => goBack()}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Page.Content>
    </Page>
  );
}
