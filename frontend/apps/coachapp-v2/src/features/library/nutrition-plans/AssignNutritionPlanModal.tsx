import {Button, Card, Modal, toast} from '@heroui/react';
import {Check, X} from 'lucide-react';
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
      toast.success(`Assigned "${plan.name}" to ${selectedClient.name}`);
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
