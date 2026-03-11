import {Button, Dropdown, Label} from '@heroui/react';
import {Link} from '@tanstack/react-router';
import {ArrowLeft, ArrowUpRight, Copy, EllipsisVertical, Pencil, UserPlus} from 'lucide-react';

import {toSentenceCase} from '@/shared/lib/format/formatHelpers';

type PlanBuilderHeaderActions = {
  onAssign: () => void;
  onDuplicate: () => void;
  onNavigateBack: () => void;
  onNavigateEdit: () => void;
};

type PlanBuilderHeaderProps = {
  actions: PlanBuilderHeaderActions;
  client: null | {id: string; name: string};
  isDuplicating: boolean;
  isTemplate: boolean;
  plan: {name: string; status: string};
};

export default function PlanBuilderHeader({actions, client, isDuplicating, isTemplate, plan}: PlanBuilderHeaderProps) {
  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'edit':
        actions.onNavigateEdit();
        break;
      case 'duplicate':
        actions.onDuplicate();
        break;
      case 'assign':
        actions.onAssign();
        break;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={actions.onNavigateBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Library
        </Button>

        {/* Desktop: labeled buttons */}
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            className="min-h-11 gap-2"
            onPress={actions.onNavigateEdit}
            size="md"
            variant="outline"
          >
            <Pencil className="h-4 w-4" />
            Edit details
          </Button>
          <Button
            className="min-h-11 gap-2"
            isDisabled={isDuplicating}
            onPress={actions.onDuplicate}
            size="md"
            variant="ghost"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          {isTemplate ? (
            <Button
              className="min-h-11 gap-2"
              onPress={actions.onAssign}
              size="md"
              variant="secondary"
            >
              <UserPlus className="h-4 w-4" />
              Assign
            </Button>
          ) : null}
        </div>

        {/* Mobile: overflow menu */}
        <div className="sm:hidden">
          <Dropdown>
            <Dropdown.Trigger>
              <Button
                aria-label="More actions"
                className="min-h-11 min-w-11"
                size="md"
                variant="ghost"
              >
                <EllipsisVertical className="h-5 w-5" />
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom left">
              <Dropdown.Menu
                aria-label="Plan actions"
                disabledKeys={isDuplicating ? new Set(['duplicate']) : new Set()}
                onAction={handleAction}
              >
                <Dropdown.Item
                  id="edit"
                  textValue="Edit details"
                >
                  <Pencil className="h-4 w-4" />
                  <Label>Edit details</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id="duplicate"
                  textValue="Duplicate plan"
                >
                  <Copy className="h-4 w-4" />
                  <Label>Duplicate plan</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id="assign"
                  isDisabled={!isTemplate}
                  textValue="Assign to client"
                >
                  <UserPlus className="h-4 w-4" />
                  <Label>Assign to client</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 px-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">{plan.name}</h1>
          {client ? (
            <Link
              className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
              to={`/clients/${client.id}`}
            >
              {client.name}
              <ArrowUpRight className="h-3 w-3 shrink-0" />
            </Link>
          ) : null}
        </div>
        <span className="mt-1.5 shrink-0 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
          {toSentenceCase(plan.status)}
        </span>
      </div>
    </div>
  );
}
