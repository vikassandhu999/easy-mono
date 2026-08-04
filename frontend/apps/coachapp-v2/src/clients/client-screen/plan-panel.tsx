import {AlertDialog, Button, Dropdown, Typography, useOverlayState} from '@heroui/react';
import type {LucideIcon} from 'lucide-react';
import {MoreHorizontal} from 'lucide-react';
import {type ReactNode, useState} from 'react';

import {EmptyState} from '@/@components/empty-state';
import {SectionCard} from '@/clients/components/section-card';

/** What a caller needs to render its assign surface without a trigger of its own. */
export type AssignControl = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The plan header both CD-TR and CD-NU open with, and the "no plan" state that
 * replaces it. Identical in the design apart from the noun and the meta line —
 * `{{ trainName }} · Started 12 May · 4 days a week` against
 * `{{ nutriName }} · 1,900 kcal · P 160 g · C 190 g · F 55 g` — so the copy is the
 * parameter and the shape is not.
 *
 * The design puts ONE button on the card — `Open plan` — and hides Change / End
 * behind a ⋯ menu; three buttons in a row was the build's own invention. Since the
 * menu owns the "Change plan" item, this panel also owns the assign surface's open
 * state and its anchor, and the caller supplies the surface itself through
 * `assign` (nutrition and training assign through different content, so folding
 * that in here would mean knowing about two mutations to save one prop).
 */
export function PlanPanel({
  assign,
  assignLabel,
  emptyBody,
  emptyTitle,
  icon: Icon,
  meta,
  name,
  isEnding = false,
  onEnd,
  onOpen,
}: {
  /** Renders the assign surface in controlled mode — no trigger of its own. */
  assign?: (control: AssignControl) => ReactNode;
  /** Empty-state button copy — `Assign plan`. */
  assignLabel?: string;
  isEnding?: boolean;
  emptyBody: string;
  emptyTitle: string;
  icon?: LucideIcon;
  meta?: null | string;
  name?: null | string;
  onEnd?: () => void;
  onOpen?: () => void;
}) {
  const endState = useOverlayState();
  const [assignOpen, setAssignOpen] = useState(false);
  // Two anchors, one per branch: the ⋯ button on an active plan, the Assign
  // button on the empty state. The popover has to point at whatever opened it.

  if (!name) {
    return (
      <SectionCard>
        <EmptyState
          action={
            assign && (
              <>
                <Button
                  onPress={() => setAssignOpen(true)}
                  variant="primary"
                >
                  {assignLabel ?? 'Assign plan'}
                </Button>
                {assign({isOpen: assignOpen, onOpenChange: setAssignOpen})}
              </>
            )
          }
          body={emptyBody}
          icon={Icon}
          title={emptyTitle}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center gap-4 p-4">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-panel bg-accent-soft text-accent">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Typography
            truncate
            type="body-sm"
            weight="bold"
          >
            {name}
          </Typography>
          {meta && (
            <Typography
              color="muted"
              type="body-xs"
            >
              {meta}
            </Typography>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onOpen && (
            <Button
              onPress={onOpen}
              size="sm"
              variant="outline"
            >
              Open plan
            </Button>
          )}
          {(assign || onEnd) && (
            <Dropdown>
              <Button
                aria-label="Plan options"
                isIconOnly
                variant="outline"
              >
                <MoreHorizontal />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  onAction={(key) => {
                    // Menu activation goes through `onAction` so keyboard works —
                    // RAC does not route Enter/Space through an item's `onPress`.
                    if (key === 'change') {
                      setAssignOpen(true);
                    } else if (key === 'end') {
                      endState.open();
                    }
                  }}
                >
                  {/* "Change plan" is the same control as "Assign plan" — picking a
                      new one replaces the current assignment, so there is no second
                      flow. */}
                  {assign && <Dropdown.Item id="change">Change plan</Dropdown.Item>}
                  {onEnd && (
                    <Dropdown.Item
                      id="end"
                      variant="danger"
                    >
                      End plan
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
          {assign?.({isOpen: assignOpen, onOpenChange: setAssignOpen})}
          {onEnd && (
            <AlertDialog.Backdrop
              isDismissable={!isEnding}
              isOpen={endState.isOpen}
              onOpenChange={endState.setOpen}
            >
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>End this plan?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    {name} stops appearing in their app. Logged history stays, and you can assign a new plan any time.
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      isDisabled={isEnding}
                      slot="close"
                      variant="tertiary"
                    >
                      Keep plan
                    </Button>
                    <Button
                      isPending={isEnding}
                      onPress={() => {
                        onEnd();
                        endState.close();
                      }}
                      variant="danger"
                    >
                      End plan
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
