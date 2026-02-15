import {Button, Card, Input, Label, Modal, SearchField, TextField, toast} from '@heroui/react';
import {Check, Search, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {Client} from '@/api/clients';
import type {TrainingPlan} from '@/api/trainingPlans';

import {useListClientsQuery} from '@/api/clients';
import {handleFormError} from '@/api/shared';
import {useAssignTrainingPlanMutation} from '@/api/trainingPlans';
import {CLIENT_STATUS_STYLES, getClientInitial, getClientName} from '@/pages/clients/clientDisplay';

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
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState<null | string>(null);

  const [assignTrainingPlan, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();

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
      const name = getClientName(client).toLowerCase();
      return client.email.toLowerCase().includes(normalized) || name.includes(normalized);
    });
  }, [clients, query]);

  const resetState = () => {
    setQuery('');
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
    if (!plan) {
      return;
    }
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
      toast.success(`Assigned "${plan.name}" to ${getClientName(selectedClient)}`);
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
        if (!open) {
          resetState();
        }
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
                        {getClientInitial(selectedClient)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{getClientName(selectedClient)}</p>
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
                  <>
                    <SearchField>
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search by name or email..."
                          value={query}
                        />
                      </SearchField.Group>
                    </SearchField>

                    <div className="max-h-60 overflow-y-auto rounded-lg border border-separator bg-surface">
                      {isClientsLoading ? (
                        <div className="flex flex-col gap-2 p-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              className="flex items-center gap-3 p-2"
                              key={i}
                            >
                              <div className="h-10 w-10 animate-pulse rounded-full bg-surface-secondary" />
                              <div className="flex-1 space-y-1">
                                <div className="h-4 w-32 animate-pulse rounded bg-surface-secondary" />
                                <div className="h-3 w-24 animate-pulse rounded bg-surface-secondary" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 p-6 text-center">
                          <Search className="h-8 w-8 text-muted" />
                          <p className="font-medium text-foreground">
                            {query.trim() ? 'No clients found' : 'No clients available'}
                          </p>
                          <p className="text-sm text-muted">
                            {query.trim() ? 'Try a different search term' : 'Add clients first to assign plans'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {filteredClients.map((client) => (
                            <button
                              className="group flex items-center gap-3 border-b border-separator p-3 text-left transition-colors hover:bg-surface-secondary last:border-b-0"
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client);
                                setFormError(null);
                              }}
                              type="button"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-foreground">
                                {getClientInitial(client)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-foreground">{getClientName(client)}</p>
                                <p className="truncate text-sm text-muted">{client.email}</p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize ${
                                  CLIENT_STATUS_STYLES[client.status] ?? 'bg-surface-secondary text-muted'
                                }`}
                              >
                                {client.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
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

                {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
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
