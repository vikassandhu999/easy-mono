import {Button, Card, Input, Label, Modal, TextField, toast} from '@heroui/react';
import {Check, Search, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import {useAssignNutritionPlanMutation, useListNutritionPlansQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {useAssignTrainingPlanMutation, useListTrainingPlansQuery} from '@/entities/trainingPlans/api/trainingPlans';
import {handleFormError} from '@/shared/api/shared';

type AssignTemplatePickerProps = {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planType: 'nutrition' | 'training';
};

export default function AssignTemplatePicker({
  clientId,
  clientName,
  isOpen,
  onOpenChange,
  planType,
}: AssignTemplatePickerProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState<null | string>(null);

  const {data: trainingData, isLoading: trainingLoading} = useListTrainingPlansQuery(
    {is_template: true},
    {skip: planType !== 'training' || !isOpen},
  );
  const {data: nutritionData, isLoading: nutritionLoading} = useListNutritionPlansQuery(
    {type: 'template'},
    {skip: planType !== 'nutrition' || !isOpen},
  );

  const [assignTraining, {isLoading: assigningTraining}] = useAssignTrainingPlanMutation();
  const [assignNutrition, {isLoading: assigningNutrition}] = useAssignNutritionPlanMutation();

  const isAssigning = assigningTraining || assigningNutrition;
  const isLoading = planType === 'training' ? trainingLoading : nutritionLoading;

  const templates = useMemo(() => {
    const list = planType === 'training' ? (trainingData?.data ?? []) : (nutritionData?.data ?? []);
    if (!query.trim()) return list;
    const normalized = query.trim().toLowerCase();
    return list.filter((t) => t.name.toLowerCase().includes(normalized));
  }, [planType, trainingData?.data, nutritionData?.data, query]);

  const selectedTemplate = useMemo(
    () => (selectedId ? (templates.find((t) => t.id === selectedId) ?? null) : null),
    [selectedId, templates],
  );

  const resetState = () => {
    setQuery('');
    setSelectedId(null);
    setStartDate('');
    setEndDate('');
    setFormError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleAssign = async () => {
    if (!selectedId) {
      setFormError('Please select a template to assign.');
      return;
    }

    setFormError(null);
    try {
      if (planType === 'training') {
        await assignTraining({
          body: {
            client_id: clientId,
            end_date: endDate.trim() || undefined,
            start_date: startDate.trim() || undefined,
          },
          id: selectedId,
        }).unwrap();
      } else {
        await assignNutrition({
          body: {client_id: clientId},
          id: selectedId,
        }).unwrap();
      }

      toast.success(`Assigned "${selectedTemplate?.name}" to ${clientName}`);
      handleClose();
    } catch (error) {
      const result = handleFormError(error, 'Unable to assign plan. Please try again.');
      setFormError(result.formError);
      toast.danger(result.formError);
    }
  };

  const title = planType === 'training' ? 'Assign training plan' : 'Assign nutrition plan';

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
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body className="p-4">
              <div className="flex flex-col gap-4">
                <Card className="border border-separator bg-surface-secondary p-3">
                  <p className="text-sm text-foreground">Assigning to {clientName}</p>
                  <p className="text-xs text-muted">Templates create a personal copy on assign</p>
                </Card>

                {selectedTemplate ? (
                  <Card className="border border-accent bg-accent/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{selectedTemplate.name}</p>
                        <p className="text-xs text-muted">{selectedTemplate.description || 'No description'}</p>
                      </div>
                      <Button
                        aria-label="Remove selection"
                        className="min-h-8 min-w-8"
                        onPress={() => setSelectedId(null)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    <TextField>
                      <Label className="text-sm font-medium text-foreground">Search templates</Label>
                      <Input
                        className="min-h-11"
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name..."
                        value={query}
                        variant="secondary"
                      />
                    </TextField>

                    <div className="max-h-60 overflow-y-auto rounded-lg border border-separator bg-surface">
                      {isLoading ? (
                        <div className="p-6 text-center text-sm text-muted">Loading templates...</div>
                      ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 p-6 text-center">
                          <Search className="h-8 w-8 text-muted" />
                          <p className="font-medium text-foreground">
                            {query.trim() ? 'No templates found' : 'No templates available'}
                          </p>
                          <p className="text-sm text-muted">
                            {query.trim() ? 'Try a different search term' : 'Create a template first'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {templates.map((template) => (
                            <button
                              className="flex flex-col gap-0.5 border-b border-separator p-3 text-left transition-colors last:border-b-0 hover:bg-surface-secondary"
                              key={template.id}
                              onClick={() => {
                                setSelectedId(template.id);
                                setFormError(null);
                              }}
                              type="button"
                            >
                              <p className="truncate font-medium text-foreground">{template.name}</p>
                              {template.description ? (
                                <p className="truncate text-xs text-muted">{template.description}</p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {planType === 'training' && selectedTemplate ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField>
                      <Label className="text-sm font-medium text-foreground">Start date</Label>
                      <Input
                        className="min-h-11"
                        onChange={(e) => setStartDate(e.target.value)}
                        type="date"
                        value={startDate}
                        variant="secondary"
                      />
                    </TextField>
                    <TextField>
                      <Label className="text-sm font-medium text-foreground">End date</Label>
                      <Input
                        className="min-h-11"
                        onChange={(e) => setEndDate(e.target.value)}
                        type="date"
                        value={endDate}
                        variant="secondary"
                      />
                    </TextField>
                  </div>
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
                isDisabled={isAssigning || !selectedId}
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
