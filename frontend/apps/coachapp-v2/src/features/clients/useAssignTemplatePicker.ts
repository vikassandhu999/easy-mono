import {toast} from '@heroui/react';
import {useMemo, useState} from 'react';

import {useAssignNutritionPlanMutation, useListNutritionPlansQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {useAssignTrainingPlanMutation, useListTrainingPlansQuery} from '@/entities/trainingPlans/api/trainingPlans';
import {handleFormError} from '@/shared/api/shared';

type UseAssignTemplatePickerParams = {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planType: 'nutrition' | 'training';
};

export default function useAssignTemplatePicker({
  clientId,
  clientName,
  isOpen,
  onOpenChange,
  planType,
}: UseAssignTemplatePickerParams) {
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

  return {
    endDate,
    formError,
    handleAssign,
    handleClose,
    isAssigning,
    isLoading,
    query,
    resetState,
    selectedTemplate,
    setEndDate,
    setFormError,
    setQuery,
    setSelectedId,
    setStartDate,
    startDate,
    templates,
  };
}
