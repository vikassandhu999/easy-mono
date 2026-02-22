import {Button, Input, Modal} from '@heroui/react';
import {useEffect, useRef, useState} from 'react';

type RenameWorkoutModalProps = {
  currentName: string;
  isLoading: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
};

export function RenameWorkoutModal({currentName, isLoading, isOpen, onOpenChange, onSave}: RenameWorkoutModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setTimeout(() => inputRef.current?.focus(), 100);
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
            <Modal.Header>Rename workout</Modal.Header>
            <Modal.Body>
              <Input
                className="min-h-11"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                placeholder="Workout name..."
                ref={inputRef}
                value={name}
                variant="secondary"
              />
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
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
