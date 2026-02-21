import {Button, Modal, Radio, RadioGroup} from '@heroui/react';
import {useState} from 'react';

import {DAYS, toSentenceLabel} from '@/pages/library/nutritionPlanBuilderShared';

type CopyDayDialogProps = {
  dayMealCounts: Record<string, number>;
  isOpen: boolean;
  onConfirm: (targetDay: string) => void;
  onOpenChange: (open: boolean) => void;
  sourceDay: string;
};

export default function CopyDayDialog({dayMealCounts, isOpen, onConfirm, onOpenChange, sourceDay}: CopyDayDialogProps) {
  const availableDays = DAYS.filter((d) => d !== sourceDay);
  const [selected, setSelected] = useState(availableDays[0] ?? '');

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Copy from {toSentenceLabel(sourceDay)}</Modal.Header>
            <Modal.Body>
              <p className="mb-3 text-sm text-muted">Select the target day to copy assignments to:</p>
              <RadioGroup
                onChange={(e) => setSelected(e.target.value)}
                value={selected}
              >
                {availableDays.map((day) => (
                  <Radio
                    key={day}
                    value={day}
                  >
                    {toSentenceLabel(day)} ({dayMealCounts[day] ?? 0} assignments)
                  </Radio>
                ))}
              </RadioGroup>
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
                isDisabled={!selected}
                onPress={() => onConfirm(selected)}
                size="md"
                variant="primary"
              >
                Copy
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
