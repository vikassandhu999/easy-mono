import {Button, Card, FieldError, Input, Label, Modal, TextField, toast} from '@heroui/react';
import {useMemo, useState} from 'react';

import type {NutritionPlan} from '@/api/nutritionPlans';

import {useListClientsQuery} from '@/api/clients';
import {useAssignNutritionPlanMutation} from '@/api/nutritionPlans';
import {handleFormError} from '@/api/shared';

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
  const [query, setQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientLabel, setSelectedClientLabel] = useState('');
  const [formError, setFormError] = useState<null | string>(null);

  const [assignNutritionPlan, {isLoading: isAssigning}] = useAssignNutritionPlanMutation();

  const {data: clientsData, isLoading: isClientsLoading} = useListClientsQuery({
    limit: 200,
    offset: 0,
    search: query.trim() || undefined,
  });

  const clients = clientsData?.data ?? [];
  const filteredClients = useMemo(() => {
    if (!query.trim()) {
      return clients;
    }
    const normalized = query.trim().toLowerCase();
    return clients.filter((client) => {
      const name = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim().toLowerCase();
      return client.email.toLowerCase().includes(normalized) || name.includes(normalized);
    });
  }, [clients, query]);

  const resetState = () => {
    setQuery('');
    setSelectedClientId('');
    setSelectedClientLabel('');
    setFormError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleAssign = async () => {
    if (!plan) {
      return;
    }
    if (!selectedClientId) {
      setFormError('Please choose a client to assign this plan.');
      return;
    }

    setFormError(null);
    try {
      const response = await assignNutritionPlan({
        body: {client_id: selectedClientId},
        id: plan.id,
      }).unwrap();
      toast.success(`Assigned \"${plan.name}\" to ${selectedClientLabel || 'selected client'}.`);
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
        if (!open) {
          resetState();
        }
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
                    Assign
                    {plan ? ` \"${plan.name}\" ` : ' this nutrition plan '}
                    to a client. Templates create a personal copy on assign.
                  </p>

                  <TextField>
                    <Label className="text-sm font-medium text-foreground">Search clients</Label>
                    <Input
                      className="min-h-11"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name or email"
                      value={query}
                      variant="secondary"
                    />
                  </TextField>

                  <div className="max-h-72 overflow-y-auto rounded-lg border border-separator bg-background">
                    {isClientsLoading ? (
                      <p className="p-3 text-sm text-muted">Loading clients...</p>
                    ) : filteredClients.length === 0 ? (
                      <p className="p-3 text-sm text-muted">No clients found.</p>
                    ) : (
                      <div className="flex flex-col">
                        {filteredClients.map((client) => {
                          const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
                          const label = fullName || client.email;
                          const isSelected = selectedClientId === client.id;

                          return (
                            <button
                              className={`min-h-11 border-b border-separator px-3 py-2 text-left text-sm last:border-b-0 ${
                                isSelected
                                  ? 'bg-surface-secondary text-foreground'
                                  : 'bg-background text-muted hover:bg-surface'
                              }`}
                              key={client.id}
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setSelectedClientLabel(label);
                                setFormError(null);
                              }}
                              type="button"
                            >
                              <p className="font-medium text-foreground">{label}</p>
                              <p className="text-xs text-muted">{client.email}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

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
                isDisabled={isAssigning || !selectedClientId}
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
