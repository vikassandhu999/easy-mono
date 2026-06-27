import {Alert, Button, Spinner, Typography, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useEnrollProspectMutation, useGetProspectQuery} from '@/api/prospects';
import {getApiErrorMessage} from '@/api/shared';

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-muted';

function splitName(name: string): {first: string; last: string} {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return {first, last: rest.join(' ')};
}

function Row({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        className={inputCls}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

export default function EnrollProspect() {
  const {id = ''} = useParams();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetProspectQuery({id});
  const [enroll, {isLoading: isEnrolling}] = useEnrollProspectMutation();

  const prospect = data?.data;
  const [form, setForm] = useState({first_name: '', last_name: '', email: '', phone: ''});

  useEffect(() => {
    if (prospect) {
      const {first, last} = splitName(prospect.name);
      setForm({first_name: first, last_name: last, email: prospect.email ?? '', phone: prospect.phone ?? ''});
    }
  }, [prospect]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({...f, ...patch}));

  const handleEnroll = async () => {
    try {
      const result = await enroll({
        id,
        prospectEnrollRequest: {
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        },
      }).unwrap();
      toast.success(result.data.already_enrolled ? 'Already enrolled' : 'Client invited');
      navigate(ROUTES.CLIENT_DETAIL.replace(':id', result.data.prospect.client?.id ?? ''));
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Couldn't enroll this prospect"));
    }
  };

  const header = (
    <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
      <button
        className="mb-2 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        onClick={() => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', id))}
        type="button"
      >
        <ArrowLeft size={16} /> Prospect
      </button>
      <Page.TitleGroup>
        <Page.Title>Enroll prospect</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !prospect) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="mx-auto max-w-lg pt-4">
            <Alert status="danger">
              <Alert.Content>
                <Alert.Title>Couldn't load this prospect.</Alert.Title>
              </Alert.Content>
            </Alert>
          </div>
        </Page.Content>
      </Page>
    );
  }

  // Already enrolled — surface the linked client instead of inviting again.
  if (prospect.client) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-lg flex-col gap-3 pt-4">
            <Typography color="muted">This prospect is already enrolled.</Typography>
            <Button
              className="self-start"
              onPress={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', prospect.client?.id ?? ''))}
            >
              View client
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      {header}
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-lg flex-col gap-4 pt-2">
          <Typography
            color="muted"
            type="body-sm"
          >
            Enrolling sends a client invite and links this prospect. They become a pending client until they accept.
          </Typography>
          <Row
            label="First name"
            onChange={(v) => set({first_name: v})}
            value={form.first_name}
          />
          <Row
            label="Last name"
            onChange={(v) => set({last_name: v})}
            value={form.last_name}
          />
          <Row
            label="Email"
            onChange={(v) => set({email: v})}
            type="email"
            value={form.email}
          />
          <Row
            label="Phone"
            onChange={(v) => set({phone: v})}
            type="tel"
            value={form.phone}
          />
          <Button
            className="mt-2 self-start"
            isDisabled={isEnrolling}
            onPress={handleEnroll}
          >
            Send invite & enroll
          </Button>
        </div>
      </Page.Content>
    </Page>
  );
}
