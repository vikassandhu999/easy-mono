import {Button, ListBox, Popover} from '@heroui/react';
import {Copy, CopyPlus, UserPlus} from 'lucide-react';
import {useState} from 'react';

type CopyMenuProps = {
  clientId: null | string;
  onCopyToClient: () => void;
  onDuplicate: () => void;
};

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
          <ListBox
            aria-label="Copy options"
            onAction={(key) => {
              if (key === 'copy-to-client') {
                onCopyToClient();
              } else if (key === 'duplicate') {
                onDuplicate();
              }
              setIsOpen(false);
            }}
            selectionMode="none"
          >
            <ListBox.Item
              id="copy-to-client"
              textValue={isPersonal ? 'Copy to another client' : 'Copy to client'}
            >
              <UserPlus
                className="shrink-0 text-foreground-500"
                size={14}
              />
              {isPersonal ? 'Copy to another client' : 'Copy to client'}
            </ListBox.Item>
            <ListBox.Item
              id="duplicate"
              textValue={isPersonal ? 'Save as template' : 'Duplicate as template'}
            >
              <CopyPlus
                className="shrink-0 text-foreground-500"
                size={14}
              />
              {isPersonal ? 'Save as template' : 'Duplicate as template'}
            </ListBox.Item>
          </ListBox>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
