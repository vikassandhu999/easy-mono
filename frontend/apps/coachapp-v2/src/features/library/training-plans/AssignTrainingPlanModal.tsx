import {Button, Card, DateField, DatePicker, Label, Modal} from '@heroui/react';
import {parseDate} from '@internationalized/date';
import {Check, X} from 'lucide-react';

import type {TrainingPlan} from '@/entities/trainingPlans/api/trainingPlans';

import ClientPicker from '@/features/library/shared/ClientPicker';
import DatePickerCalendar from '@/features/library/shared/DatePickerCalendar';
import useAssignTrainingPlanModal, {
  DURATION_OPTIONS,
} from '@/features/library/training-plans/useAssignTrainingPlanModal';

type AssignTrainingPlanModalProps = {
  isOpen: boolean;
  onAssigned: (assignedPlanId: string) => void;
  onOpenChange: (open: boolean) => void;
  plan: null | TrainingPlan;
};

export default function AssignTrainingPlanModal({
  isOpen,
  onAssigned,
  onOpenChange,
  plan,
}: AssignTrainingPlanModalProps) {
  const {
    duration,
    endDate,
    formError,
    handleAssign,
    handleClose,
    handleDurationChange,
    handleStartDateChange,
    isAssigning,
    resetState,
    selectedClient,
    setEndDate,
    setFormError,
    setSelectedClient,
    startDate,
  } = useAssignTrainingPlanModal({onAssigned, onOpenChange, plan});

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetState();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="max-w-lg">
            <Modal.Header>
              <div>
                <h4 className="text-xl font-bold">Assign &ldquo;{plan?.name}&rdquo;</h4>
                <p className="text-sm font-normal text-muted">A personal copy will be created</p>
              </div>
            </Modal.Header>
            <Modal.Body className="p-4">
              <div className="flex flex-col gap-4">
                {selectedClient ? (
                  <Card className="border border-accent bg-accent/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-foreground">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{selectedClient.name}</p>
                        <p className="text-sm text-muted">{selectedClient.email}</p>
                      </div>
                      <Button
                        aria-label="Remove selection"
                        className="min-h-8 min-w-8"
                        onPress={() => setSelectedClient(null)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <ClientPicker
                    onSelect={(client) => {
                      setSelectedClient(client);
                      setFormError(null);
                    }}
                    selectedId=""
                  />
                )}

                {selectedClient ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <DatePicker
                        onChange={(date) => handleStartDateChange(date?.toString() ?? '')}
                        value={startDate ? parseDate(startDate) : null}
                      >
                        <Label className="text-sm font-medium text-foreground">Start date</Label>
                        <DateField.Group
                          fullWidth
                          variant="secondary"
                        >
                          <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                          <DateField.Suffix>
                            <DatePicker.Trigger>
                              <DatePicker.TriggerIndicator />
                            </DatePicker.Trigger>
                          </DateField.Suffix>
                        </DateField.Group>
                        <DatePicker.Popover>{DatePickerCalendar}</DatePicker.Popover>
                      </DatePicker>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">Duration</Label>
                      <div className="flex flex-wrap gap-2">
                        {DURATION_OPTIONS.map((opt) => (
                          <Button
                            className="min-h-9"
                            key={opt.value}
                            onPress={() => handleDurationChange(opt.value)}
                            size="sm"
                            type="button"
                            variant={duration === opt.value ? 'secondary' : 'outline'}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {duration === 0 ? (
                      <div className="flex flex-col gap-1">
                        <DatePicker
                          onChange={(date) => setEndDate(date?.toString() ?? '')}
                          value={endDate ? parseDate(endDate) : null}
                        >
                          <Label className="text-sm font-medium text-foreground">End date</Label>
                          <DateField.Group
                            fullWidth
                            variant="secondary"
                          >
                            <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                            <DateField.Suffix>
                              <DatePicker.Trigger>
                                <DatePicker.TriggerIndicator />
                              </DatePicker.Trigger>
                            </DateField.Suffix>
                          </DateField.Group>
                          <DatePicker.Popover>{DatePickerCalendar}</DatePicker.Popover>
                        </DatePicker>
                      </div>
                    ) : null}

                    {duration && duration > 0 && endDate ? (
                      <p className="text-sm text-muted">Ends on {endDate}</p>
                    ) : null}
                  </>
                ) : null}

                {formError ? <p className="text-sm text-foreground">{formError}</p> : null}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="min-h-11"
                onPress={handleClose}
                size="md"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                className="min-h-11"
                isDisabled={isAssigning || !selectedClient}
                onPress={handleAssign}
                size="md"
                variant="primary"
              >
                {isAssigning ? (
                  'Assigning…'
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Assign
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
