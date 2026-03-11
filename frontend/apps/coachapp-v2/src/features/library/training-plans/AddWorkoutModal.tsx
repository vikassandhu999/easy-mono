import {Button, FieldError, Input, Label, ListBox, Modal, Select, TextField} from '@heroui/react';
import {useEffect, useState} from 'react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type AddWorkoutModalProps = {
  defaultDayIndex: number;
  isAdding: boolean;
  isOpen: boolean;
  onAdd: (dayNumber: number, name: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export default function AddWorkoutModal({
  defaultDayIndex,
  isAdding,
  isOpen,
  onAdd,
  onOpenChange,
}: AddWorkoutModalProps) {
  const [selectedDay, setSelectedDay] = useState<string>(DAY_LABELS[defaultDayIndex] ?? 'Mon');
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedDay(DAY_LABELS[defaultDayIndex] ?? 'Mon');
      setName('');
    }
  }, [isOpen, defaultDayIndex]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const dayNumber = (DAY_LABELS as readonly string[]).indexOf(selectedDay) + 1;
    await onAdd(dayNumber, name.trim());
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
              <h4 className="text-xl font-bold">Add workout</h4>
            </Modal.Header>
            <Modal.Body className="p-4">
              <div className="flex flex-col gap-4">
                <Select
                  onChange={(value) => {
                    if (value !== null) setSelectedDay(value?.toString() ?? 'Mon');
                  }}
                  value={selectedDay}
                  variant="secondary"
                >
                  <Label className="text-sm font-medium text-foreground">Day</Label>
                  <Select.Trigger className="min-h-11 w-full">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {DAY_LABELS.map((label) => (
                        <ListBox.Item
                          key={label}
                          textValue={label}
                        >
                          {label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField
                  className="min-h-11"
                  isRequired
                  name="Name"
                  onChange={(value) => setName(value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                  }}
                  type="text"
                  value={name}
                  variant="secondary"
                >
                  <Label>Name</Label>
                  <Input placeholder="e.g. Push Day, Leg Day…" />
                  <FieldError />
                </TextField>
              </div>
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
                isDisabled={isAdding || !name.trim()}
                onPress={handleAdd}
                size="md"
                variant="primary"
              >
                {isAdding ? 'Adding…' : 'Add workout'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
