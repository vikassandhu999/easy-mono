import {isOneOf} from '@easy/utils/closed-vocabulary';
import {Description, ErrorMessage, Fieldset, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {Dumbbell, Utensils} from 'lucide-react';

import type {RequiredService, RequiredServices, RequiredServicesNonEmpty} from '@/api/clients';

export const REQUIRED_SERVICE_VALUES = ['training', 'nutrition'] as const satisfies readonly RequiredService[];

const SERVICE_CONTENT = {
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
} satisfies Record<RequiredService, {description: string; icon: typeof Dumbbell; label: string}>;

/**
 * The canonical tuple for a selection, or undefined when nothing is selected.
 * Built one branch at a time so the tuple is CONSTRUCTED rather than asserted —
 * `RequiredServices` is a union of tuples and no length check narrows into it.
 */
export function nonEmptyRequiredServices(services: readonly RequiredService[]): RequiredServicesNonEmpty | undefined {
  const training = services.includes('training');
  const nutrition = services.includes('nutrition');
  if (training && nutrition) {
    return ['training', 'nutrition'];
  }
  if (training) {
    return ['training'];
  }
  if (nutrition) {
    return ['nutrition'];
  }
  return undefined;
}

export function canonicalRequiredServices(services: readonly RequiredService[]): RequiredServices {
  return nonEmptyRequiredServices(services) ?? [];
}

function selectedServices(keys: Set<React.Key>): RequiredService[] {
  return [...keys].filter((key): key is RequiredService => isOneOf(REQUIRED_SERVICE_VALUES, key));
}

export default function RequiredServicesField({
  description,
  error,
  onChange,
  services,
}: {
  description: string;
  error?: string | undefined;
  onChange: (services: RequiredService[]) => void;
  services: readonly RequiredService[];
}) {
  return (
    <Fieldset>
      <Fieldset.Legend>Coaching services</Fieldset.Legend>
      <Description>{description}</Description>
      <Fieldset.Group>
        <div className="flex flex-col gap-2">
          <ToggleButtonGroup
            aria-label="Coaching services"
            className="grid gap-3 sm:grid-cols-2"
            isDetached
            onSelectionChange={(keys) => onChange(selectedServices(keys))}
            selectedKeys={services}
            selectionMode="multiple"
          >
            {REQUIRED_SERVICE_VALUES.map((service) => {
              const content = SERVICE_CONTENT[service];
              const Icon = content.icon;
              const selected = services.includes(service);
              return (
                <ToggleButton
                  className={`toggle-button--row rounded-card border p-4 outline-none ${
                    selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                  }`}
                  id={service}
                  key={service}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-panel ${
                        selected ? 'bg-accent text-accent-foreground' : 'bg-surface-tertiary text-muted'
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
                  </div>
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
          {error ? <ErrorMessage>{error}</ErrorMessage> : null}
        </div>
      </Fieldset.Group>
    </Fieldset>
  );
}
