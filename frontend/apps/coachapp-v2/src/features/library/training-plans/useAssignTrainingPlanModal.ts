import {toast} from '@heroui/react';
import {parseDate} from '@internationalized/date';
import {useState} from 'react';

import type {TrainingPlan} from '@/entities/trainingPlans/api/trainingPlans';
import type {PickedClient} from '@/features/library/shared/ClientPicker';

import {useAssignTrainingPlanMutation} from '@/entities/trainingPlans/api/trainingPlans';
import {handleFormError} from '@/shared/api/shared';

const computeEndDate = (start: string, weeks: number): string => parseDate(start).add({weeks}).toString();

export const DURATION_OPTIONS = [
  {label: '4 weeks', value: 4},
  {label: '8 weeks', value: 8},
  {label: '12 weeks', value: 12},
  {label: 'Custom', value: 0},
];

type UseAssignTrainingPlanModalParams = {
  onAssigned: (assignedPlanId: string) => void;
  onOpenChange: (open: boolean) => void;
  plan: null | TrainingPlan;
};

export default function useAssignTrainingPlanModal({onAssigned, onOpenChange, plan}: UseAssignTrainingPlanModalParams) {
  const [selectedClient, setSelectedClient] = useState<null | PickedClient>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState<null | number>(null);
  const [formError, setFormError] = useState<null | string>(null);

  const [assignTrainingPlan, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();

  const resetState = () => {
    setSelectedClient(null);
    setStartDate('');
    setEndDate('');
    setDuration(null);
    setFormError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleStartDateChange = (dateStr: string) => {
    setStartDate(dateStr);
    if (duration && dateStr) {
      setEndDate(computeEndDate(dateStr, duration));
    }
  };

  const handleDurationChange = (weeks: number) => {
    if (duration === weeks) {
      setDuration(null);
      setEndDate('');
      return;
    }
    setDuration(weeks);
    if (weeks === 0) {
      setEndDate('');
    } else if (startDate) {
      setEndDate(computeEndDate(startDate, weeks));
    }
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

  return {
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
  };
}
