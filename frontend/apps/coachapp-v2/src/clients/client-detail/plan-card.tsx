/**
 * The assigned-plan card and its empty state, shared by CD/TR and CD/NU — the
 * two designs are the same component with a different icon and copy
 * (data-ref CD-TR-* and CD-NU-*, spec §4.1 / §5.1).
 *
 * Owns: Open plan (desktop), ⋯ → Change plan (controlled AssignSurface) /
 * End plan (AlertDialog → archive), and the empty state's Assign plan.
 */
import {AlertDialog, Button, Dropdown, Label, Typography} from '@heroui/react';
import {MoreHorizontal} from 'lucide-react';
import {type ReactNode, useRef, useState} from 'react';

import type {Client} from '@/api/generated';
import {ACCENT_BUTTON, CARD, OUTLINE_BUTTON} from '@/clients/client-detail/ui';
import AssignSurface from '@/clients/components/assign-surface';
import type {PlanKind} from '@/clients/components/plan-assign-content';
import PlanAssignContent from '@/clients/components/plan-assign-content';

const ICON_BTN =
  'size-8.5 min-h-0 min-w-0 rounded-panel border border-border bg-surface px-1.5 py-px text-foreground [box-shadow:none] [column-gap:normal] [row-gap:normal] font-normal leading-[normal] sm:size-9';

export function PlanCard({
  client,
  endBody,
  icon,
  isEnding,
  kind,
  meta,
  name,
  onEnd,
  onOpen,
  testId,
}: {
  client: Client;
  /** AlertDialog body for End plan — the two tabs word it differently. */
  endBody: string;
  icon: ReactNode;
  isEnding: boolean;
  kind: PlanKind;
  meta: string;
  name: string;
  onEnd: () => Promise<void>;
  onOpen: () => void;
  /** `tr` or `nu` — prefixes the style-diff manifest's selectors. */
  testId: string;
}) {
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const [isChangeOpen, setChangeOpen] = useState(false);
  const [isEndOpen, setEndOpen] = useState(false);

  return (
    <>
      <div
        className={`${CARD} flex items-center gap-3 px-3.75 py-3.25 sm:gap-3.75 sm:px-4.5 sm:py-3.75`}
        data-testid={`${testId}-plan`}
      >
        <span
          className="flex size-10 flex-none items-center justify-center rounded-panel bg-accent-soft text-accent sm:size-11 sm:rounded-panel"
          data-testid={`${testId}-plan-icon`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="text-body font-bold sm:text-body"
            data-testid={`${testId}-plan-name`}
          >
            {name}
          </div>
          <div
            className="mt-0.5 text-eyebrow text-muted sm:text-eyebrow"
            data-testid={`${testId}-plan-meta`}
          >
            {meta}
          </div>
        </div>
        <Button
          className={`${OUTLINE_BUTTON} hidden h-9 px-3.75 sm:inline-flex`}
          data-testid={`${testId}-plan-open`}
          onPress={onOpen}
        >
          Open plan
        </Button>
        <Dropdown>
          <Button
            aria-label="Plan options"
            className={ICON_BTN}
            data-testid={`${testId}-plan-menu`}
            isIconOnly
            ref={menuRef}
            variant="ghost"
          >
            <MoreHorizontal className="size-4 text-muted sm:size-4.25" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'change') {
                  setChangeOpen(true);
                } else if (key === 'end') {
                  setEndOpen(true);
                }
              }}
            >
              <Dropdown.Item
                id="change"
                textValue="Change plan"
              >
                <Label>Change plan</Label>
              </Dropdown.Item>
              <Dropdown.Item
                id="end"
                textValue="End plan"
                variant="danger"
              >
                <Label>End plan</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <AssignSurface
        anchorRef={menuRef}
        isOpen={isChangeOpen}
        label="Change plan"
        onOpenChange={setChangeOpen}
      >
        {(close) => (
          <PlanAssignContent
            clientId={client.id}
            clientName={client.first_name ?? 'this client'}
            kind={kind}
            onClose={close}
          />
        )}
      </AssignSurface>

      <AlertDialog.Backdrop
        isOpen={isEndOpen}
        onOpenChange={setEndOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>End this plan?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>{endBody}</Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={() => setEndOpen(false)}
                variant="outline"
              >
                Keep plan
              </Button>
              <Button
                isPending={isEnding}
                onPress={async () => {
                  await onEnd();
                  setEndOpen(false);
                }}
                variant="danger"
              >
                End plan
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

export function EmptyPlanCard({
  body,
  client,
  icon,
  kind,
  testId,
  title,
}: {
  body: string;
  client: Client;
  icon: ReactNode;
  kind: PlanKind;
  testId: string;
  title: string;
}) {
  return (
    <div
      className={`${CARD} flex flex-col items-center gap-1.25 px-4.5 py-7.5 text-center sm:gap-1.5 sm:px-5 sm:py-9`}
      data-testid={`${testId}-empty`}
    >
      <span
        className="mb-0.75 flex size-12 items-center justify-center rounded-panel bg-surface-tertiary text-muted sm:mb-1 sm:size-13 sm:rounded-card"
        data-testid={`${testId}-empty-icon`}
      >
        {icon}
      </span>
      <div
        className="font-grotesk text-body font-semibold sm:text-title"
        data-testid={`${testId}-empty-title`}
      >
        {title}
      </div>
      <div
        className="text-eyebrow text-muted sm:max-w-70 sm:text-eyebrow"
        data-testid={`${testId}-empty-sub`}
      >
        {body}
      </div>
      <AssignSurface
        label="Assign plan"
        triggerClassName={`${ACCENT_BUTTON} mt-2.25 h-9 px-3.75 sm:mt-2.5 sm:h-9.5`}
        triggerTestId={`${testId}-empty-btn`}
      >
        {(close) => (
          <PlanAssignContent
            clientId={client.id}
            clientName={client.first_name ?? 'this client'}
            kind={kind}
            onClose={close}
          />
        )}
      </AssignSurface>
    </div>
  );
}
