import {Button, FieldError, Input, Label, Modal, TextField} from '@heroui/react';
import {useEffect, useState} from 'react';

type RenameMealModalProps = {
  currentName: string;
  isLoading: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
};

export function RenameMealModal({currentName, isLoading, isOpen, onOpenChange, onSave}: RenameMealModalProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      onSave(trimmed);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <h4 className="text-xl font-bold">Rename meal</h4>
            </Modal.Header>
            <Modal.Body className="p-4">
              <TextField
                onChange={(value) => setName(value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                value={name}
                variant="secondary"
              >
                <Label>Name</Label>
                <Input placeholder="Meal name…" />
                <FieldError />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="min-h-11"
                onPress={() => onOpenChange(false)}
                size="md"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                className="min-h-11"
                isDisabled={isLoading || !name.trim()}
                onPress={handleSave}
                size="md"
                variant="primary"
              >
                {isLoading ? 'Saving…' : 'Save'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
