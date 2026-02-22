import {Button, Card, Input, Label, Modal, TextField, toast} from '@heroui/react';
import {Check, X} from 'lucide-react';
import {useState} from 'react';

import type {TrainingPlan} from '@/api/trainingPlans';

import {handleFormError} from '@/api/shared';
import {useAssignTrainingPlanMutation} from '@/api/trainingPlans';
import ClientPicker, {type PickedClient} from '@/components/ClientPicker';

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
  const [selectedClient, setSelectedClient] = useState<null | PickedClient>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState<null | string>(null);

  const [assignTrainingPlan, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();

  const resetState = () => {
    setSelectedClient(null);
    setStartDate('');
    setEndDate('');
    setFormError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleAssign = async () => {
    if (!plan) return;
    if (!selectedClient) {
      setFormError('Please choose a client to assign this plan.');
      return;
    }

    setFormError(null);
    try {
      const response = await assignTrainingPlan({
        body: {
          client_id: selectedClient.id,
          end_date: endDate.trim() || undefined,
          start_date: startDate.trim() || undefined,
        },
        id: plan.id,
      }).unwrap();
      toast.success(`Assigned "${plan.name}" to ${selectedClient.name}`);
      onAssigned(response.data.id);
      handleClose();
    } catch (error) {
      const result = handleFormError(error, 'Unable to assign training plan. Please try again.');
      setFormError(result.formError);
      toast.danger(result.formError);
    }
  };

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
            <Modal.Header>Assign to client</Modal.Header>
            <Modal.Body className="p-4">
              <div className="flex flex-col gap-4">
                <Card className="border border-separator bg-surface-secondary p-3">
                  <p className="text-sm text-foreground">{plan ? `Assigning "${plan.name}"` : 'Assigning plan'}</p>
                  <p className="text-xs text-muted">Templates create a personal copy on assign</p>
                </Card>

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

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField>
                    <Label className="text-sm font-medium text-foreground">Start date</Label>
                    <Input
                      className="min-h-11"
                      onChange={(event) => setStartDate(event.target.value)}
                      type="date"
                      value={startDate}
                      variant="secondary"
                    />
                  </TextField>
                  <TextField>
                    <Label className="text-sm font-medium text-foreground">End date</Label>
                    <Input
                      className="min-h-11"
                      onChange={(event) => setEndDate(event.target.value)}
                      type="date"
                      value={endDate}
                      variant="secondary"
                    />
                  </TextField>
                </div>

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
                  'Assigning...'
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
