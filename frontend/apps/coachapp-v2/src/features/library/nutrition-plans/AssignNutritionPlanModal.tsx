import {Button, Card, FieldError, Modal, toast} from '@heroui/react';
import {useState} from 'react';

import type {NutritionPlan} from '@/entities/nutritionPlans/api/nutritionPlans';

import {useAssignNutritionPlanMutation} from '@/entities/nutritionPlans/api/nutritionPlans';
import ClientPicker, {type PickedClient} from '@/features/library/shared/ClientPicker';
import {handleFormError} from '@/shared/api/shared';

type AssignNutritionPlanModalProps = {
  isOpen: boolean;
  onAssigned: (assignedPlanId: string) => void;
  onOpenChange: (open: boolean) => void;
  plan: null | NutritionPlan;
};

export default function AssignNutritionPlanModal({
  isOpen,
  onAssigned,
  onOpenChange,
  plan,
}: AssignNutritionPlanModalProps) {
  const [selectedClient, setSelectedClient] = useState<null | PickedClient>(null);
  const [formError, setFormError] = useState<null | string>(null);

  const [assignNutritionPlan, {isLoading: isAssigning}] = useAssignNutritionPlanMutation();

  const resetState = () => {
    setSelectedClient(null);
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
      const response = await assignNutritionPlan({
        body: {client_id: selectedClient.id},
        id: plan.id,
      }).unwrap();
      toast.success(`Assigned "${plan.name}" to ${selectedClient.name}.`);
      onAssigned(response.data.id);
      handleClose();
    } catch (error) {
      const result = handleFormError(error, 'Unable to assign nutrition plan. Please try again.');
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
          <Modal.Dialog>
            <Modal.Header>Assign nutrition plan</Modal.Header>
            <Modal.Body className="p-2">
              <Card className="border border-separator bg-surface p-4">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    Assign {plan ? `"${plan.name}" ` : 'this nutrition plan '}
                    to a client. Templates create a personal copy on assign.
                  </p>
                  <ClientPicker
                    onSelect={(client) => {
                      setSelectedClient(client);
                      setFormError(null);
                    }}
                    selectedId={selectedClient?.id ?? ''}
                  />
                  {formError ? <FieldError>{formError}</FieldError> : null}
                </div>
              </Card>
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
                variant="secondary"
              >
                {isAssigning ? 'Assigning...' : 'Assign plan'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
