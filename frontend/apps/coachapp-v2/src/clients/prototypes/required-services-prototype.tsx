/**
 * THROWAWAY PROTOTYPE — required-services capture.
 *
 * Switch with `?context=invite|intake|edit|unclassified`.
 * Nothing persists; submit only reveals proposed request payload.
 */

import {isOneOf} from '@easy/utils/closed-vocabulary';
import {
  Button,
  Chip,
  Description,
  ErrorMessage,
  Fieldset,
  ListBox,
  Separator,
  Surface,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Check, Dumbbell, Send, TriangleAlert, Utensils} from 'lucide-react';
import {useState} from 'react';
import {Controller, type UseFormReturn, useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {z} from 'zod';
import {BackButton} from '@/@components/back-button';
import {FieldRow} from '@/@components/form-fields/field-row';
import {FormActions} from '@/@components/form-fields/form-actions';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormPanel} from '@/@components/form-fields/form-panel';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';

const SERVICES = ['training', 'nutrition'] as const;
type Service = (typeof SERVICES)[number];
const CONTEXTS = ['edit', 'intake', 'invite', 'unclassified'] as const;
type PrototypeContext = (typeof CONTEXTS)[number];

const SERVICE_CONTENT: Record<Service, {description: string; icon: typeof Dumbbell; label: string}> = {
  training: {
    description: 'Workouts, progression and training plans',
    icon: Dumbbell,
    label: 'Training',
  },
  nutrition: {
    description: 'Meal guidance and nutrition plans',
    icon: Utensils,
    label: 'Nutrition',
  },
};

const CONTEXT_LABELS: Record<PrototypeContext, string> = {
  invite: 'Invite',
  intake: 'Intake',
  edit: 'Edit client',
  unclassified: 'Unclassified',
};

const prototypeSchema = z.object({
  client_name: z.string().min(1, 'Enter client name'),
  email: z.string().email('Enter a valid email'),
  services: z.array(z.enum(SERVICES)),
});

const classifiedPrototypeSchema = prototypeSchema.extend({
  services: z.array(z.enum(SERVICES)).min(1, 'Choose at least one coaching service'),
});

type PrototypeValues = z.infer<typeof prototypeSchema>;

function defaultsFor(context: PrototypeContext): PrototypeValues {
  if (context === 'edit') {
    return {client_name: 'Maya Chen', email: 'maya@example.com', services: ['training']};
  }

  return {
    client_name: context === 'invite' ? 'Jordan Miles' : 'Maya Chen',
    email: context === 'invite' ? 'jordan@example.com' : 'maya@example.com',
    services: [],
  };
}

function parseServices(keys: Set<React.Key> | 'all'): Service[] {
  if (keys === 'all') {
    return [...SERVICES];
  }
  return [...keys].filter((key): key is Service => isOneOf(SERVICES, key));
}

function serviceCopy(context: PrototypeContext) {
  if (context === 'intake') {
    return {
      description: 'Choose Training, Nutrition, or both. You or your coach can update this later.',
      legend: 'What would you like help with?',
    };
  }
  if (context === 'invite') {
    return {
      description: 'Set services now, or leave this empty so the client can choose during intake.',
      legend: 'Coaching services',
    };
  }
  return {
    description: 'Choose every service this client requires. This can be updated at any time.',
    legend: 'Coaching services',
  };
}

function ServiceCards({context, form}: {context: PrototypeContext; form: UseFormReturn<PrototypeValues>}) {
  const selected = form.watch('services');
  const copy = serviceCopy(context);

  return (
    <Fieldset>
      <Fieldset.Legend>{copy.legend}</Fieldset.Legend>
      <Description>{copy.description}</Description>
      <Fieldset.Group>
        <Controller
          control={form.control}
          name="services"
          render={({field, fieldState}) => (
            <div className="flex flex-col gap-2">
              <ListBox
                aria-label="Coaching services"
                className="grid gap-3 sm:grid-cols-2"
                onSelectionChange={(keys) =>
                  form.setValue('services', parseServices(keys), {shouldDirty: true, shouldValidate: true})
                }
                selectedKeys={field.value}
                selectionMode="multiple"
              >
                {SERVICES.map((service) => {
                  const content = SERVICE_CONTENT[service];
                  const Icon = content.icon;
                  const isSelected = selected.includes(service);

                  return (
                    <ListBox.Item
                      className={`rounded-card border p-4 outline-none ${
                        isSelected ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                      }`}
                      id={service}
                      key={service}
                      textValue={content.label}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-panel ${
                            isSelected ? 'bg-accent text-accent-foreground' : 'bg-surface-tertiary text-muted'
                          }`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <Typography
                            type="body-sm"
                            weight="semibold"
                          >
                            {content.label}
                          </Typography>
                          <Typography
                            className="mt-1"
                            color="muted"
                            type="body-xs"
                          >
                            {content.description}
                          </Typography>
                        </span>
                        <ListBox.ItemIndicator />
                      </div>
                    </ListBox.Item>
                  );
                })}
              </ListBox>
              {fieldState.error ? <ErrorMessage>{fieldState.error.message}</ErrorMessage> : null}
            </div>
          )}
        />
      </Fieldset.Group>
    </Fieldset>
  );
}

function ClientDetails({form}: {form: UseFormReturn<PrototypeValues>}) {
  return (
    <Fieldset>
      <Fieldset.Legend>Client details</Fieldset.Legend>
      <Description>Add an email or phone number so the client can receive the invite.</Description>
      <Fieldset.Group>
        <FieldRow>
          <FormTextField
            control={form.control}
            fullWidth
            isRequired
            label="Name"
            name="client_name"
          />
          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{type: 'email'}}
            isRequired
            label="Email"
            name="email"
          />
        </FieldRow>
      </Fieldset.Group>
    </Fieldset>
  );
}

function UnclassifiedNotice() {
  return (
    <Surface className="rounded-card border border-warning bg-warning-soft p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <div>
          <Typography
            className="text-warning"
            type="body-sm"
            weight="semibold"
          >
            Coaching services have not been set
          </Typography>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            Maya is active, but Programming cannot identify missing work until Training or Nutrition is selected.
          </Typography>
        </div>
      </div>
    </Surface>
  );
}

function RequestPreview({saved}: {saved: PrototypeValues | null}) {
  if (!saved) {
    return null;
  }

  return (
    <Surface className="rounded-card border border-success bg-success-soft p-4">
      <div className="flex items-start gap-3">
        <Check className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <Typography
            className="text-success"
            type="body-sm"
            weight="semibold"
          >
            Prototype saved
          </Typography>
          <Typography
            className="mt-1 font-mono"
            color="muted"
            type="body-xs"
          >
            {JSON.stringify({required_services: saved.services})}
          </Typography>
        </div>
      </div>
    </Surface>
  );
}

function PrototypeControls({
  context,
  onContextChange,
}: {
  context: PrototypeContext;
  onContextChange: (context: PrototypeContext) => void;
}) {
  return (
    <Surface className="mb-4 rounded-panel border border-border bg-ink p-2 text-ink-foreground shadow-lg sm:fixed sm:bottom-4 sm:left-1/2 sm:z-50 sm:mb-0 sm:w-auto sm:-translate-x-1/2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Chip
          color="accent"
          size="sm"
          variant="soft"
        >
          Prototype
        </Chip>
        {CONTEXTS.map((item) => (
          <Button
            className="text-ink-foreground"
            key={item}
            onPress={() => onContextChange(item)}
            size="sm"
            variant={context === item ? 'secondary' : 'ghost'}
          >
            {CONTEXT_LABELS[item]}
          </Button>
        ))}
      </div>
    </Surface>
  );
}

function pageCopy(context: PrototypeContext) {
  if (context === 'invite') {
    return {
      description: 'Send an invitation now; coaching services can be selected now or later.',
      title: 'Invite client',
    };
  }
  if (context === 'intake') {
    return {description: 'Tell your coach which services you would like support with.', title: 'Coaching intake'};
  }
  return {description: 'Update the coaching services for this client.', title: 'Edit client'};
}

export default function RequiredServicesPrototype() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedContext = searchParams.get('context');
  const context: PrototypeContext =
    requestedContext === 'edit' || requestedContext === 'intake' || requestedContext === 'unclassified'
      ? requestedContext
      : 'invite';
  const [saved, setSaved] = useState<PrototypeValues | null>(null);
  const form = useForm<PrototypeValues>({
    defaultValues: defaultsFor(context),
    resolver: zodResolver(context === 'invite' ? prototypeSchema : classifiedPrototypeSchema),
  });
  const copy = pageCopy(context);

  const changeContext = (next: PrototypeContext) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('context', next);
    form.reset(defaultsFor(next));
    setSaved(null);
    setSearchParams(nextParams, {replace: true});
  };

  const reset = () => {
    form.reset(defaultsFor(context));
    setSaved(null);
  };

  const isInvite = context === 'invite';
  const isIntake = context === 'intake';

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className="flex items-center">
            <BackButton onPress={() => navigate(ROUTES.CLIENTS)} />
            <Page.Title>{copy.title}</Page.Title>
          </div>
          <Page.Description>{copy.description}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>

      <Page.Content
        bare
        className="pt-4 pb-6 sm:pb-40"
      >
        <Page.Frame size="content">
          <PrototypeControls
            context={context}
            onContextChange={changeContext}
          />
          <FormLayout onSubmit={form.handleSubmit((values) => setSaved(values))}>
            {context === 'unclassified' ? <UnclassifiedNotice /> : null}
            <FormPanel>
              {isInvite ? (
                <>
                  <ClientDetails form={form} />
                  <Separator className="my-6" />
                </>
              ) : null}
              <ServiceCards
                context={context}
                form={form}
              />
            </FormPanel>
            <RequestPreview saved={saved} />
            <FormActions
              isSubmitting={false}
              onCancel={reset}
              submitIcon={isInvite ? <Send /> : undefined}
              submitLabel={isInvite ? 'Send invite' : isIntake ? 'Save and continue' : 'Save changes'}
              submittingLabel={isInvite ? 'Sending invite' : 'Saving changes'}
            />
          </FormLayout>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
