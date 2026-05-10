import {Button, Popover} from '@heroui/react';
import {Copy, CopyPlus, UserPlus} from 'lucide-react';
import {useState} from 'react';

type CopyMenuProps = {
  /** Whether the plan belongs to a client (personal) or is a template */
  clientId: null | string;
  /** Called when the user picks "Copy to client" / "Copy to another client" */
  onCopyToClient: () => void;
  /** Called when the user picks "Duplicate as template" / "Save as template" */
  onDuplicate: () => void;
};

/**
 * Unified "Copy" popover menu for plan detail pages.
 *
 * Shows contextual labels based on whether the plan is a template or personal:
 * - Template: "Copy to client" / "Duplicate as template"
 * - Personal: "Copy to another client" / "Save as template"
 *
 * Container decision: POPOVER — no keyboard involved, pure tap selection.
 */
export default function CopyMenu({clientId, onCopyToClient, onDuplicate}: CopyMenuProps) {
  const isPersonal = clientId !== null;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <Popover.Trigger>
        <Button
          className="min-h-11"
          size="sm"
          variant="secondary"
        >
          <Copy size={14} />
          Copy
        </Button>
      </Popover.Trigger>
      <Popover.Content
        className="min-w-[200px] p-1"
        placement="bottom end"
      >
        <Popover.Dialog className="outline-none">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-content2 active:bg-content2"
            onClick={() => {
              onCopyToClient();
              setIsOpen(false);
            }}
            type="button"
          >
            <UserPlus
              className="shrink-0 text-foreground-500"
              size={14}
            />
            {isPersonal ? 'Copy to another client' : 'Copy to client'}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-content2 active:bg-content2"
            onClick={() => {
              onDuplicate();
              setIsOpen(false);
            }}
            type="button"
          >
            <CopyPlus
              className="shrink-0 text-foreground-500"
              size={14}
            />
            {isPersonal ? 'Save as template' : 'Duplicate as template'}
          </button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
